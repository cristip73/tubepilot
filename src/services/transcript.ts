import type { TranscriptSegment, VideoTranscript } from '../types/youtube.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: string;
}

interface VideoInfo {
  title: string;
  description: string;
  author: string;
  lengthSeconds: number;
  keywords: string[];
}

export class TranscriptService {
  /**
   * Get video info (always works, even when transcripts don't)
   */
  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    const html = await this.fetchVideoPage(videoId);
    const playerData = this.extractPlayerData(html);

    const details = playerData?.videoDetails || {};

    return {
      title: details.title || 'Unknown',
      description: details.shortDescription || '',
      author: details.author || 'Unknown',
      lengthSeconds: parseInt(details.lengthSeconds || '0', 10),
      keywords: details.keywords || [],
    };
  }

  /**
   * Extract transcript from a YouTube video
   */
  async getTranscript(videoId: string, lang?: string): Promise<VideoTranscript> {
    const html = await this.fetchVideoPage(videoId);
    const playerData = this.extractPlayerData(html);

    const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      // Return video description as fallback context
      const info = playerData?.videoDetails;
      throw new Error(
        `No captions available for this video.\n\n` +
        `Video: ${info?.title || videoId}\n` +
        `Description: ${(info?.shortDescription || '').substring(0, 300)}...`
      );
    }

    // Find requested language or fall back
    const targetLang = lang || 'en';
    let track = captions.find((t: any) => t.languageCode === targetLang);

    if (!track) {
      track = captions.find((t: any) => t.languageCode.startsWith('en')) || captions[0];
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

  private async fetchVideoPage(videoId: string): Promise<string> {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }

    return response.text();
  }

  private extractPlayerData(html: string): any {
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!match) {
      throw new Error('Could not find video data');
    }

    try {
      return JSON.parse(match[1]);
    } catch {
      throw new Error('Could not parse video data');
    }
  }

  private async fetchTranscriptXml(url: string): Promise<TranscriptSegment[]> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();

    if (!xml || xml.length === 0) {
      return [];
    }

    const segments: TranscriptSegment[] = [];
    const textRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;

    let match;
    while ((match = textRegex.exec(xml)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const text = this.decodeHtml(match[3]).trim();

      if (text) {
        segments.push({ start, duration, text });
      }
    }

    return segments;
  }

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

  async getTimestampedTranscript(videoId: string, lang?: string): Promise<string> {
    const transcript = await this.getTranscript(videoId, lang);

    return transcript.segments
      .map((segment) => `[${this.formatTimestamp(segment.start)}] ${segment.text}`)
      .join('\n');
  }

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

  private formatTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
