import type { TranscriptSegment, VideoTranscript } from '../types/youtube.js';

const ANDROID_USER_AGENT = 'com.google.android.youtube/19.02.39 (Linux; U; Android 11) gzip';

// Security: Request timeout to prevent hanging
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface VideoInfo {
  title: string;
  description: string;
  author: string;
  lengthSeconds: number;
  keywords: string[];
}

interface StoryboardSpec {
  baseUrl: string;
  width: number;
  height: number;
  count: number;
  columns: number;
  rows: number;
  interval: number; // ms between frames
}

interface InnertubeResponse {
  videoDetails?: {
    videoId: string;
    title: string;
    lengthSeconds: string;
    keywords?: string[];
    channelId: string;
    shortDescription: string;
    author: string;
    thumbnail?: {
      thumbnails?: Array<{ url: string; width: number; height: number }>;
    };
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        baseUrl: string;
        languageCode: string;
        name?: { simpleText?: string };
        kind?: string;
      }>;
    };
  };
  storyboards?: {
    playerStoryboardSpecRenderer?: {
      spec?: string;
    };
  };
  playabilityStatus?: {
    status: string;
    reason?: string;
  };
}

export class TranscriptService {
  /**
   * List available caption languages for a video
   */
  async listCaptionLanguages(videoId: string): Promise<Array<{ code: string; name: string; isAuto: boolean }>> {
    const data = await this.fetchInnertubePlayer(videoId);

    if (data.playabilityStatus?.status !== 'OK') {
      throw new Error(
        `Video not available: ${data.playabilityStatus?.reason || data.playabilityStatus?.status || 'Unknown error'}`
      );
    }

    const captions = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      return [];
    }

