import { YoutubeTranscript } from 'youtube-transcript';
import type { TranscriptSegment, VideoTranscript } from '../types/youtube.js';

export class TranscriptService {
  /**
   * Extract transcript from a YouTube video
   * This is the KEY feature - gives Claude the ability to "understand" video content
   */
  async getTranscript(videoId: string, lang?: string): Promise<VideoTranscript> {
    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: lang || 'en',
      });

      const segments: TranscriptSegment[] = transcriptItems.map((item) => ({
        text: item.text,
        start: item.offset / 1000, // Convert to seconds
        duration: item.duration / 1000,
      }));

      const fullText = segments.map((s) => s.text).join(' ');

      return {
        videoId,
        language: lang || 'en',
        segments,
        fullText,
      };
    } catch (error) {
      throw new Error(
        `Failed to get transcript for video ${videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get transcript with timestamps formatted for easy reading
   */
  async getTimestampedTranscript(videoId: string, lang?: string): Promise<string> {
    const transcript = await this.getTranscript(videoId, lang);

    return transcript.segments
      .map((segment) => {
        const timestamp = this.formatTimestamp(segment.start);
        return `[${timestamp}] ${segment.text}`;
      })
      .join('\n');
  }

  /**
   * Search within a video's transcript
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
        // Get surrounding context (previous and next segments)
        const prevText = i > 0 ? transcript.segments[i - 1].text : '';
        const nextText = i < transcript.segments.length - 1 ? transcript.segments[i + 1].text : '';
        const context = [prevText, segment.text, nextText].filter(Boolean).join(' ');

        results.push({
          timestamp: segment.start,
          text: segment.text,
          context,
        });
      }
    }

    return results;
  }

  /**
   * Get transcript segments within a time range
   */
  async getTranscriptRange(
    videoId: string,
    startTime: number,
    endTime: number,
    lang?: string
  ): Promise<TranscriptSegment[]> {
    const transcript = await this.getTranscript(videoId, lang);

    return transcript.segments.filter(
      (segment) => segment.start >= startTime && segment.start <= endTime
    );
  }

  /**
   * Get key moments / chapters from transcript (based on pauses or topic shifts)
   */
  async extractKeyMoments(
    videoId: string,
    lang?: string
  ): Promise<{ timestamp: number; summary: string }[]> {
    const transcript = await this.getTranscript(videoId, lang);
    const keyMoments: { timestamp: number; summary: string }[] = [];

    // Group segments into chunks of ~30 seconds for summarization
    const chunkDuration = 30;
    let currentChunk: TranscriptSegment[] = [];
    let chunkStartTime = 0;

    for (const segment of transcript.segments) {
      if (currentChunk.length === 0) {
        chunkStartTime = segment.start;
      }

      currentChunk.push(segment);

      const chunkEnd = segment.start + segment.duration;
      if (chunkEnd - chunkStartTime >= chunkDuration) {
        const chunkText = currentChunk.map((s) => s.text).join(' ');
        // Take first sentence or first 100 chars as summary
        const summary = chunkText.length > 100
          ? chunkText.substring(0, 100) + '...'
          : chunkText;

        keyMoments.push({
          timestamp: chunkStartTime,
          summary,
        });

        currentChunk = [];
      }
    }

    // Handle remaining chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.map((s) => s.text).join(' ');
      const summary = chunkText.length > 100
        ? chunkText.substring(0, 100) + '...'
        : chunkText;

      keyMoments.push({
        timestamp: chunkStartTime,
        summary,
      });
    }

    return keyMoments;
  }

  /**
   * Format seconds to HH:MM:SS or MM:SS
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
}
