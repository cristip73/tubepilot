/**
 * Integration tests - simulates real user scenarios
 * Tests the actual tool handlers with mocked services
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleToolCall, ToolContext } from '../src/tools/handlers';
import { CacheService } from '../src/services/cache';

// Mock transcript service
const mockTranscriptService = {
  getTranscript: vi.fn(),
  getTimestampedTranscript: vi.fn(),
  searchTranscript: vi.fn(),
  getVideoInfo: vi.fn(),
};

// Mock YouTube API service
const mockYoutubeApi = {
  searchVideos: vi.fn(),
  getVideoDetails: vi.fn(),
  getMultipleVideoDetails: vi.fn(),
  getChannelDetails: vi.fn(),
  getChannelByUsername: vi.fn(),
  getChannelVideos: vi.fn(),
  getPlaylistDetails: vi.fn(),
  getPlaylistItems: vi.fn(),
  getVideoComments: vi.fn(),
  getTrendingVideos: vi.fn(),
  getRelatedVideos: vi.fn(),
  getVideoCategories: vi.fn(),
};

describe('Integration Tests - Real User Scenarios', () => {
  let ctx: ToolContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = {
      youtubeApi: mockYoutubeApi as any,
      transcriptService: mockTranscriptService as any,
      cache: new CacheService(300),
    };
  });

  describe('Scenario: User wants basic video info (no API key)', () => {
    it('returns video metadata without needing API key', async () => {
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Planet Earth Documentary',
        description: 'A stunning documentary about our planet...',
        author: 'BBC Earth',
        lengthSeconds: 5400, // 1:30:00
        keywords: ['documentary', 'nature', 'earth', 'wildlife'],
      });

      const result = await handleToolCall('get_video_info', { videoId: 'dQw4w9WgXcQ' }, ctx);

      expect(result.content[0].text).toContain('Planet Earth Documentary');
      expect(result.content[0].text).toContain('BBC Earth');
      expect(result.content[0].text).toContain('1:30:00'); // formatted duration
      expect(result.content[0].text).toContain('documentary'); // keyword
    });

    it('works even without API key configured', async () => {
      const noApiCtx: ToolContext = {
        youtubeApi: null, // No API key!
        transcriptService: mockTranscriptService as any,
        cache: new CacheService(300),
      };

      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Music Video',
        description: 'Official music video',
        author: 'Artist Name',
        lengthSeconds: 240,
        keywords: ['music', 'official'],
      });

      const result = await handleToolCall('get_video_info', { videoId: 'dQw4w9WgXcQ' }, noApiCtx);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Music Video');
    });
  });

  describe('Scenario: User wants to summarize a video', () => {
    it('handles standard YouTube URL', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'This is a test transcript about cooking pasta.',
      });

      const result = await handleToolCall(
        'get_transcript',
        { videoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        ctx
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('cooking pasta');
    });

    it('handles short youtu.be URL', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'Short URL transcript content.',
      });

      const result = await handleToolCall(
        'get_transcript',
        { videoId: 'https://youtu.be/dQw4w9WgXcQ' },
        ctx
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Short URL');
    });

    it('handles bare video ID', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'Bare ID transcript.',
      });

      const result = await handleToolCall('get_transcript', { videoId: 'dQw4w9WgXcQ' }, ctx);

      expect(result.isError).toBeUndefined();
    });

    it('handles URL with extra params (playlist, timestamp)', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'Transcript from complex URL.',
      });

      const result = await handleToolCall(
        'get_transcript',
        { videoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest&t=120' },
        ctx
      );

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Scenario: User searches for specific content in video', () => {
    it('finds matching segments', async () => {
      mockTranscriptService.searchTranscript.mockResolvedValue([
        { timestamp: 65, context: 'here we talk about machine learning basics' },
        { timestamp: 180, context: 'machine learning applications in healthcare' },
      ]);

      const result = await handleToolCall(
        'search_in_transcript',
        { videoId: 'dQw4w9WgXcQ', query: 'machine learning' },
        ctx
      );

      expect(result.content[0].text).toContain('Found 2 matches');
      expect(result.content[0].text).toContain('[1:05]');
      expect(result.content[0].text).toContain('[3:00]');
    });

    it('handles no matches gracefully', async () => {
      mockTranscriptService.searchTranscript.mockResolvedValue([]);

      const result = await handleToolCall(
        'search_in_transcript',
        { videoId: 'dQw4w9WgXcQ', query: 'nonexistent topic' },
        ctx
      );

      expect(result.content[0].text).toContain('No matches found');
    });
  });

  describe('Scenario: User wants video details', () => {
    it('returns formatted video info', async () => {
      mockYoutubeApi.getVideoDetails.mockResolvedValue({
        id: 'dQw4w9WgXcQ',
        title: 'Amazing Tutorial',
        channelTitle: 'TechChannel',
        duration: 'PT15M30S',
        viewCount: 1500000,
        likeCount: 50000,
        commentCount: 2000,
        publishedAt: '2024-01-15T10:00:00Z',
        description: 'Learn something amazing in this tutorial.',
        tags: ['tutorial', 'tech', 'learning'],
      });

      const result = await handleToolCall('get_video_details', { videoId: 'dQw4w9WgXcQ' }, ctx);

      expect(result.content[0].text).toContain('Amazing Tutorial');
      expect(result.content[0].text).toContain('TechChannel');
      expect(result.content[0].text).toContain('1.5M'); // formatted views
    });

    it('handles video not found', async () => {
      mockYoutubeApi.getVideoDetails.mockResolvedValue(null);

      const result = await handleToolCall('get_video_details', { videoId: 'xxxxxxxxxxx' }, ctx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Video not found');
    });
  });

  describe('Scenario: User analyzes a channel', () => {
    it('returns channel analytics with @handle', async () => {
      mockYoutubeApi.getChannelByUsername.mockResolvedValue({
        id: 'UC123',
        title: 'Tech Reviews',
        customUrl: 'techreviews',
        subscriberCount: 2500000,
        videoCount: 500,
        viewCount: 500000000,
        country: 'US',
      });

      mockYoutubeApi.getChannelVideos.mockResolvedValue([
        { id: 'aaaaaaaaaaa' },
        { id: 'bbbbbbbbbbb' },
        { id: 'ccccccccccc' },
      ]);

      mockYoutubeApi.getMultipleVideoDetails.mockResolvedValue([
        { id: 'aaaaaaaaaaa', title: 'Video 1', viewCount: 100000, likeCount: 5000, publishedAt: '2024-01-10' },
        { id: 'bbbbbbbbbbb', title: 'Video 2', viewCount: 200000, likeCount: 8000, publishedAt: '2024-01-05' },
        { id: 'ccccccccccc', title: 'Video 3', viewCount: 150000, likeCount: 6000, publishedAt: '2024-01-01' },
      ]);

      const result = await handleToolCall('analyze_channel', { channelId: '@techreviews' }, ctx);

      expect(result.content[0].text).toContain('Channel Analysis');
      expect(result.content[0].text).toContain('2.5M'); // subscribers
      expect(result.content[0].text).toContain('Average views');
      expect(result.content[0].text).toContain('Posting frequency');
    });
  });

  describe('Scenario: User compares multiple videos', () => {
    it('compares 2-10 videos successfully', async () => {
      mockYoutubeApi.getMultipleVideoDetails.mockResolvedValue([
        { id: 'aaaaaaaaaaa', title: 'Video A', viewCount: 500000, likeCount: 25000, commentCount: 1000, channelTitle: 'Channel A' },
        { id: 'bbbbbbbbbbb', title: 'Video B', viewCount: 300000, likeCount: 20000, commentCount: 800, channelTitle: 'Channel B' },
      ]);

      const result = await handleToolCall(
        'compare_videos',
        { videoIds: ['aaaaaaaaaaa', 'bbbbbbbbbbb'] },
        ctx
      );

      expect(result.content[0].text).toContain('Video Comparison');
      expect(result.content[0].text).toContain('Total views');
      expect(result.content[0].text).toContain('Engagement');
    });

    it('rejects less than 2 videos', async () => {
      const result = await handleToolCall('compare_videos', { videoIds: ['aaaaaaaaaaa'] }, ctx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('2-10 video');
    });

    it('rejects more than 10 videos', async () => {
      const result = await handleToolCall(
        'compare_videos',
        { videoIds: Array(11).fill('aaaaaaaaaaa') },
        ctx
      );

      expect(result.isError).toBe(true);
    });
  });

  describe('Scenario: User extracts video chapters', () => {
    it('parses chapters from description', async () => {
      mockYoutubeApi.getVideoDetails.mockResolvedValue({
        id: 'dQw4w9WgXcQ',
        title: 'Tutorial with Chapters',
        description: `Welcome to this tutorial!

0:00 Introduction
2:30 Getting Started
5:45 Main Content
10:00 Advanced Topics
15:30 Conclusion`,
      });

      const result = await handleToolCall('get_video_chapters', { videoId: 'dQw4w9WgXcQ' }, ctx);

      expect(result.content[0].text).toContain('5 chapters found');
      expect(result.content[0].text).toContain('Introduction');
      expect(result.content[0].text).toContain('Advanced Topics');
    });

    it('handles videos without chapters', async () => {
      mockYoutubeApi.getVideoDetails.mockResolvedValue({
        id: 'dQw4w9WgXcQ',
        title: 'Video without chapters',
        description: 'Just a regular description without timestamps.',
      });

      const result = await handleToolCall('get_video_chapters', { videoId: 'dQw4w9WgXcQ' }, ctx);

      expect(result.content[0].text).toContain('No chapters found');
    });
  });

  describe('Scenario: User exports a playlist', () => {
    it('exports playlist to JSON', async () => {
      mockYoutubeApi.getPlaylistDetails.mockResolvedValue({
        id: 'PL123',
        title: 'My Favorites',
        description: 'Best videos',
        channelTitle: 'MyChannel',
        itemCount: 3,
      });

      mockYoutubeApi.getPlaylistItems.mockResolvedValue([
        { position: 0, videoId: 'v1', title: 'Video 1', description: 'Desc 1' },
        { position: 1, videoId: 'v2', title: 'Video 2', description: 'Desc 2' },
        { position: 2, videoId: 'v3', title: 'Video 3', description: 'Desc 3' },
      ]);

      const result = await handleToolCall('export_playlist', { playlistId: 'PL123' }, ctx);

      expect(result.content[0].text).toContain('Exported: My Favorites');
      expect(result.content[0].text).toContain('```json');
      expect(result.content[0].text).toContain('"videoId": "v1"');
    });
  });

  describe('Scenario: User searches YouTube', () => {
    it('searches with various filters', async () => {
      mockYoutubeApi.searchVideos.mockResolvedValue([
        { id: 'v1', type: 'video', title: 'Result 1', channelTitle: 'Ch1', publishedAt: '2024-01-01' },
        { id: 'v2', type: 'video', title: 'Result 2', channelTitle: 'Ch2', publishedAt: '2024-01-02' },
      ]);

      const result = await handleToolCall(
        'search_videos',
        { query: 'typescript tutorial', maxResults: 10, order: 'viewCount', duration: 'medium' },
        ctx
      );

      expect(result.content[0].text).toContain('Found 2 results');
      expect(result.content[0].text).toContain('Result 1');
    });
  });

  describe('Scenario: No API key configured', () => {
    it('returns helpful instructions for API tools', async () => {
      const noApiCtx: ToolContext = {
        youtubeApi: null,
        transcriptService: mockTranscriptService as any,
        cache: new CacheService(300),
      };

      const result = await handleToolCall('search_videos', { query: 'test' }, noApiCtx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('YouTube API key');
      expect(result.content[0].text).toContain('console.cloud.google.com');
    });

    it('transcript tools still work without API key', async () => {
      const noApiCtx: ToolContext = {
        youtubeApi: null,
        transcriptService: mockTranscriptService as any,
        cache: new CacheService(300),
      };

      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'Transcript works without API key!',
      });

      const result = await handleToolCall('get_transcript', { videoId: 'dQw4w9WgXcQ' }, noApiCtx);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Transcript works');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty video ID', async () => {
      await expect(handleToolCall('get_transcript', { videoId: '' }, ctx)).rejects.toThrow();
    });

    it('handles very long input', async () => {
      const longInput = 'a'.repeat(3000);
      await expect(handleToolCall('get_transcript', { videoId: longInput }, ctx)).rejects.toThrow(
        'Input too long'
      );
    });

    it('caches repeated requests', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({ fullText: 'Cached content' });

      await handleToolCall('get_transcript', { videoId: 'cachetest11' }, ctx);
      await handleToolCall('get_transcript', { videoId: 'cachetest11' }, ctx);

      // Should only call once due to caching
      expect(mockTranscriptService.getTranscript).toHaveBeenCalledTimes(1);
    });

    it('handles videos with no captions (music/silent/no commentary)', async () => {
      mockTranscriptService.getTranscript.mockRejectedValue(
        new Error('No captions available for this video.\n\nVideo: Lo-Fi Beats\nDescription: Relaxing music...')
      );

      await expect(
        handleToolCall('get_transcript', { videoId: 'dQw4w9WgXcQ' }, ctx)
      ).rejects.toThrow('No captions available');
    });

    it('handles very long transcripts with truncation', async () => {
      // Simulate a 3-hour video transcript (would be huge)
      const longTranscript = 'word '.repeat(50000); // ~250KB of text
      mockTranscriptService.getTranscript.mockResolvedValue({ fullText: longTranscript });

      const result = await handleToolCall('get_transcript', { videoId: 'dQw4w9WgXcQ' }, ctx);

      // Should be truncated to preserve Claude's context
      expect(result.content[0].text.length).toBeLessThan(35000);
      expect(result.content[0].text).toContain('truncated');
    });
  });
});