    return captions.map((track) => ({
      code: track.languageCode,
      name: track.name?.simpleText || track.languageCode,
      isAuto: track.kind === 'asr',
    }));
  }

  /**
   * Get video info using Android client (more reliable)
   */
  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    const data = await this.fetchInnertubePlayer(videoId);

    if (!data.videoDetails) {
      throw new Error('Could not fetch video details');
    }

    const details = data.videoDetails;

    return {
      title: details.title || 'Unknown',
      description: details.shortDescription || '',
      author: details.author || 'Unknown',
      lengthSeconds: parseInt(details.lengthSeconds || '0', 10),
      keywords: details.keywords || [],
    };
  }

  /**
   * Extract transcript from a YouTube video using Android client
   */
  async getTranscript(videoId: string, lang?: string): Promise<VideoTranscript> {
    const data = await this.fetchInnertubePlayer(videoId);

    // Check playability
    if (data.playabilityStatus?.status !== 'OK') {
      throw new Error(
        `Video not available: ${data.playabilityStatus?.reason || data.playabilityStatus?.status || 'Unknown error'}`
      );
    }

    const captions = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      const info = data.videoDetails;
      throw new Error(
        `No captions available for this video.\n\n` +
        `Video: ${info?.title || videoId}\n` +
        `Description: ${(info?.shortDescription || '').substring(0, 300)}...`
      );
    }

    // Find requested language or fall back
    const targetLang = lang || 'en';
    let track = captions.find(t => t.languageCode === targetLang);

    if (!track) {
      track = captions.find(t => t.languageCode.startsWith('en')) || captions[0];
    }

    const segments = await this.fetchTranscriptXml(track.baseUrl);

    if (segments.length === 0) {
      throw new Error('Could not fetch transcript content. The video may have region restrictions.');
    }

    const fullText = segments.map(s => s.text).join(' ');

    return {
      videoId,
      language: track.languageCode,
      segments,
      fullText,
    };
  }

  /**
   * Fetch player data using YouTube's innertube API with Android client
   * This bypasses restrictions on the web client
   */
  private async fetchInnertubePlayer(videoId: string): Promise<InnertubeResponse> {
    const response = await fetchWithTimeout(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': ANDROID_USER_AGENT,
          'X-YouTube-Client-Name': '3',
          'X-YouTube-Client-Version': '19.02.39',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '19.02.39',
              hl: 'en',
              gl: 'US',
            }
          },
          contentCheckOk: true,
          racyCheckOk: true,
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch video data: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch and parse transcript XML
   */
  private async fetchTranscriptXml(url: string): Promise<TranscriptSegment[]> {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': ANDROID_USER_AGENT,
      }
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();

    if (!xml || xml.length === 0) {
      return [];
    }

    return this.parseTranscriptXml(xml);
  }

  /**
   * Parse transcript XML into segments
   * Handles both timedtext format 3 (<p> tags) and legacy format (<text> tags)
   */
  private parseTranscriptXml(xml: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];

    // Try format 3 first (<p> tags with t/d attributes, time in ms)
    const format3Regex = /<p t="(\d+)" d="(\d+)"[^>]*>([^<]*)<\/p>/g;
    let match;

    while ((match = format3Regex.exec(xml)) !== null) {
      const start = parseInt(match[1], 10) / 1000; // Convert ms to seconds
      const duration = parseInt(match[2], 10) / 1000;
      const text = this.decodeHtml(match[3]).trim();

      if (text) {
        segments.push({ start, duration, text });
      }
    }

    // If no format 3 matches, try legacy format (<text> tags)
    if (segments.length === 0) {
      const legacyRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;

      while ((match = legacyRegex.exec(xml)) !== null) {
        const start = parseFloat(match[1]);
        const duration = parseFloat(match[2]);
        const text = this.decodeHtml(match[3]).trim();

        if (text) {
          segments.push({ start, duration, text });
        }
      }
    }

    return segments;
  }

  /**
   * Decode HTML entities in transcript text
   */
  private decodeHtml(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/\n/g, ' ');
  }

  /**
   * Get transcript with timestamps formatted as [MM:SS] or [HH:MM:SS]
   */
  async getTimestampedTranscript(videoId: string, lang?: string): Promise<string> {
    const transcript = await this.getTranscript(videoId, lang);

    return transcript.segments
      .map((segment) => `[${this.formatTimestamp(segment.start)}] ${segment.text}`)
      .join('\n');
  }

  /**
   * Search for text within a video's transcript
   */
  async searchTranscript(
    videoId: string,
    query: string,
    lang?: string
  ): Promise<{ timestamp: number; text: string; context: string }[]> {
    const transcript = await this.getTranscript(videoId, lang);
    const queryLower = query.toLowerCase();
    const results: { timestamp: number; text: string; context: string }[] = [];

    for (let i = 0; i < transcript.segments.length; i++) {
      const segment = transcript.segments[i];
      if (segment.text.toLowerCase().includes(queryLower)) {
        const prevText = i > 0 ? transcript.segments[i - 1].text : '';
        const nextText = i < transcript.segments.length - 1 ? transcript.segments[i + 1].text : '';
        const context = [prevText, segment.text, nextText].filter(Boolean).join(' ');

        results.push({ timestamp: segment.start, text: segment.text, context });
      }
    }

    return results;
  }

  /**
   * Get transcript text at a specific timestamp with surrounding context
   * Returns the text being spoken at that moment + context before/after
   */
  async getTranscriptAtTimestamp(
    videoId: string,
    timestampSeconds: number,
    contextSeconds: number = 10
  ): Promise<{
    currentText: string;
    contextBefore: string;
    contextAfter: string;
    exactSegment: TranscriptSegment | null;
    nearbySegments: TranscriptSegment[];
  }> {
    const transcript = await this.getTranscript(videoId);
    const segments = transcript.segments;

    // Find the segment containing this timestamp
    let exactSegment: TranscriptSegment | null = null;
    let exactIndex = -1;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (timestampSeconds >= seg.start && timestampSeconds < seg.start + seg.duration) {
        exactSegment = seg;
        exactIndex = i;
        break;
      }
    }

    // If no exact match, find nearest
    if (!exactSegment && segments.length > 0) {
      let minDist = Infinity;
      for (let i = 0; i < segments.length; i++) {
        const dist = Math.abs(segments[i].start - timestampSeconds);
        if (dist < minDist) {
          minDist = dist;
          exactSegment = segments[i];
          exactIndex = i;
        }
      }
    }

    // Get context segments
    const nearbySegments: TranscriptSegment[] = [];
    const contextStart = timestampSeconds - contextSeconds;
    const contextEnd = timestampSeconds + contextSeconds;

    for (const seg of segments) {
      if (seg.start >= contextStart && seg.start <= contextEnd) {
        nearbySegments.push(seg);
      }
    }

    // Build context strings
    const beforeSegments = segments.filter(
      (s) => s.start < timestampSeconds && s.start >= contextStart
    );
    const afterSegments = segments.filter(
      (s) => s.start > timestampSeconds && s.start <= contextEnd
    );

    return {
      currentText: exactSegment?.text || '',
      contextBefore: beforeSegments.map((s) => s.text).join(' '),
      contextAfter: afterSegments.map((s) => s.text).join(' '),
      exactSegment,
      nearbySegments,
    };
  }

  /**
   * Get storyboard frame with precise position info
   * Returns sprite sheet URL and exact frame position within it
   */
  async getStoryboardFrame(
    videoId: string,
    timestampSeconds: number
  ): Promise<{
    spriteUrl: string;
    frameIndex: number;
    row: number;
    col: number;
    columns: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
    isApproximate: boolean;
  } | null> {
    const data = await this.fetchInnertubePlayer(videoId);

    if (!data.videoDetails) {
      return null;
    }

    const storyboardSpec = data.storyboards?.playerStoryboardSpecRenderer?.spec;
    if (!storyboardSpec) {
      return null;
    }

    try {
      // Parse storyboard spec - format varies but typically:
      // baseUrl|width|height|count|columns|rows|interval|...#level2|...
      const levels = storyboardSpec.split('#');

      // Use the highest quality level (last one with good resolution)
      // Try to find a level with reasonable resolution
      let bestLevel = levels[0];
      for (const level of levels) {
        const parts = level.split('|');
        if (parts.length >= 7) {
          const width = parseInt(parts[1], 10);
          if (width >= 80) { // Reasonable quality
            bestLevel = level;
          }
        }
      }

      const parts = bestLevel.split('|');
      if (parts.length < 7) return null;

      const baseUrl = parts[0];
      const frameWidth = parseInt(parts[1], 10) || 120;
      const frameHeight = parseInt(parts[2], 10) || 68;
      const frameCount = parseInt(parts[3], 10) || 100;
      const columns = parseInt(parts[4], 10) || 10;
      const rows = parseInt(parts[5], 10) || 10;
      const intervalMs = parseInt(parts[6], 10) || 2000;

      if (intervalMs <= 0) return null;

      // Calculate which frame
      const frameIndex = Math.floor((timestampSeconds * 1000) / intervalMs);
      const framesPerSheet = columns * rows;
      const sheetIndex = Math.floor(frameIndex / framesPerSheet);
      const frameInSheet = frameIndex % framesPerSheet;
      const row = Math.floor(frameInSheet / columns);
      const col = frameInSheet % columns;

      // Build sprite URL
      let spriteUrl = baseUrl.replace('$M', sheetIndex.toString());
      // Some URLs need $N replaced too
      spriteUrl = spriteUrl.replace('$N', 'default');

      return {
        spriteUrl,
        frameIndex,
        row,
        col,
        columns,
        rows,
        frameWidth,
        frameHeight,
        isApproximate: false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get complete moment analysis - transcript + visual frame
   * This is the power tool for "what happens at X:XX?"
   */
  async getVideoMoment(
    videoId: string,
    timestampSeconds: number
  ): Promise<{
    videoTitle: string;
    timestamp: number;
    formattedTime: string;
    transcript: {
      currentText: string;
      contextBefore: string;
      contextAfter: string;
    };
    visual: {
      spriteUrl: string | null;
      thumbnailUrl: string;
      framePosition: { row: number; col: number; columns: number; rows: number } | null;
    };
    hasTranscript: boolean;
    hasStoryboard: boolean;
  }> {
    const data = await this.fetchInnertubePlayer(videoId);

    if (!data.videoDetails) {
      throw new Error('Could not fetch video details');
    }

    const duration = parseInt(data.videoDetails.lengthSeconds || '0', 10);
    if (timestampSeconds > duration) {
      throw new Error(`Timestamp ${timestampSeconds}s exceeds video duration of ${duration}s`);
    }

    // Get transcript at timestamp
    let transcriptData = { currentText: '', contextBefore: '', contextAfter: '' };
    let hasTranscript = false;
    try {
      const result = await this.getTranscriptAtTimestamp(videoId, timestampSeconds, 15);
      transcriptData = {
        currentText: result.currentText,
        contextBefore: result.contextBefore,
        contextAfter: result.contextAfter,
      };
      hasTranscript = result.currentText.length > 0;
    } catch {
      // No transcript available
    }

    // Get storyboard frame
    const storyboard = await this.getStoryboardFrame(videoId, timestampSeconds);
    const hasStoryboard = storyboard !== null;

    // Fallback thumbnail
    const thumbnails = data.videoDetails.thumbnail?.thumbnails || [];
    const bestThumb = thumbnails[thumbnails.length - 1]?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      videoTitle: data.videoDetails.title,
      timestamp: timestampSeconds,
      formattedTime: this.formatTimestamp(timestampSeconds),
      transcript: transcriptData,
      visual: {
        spriteUrl: storyboard?.spriteUrl || null,
        thumbnailUrl: bestThumb,
        framePosition: storyboard ? {
          row: storyboard.row,
          col: storyboard.col,
          columns: storyboard.columns,
          rows: storyboard.rows,
        } : null,
      },
      hasTranscript,
      hasStoryboard,
    };
  }

  /**
   * Format seconds into timestamp string
   */
  private formatTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get video frame/thumbnail at a specific timestamp
   * Returns image URL that Claude can analyze with vision
   */
  async getFrameAtTimestamp(
    videoId: string,
    timestampSeconds: number
  ): Promise<{ imageUrl: string; timestamp: number; videoTitle: string }> {
    const data = await this.fetchInnertubePlayer(videoId);

    if (!data.videoDetails) {
      throw new Error('Could not fetch video details');
    }

    const duration = parseInt(data.videoDetails.lengthSeconds || '0', 10);
    if (timestampSeconds > duration) {
      throw new Error(`Timestamp ${timestampSeconds}s exceeds video duration of ${duration}s`);
    }

    // Try to get storyboard frame
    const storyboardSpec = data.storyboards?.playerStoryboardSpecRenderer?.spec;
    if (storyboardSpec) {
      const frameUrl = this.getStoryboardFrameUrl(storyboardSpec, timestampSeconds);
      if (frameUrl) {
        return {
          imageUrl: frameUrl,
          timestamp: timestampSeconds,
          videoTitle: data.videoDetails.title,
        };
      }
    }

    // Fallback: Use YouTube's thumbnail (less precise but always available)
    // This gives the video thumbnail, not a specific frame
    const thumbnails = data.videoDetails.thumbnail?.thumbnails || [];
    const bestThumb = thumbnails[thumbnails.length - 1] || { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };

    return {
      imageUrl: bestThumb.url,
      timestamp: 0, // Thumbnail is not timestamp-specific
      videoTitle: data.videoDetails.title,
    };
  }

  /**
   * Get multiple frames from a video at regular intervals
   * Great for understanding video content without transcript
   */
  async getVideoFrames(
    videoId: string,
    count: number = 5
  ): Promise<Array<{ imageUrl: string; timestamp: number }>> {
    const data = await this.fetchInnertubePlayer(videoId);

    if (!data.videoDetails) {
      throw new Error('Could not fetch video details');
    }

    const duration = parseInt(data.videoDetails.lengthSeconds || '0', 10);
    const interval = Math.floor(duration / (count + 1));
    const frames: Array<{ imageUrl: string; timestamp: number }> = [];

    const storyboardSpec = data.storyboards?.playerStoryboardSpecRenderer?.spec;

    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i;

      if (storyboardSpec) {
        const frameUrl = this.getStoryboardFrameUrl(storyboardSpec, timestamp);
        if (frameUrl) {
          frames.push({ imageUrl: frameUrl, timestamp });
          continue;
        }
      }

      // Fallback to storyboard image URL pattern
      frames.push({
        imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        timestamp,
      });
    }

    return frames;
  }

  /**
   * Parse YouTube storyboard spec and get frame URL for timestamp
   * Storyboard spec format: baseUrl|width|height|count|columns|rows|interval|...
   */
  private getStoryboardFrameUrl(spec: string, timestampSeconds: number): string | null {
    try {
      // YouTube storyboard spec is pipe-delimited with multiple levels
      const parts = spec.split('|');
      if (parts.length < 7) return null;

      // Use the highest quality storyboard (usually the last one with good resolution)
      // Format: baseUrl|width|height|count|columns|rows|interval|sigh|...
      const baseUrl = parts[0];

      // Find the best storyboard level (they're separated by #)
      const levels = spec.split('#');
      if (levels.length === 0) return null;

      // Parse the last (highest quality) level
      const lastLevel = levels[levels.length - 1];
      const levelParts = lastLevel.split('|');

      if (levelParts.length < 7) {
        // Try simpler parsing
        const width = parseInt(parts[1], 10);
        const height = parseInt(parts[2], 10);
        const count = parseInt(parts[3], 10);
        const columns = parseInt(parts[4], 10);
        const rows = parseInt(parts[5], 10);
        const intervalMs = parseInt(parts[6], 10);

        if (!intervalMs || intervalMs <= 0) return null;

        const frameIndex = Math.floor((timestampSeconds * 1000) / intervalMs);
        const sheetIndex = Math.floor(frameIndex / (columns * rows));

        // Replace $M in URL with sheet index
        let url = baseUrl.replace('$M', sheetIndex.toString());

        return url;
      }

      return null;
    } catch {
      return null;
    }
  }
}
