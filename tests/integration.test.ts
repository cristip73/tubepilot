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
  listCaptionLanguages: vi.fn(),
  getVideoFrames: vi.fn(),
  getFrameAtTimestamp: vi.fn(),
  getVideoMoment: vi.fn(),
  getTranscriptAtTimestamp: vi.fn(),
  getStoryboardFrame: vi.fn(),
  extractFrameImage: vi.fn(),
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
  getLiveStreamDetails: vi.fn(),
  getCommentReplies: vi.fn(),
  getMultipleChannelDetails: vi.fn(),
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
        {
          id: 'aaaaaaaaaaa',
          title: 'Video 1',
          viewCount: 100000,
          likeCount: 5000,
          publishedAt: '2024-01-10',
        },
        {
          id: 'bbbbbbbbbbb',
          title: 'Video 2',
          viewCount: 200000,
          likeCount: 8000,
          publishedAt: '2024-01-05',
        },
        {
          id: 'ccccccccccc',
          title: 'Video 3',
          viewCount: 150000,
          likeCount: 6000,
          publishedAt: '2024-01-01',
        },
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
        {
          id: 'aaaaaaaaaaa',
          title: 'Video A',
          viewCount: 500000,
          likeCount: 25000,
          commentCount: 1000,
          channelTitle: 'Channel A',
        },
        {
          id: 'bbbbbbbbbbb',
          title: 'Video B',
          viewCount: 300000,
          likeCount: 20000,
          commentCount: 800,
          channelTitle: 'Channel B',
        },
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
        {
          id: 'v1',
          type: 'video',
          title: 'Result 1',
          channelTitle: 'Ch1',
          publishedAt: '2024-01-01',
        },
        {
          id: 'v2',
          type: 'video',
          title: 'Result 2',
          channelTitle: 'Ch2',
          publishedAt: '2024-01-02',
        },
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

  describe('Scenario: User lists available caption languages', () => {
    it('returns available languages', async () => {
      mockTranscriptService.listCaptionLanguages.mockResolvedValue([
        { code: 'en', name: 'English', isAuto: false },
        { code: 'es', name: 'Spanish', isAuto: true },
        { code: 'fr', name: 'French', isAuto: false },
      ]);

      const result = await handleToolCall(
        'list_caption_languages',
        { videoId: 'dQw4w9WgXcQ' },
        ctx
      );

      expect(result.content[0].text).toContain('3 languages');
      expect(result.content[0].text).toContain('en');
      expect(result.content[0].text).toContain('auto-generated');
    });

    it('handles videos with no captions', async () => {
      mockTranscriptService.listCaptionLanguages.mockResolvedValue([]);

      const result = await handleToolCall(
        'list_caption_languages',
        { videoId: 'dQw4w9WgXcQ' },
        ctx
      );

      expect(result.content[0].text).toContain('No captions available');
    });
  });

  describe('Scenario: User creates shareable clip URL', () => {
    it('creates URL with start timestamp', async () => {
      const result = await handleToolCall(
        'create_clip_url',
        { videoId: 'dQw4w9WgXcQ', startTime: '1:30' },
        ctx
      );

      expect(result.content[0].text).toContain('youtube.com/watch?v=dQw4w9WgXcQ&t=90');
      expect(result.content[0].text).toContain('1:30');
    });

    it('creates embed URL with end time', async () => {
      const result = await handleToolCall(
        'create_clip_url',
        { videoId: 'dQw4w9WgXcQ', startTime: '0:30', endTime: '1:00' },
        ctx
      );

      expect(result.content[0].text).toContain('embed');
      expect(result.content[0].text).toContain('start=30');
      expect(result.content[0].text).toContain('end=60');
    });
  });

  describe('Scenario: User asks what happens at a specific moment', () => {
    it('returns transcript + visual frame together', async () => {
      mockTranscriptService.getVideoMoment.mockResolvedValue({
        videoTitle: 'Tutorial Video',
        timestamp: 65,
        formattedTime: '1:05',
        transcript: {
          currentText: 'Now click on the button',
          contextBefore: 'Open the settings menu.',
          contextAfter: 'Then select your preferences.',
        },
        visual: {
          spriteUrl: 'https://i.ytimg.com/sb/abc123/storyboard.jpg',
          thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
          framePosition: { row: 2, col: 3, columns: 10, rows: 10 },
        },
        hasTranscript: true,
        hasStoryboard: true,
      });

      // Mock frame extraction returning an image
      mockTranscriptService.extractFrameImage.mockResolvedValue({
        imageBase64: 'iVBORw0KGgoAAAANS',
        mimeType: 'image/png',
        timestamp: 65,
        frameWidth: 160,
        frameHeight: 90,
      });

      const result = await handleToolCall(
        'get_video_moment',
        { videoId: 'dQw4w9WgXcQ', timestamp: '1:05' },
        ctx
      );

      expect(result.content[0].text).toContain('Tutorial Video');
      expect(result.content[0].text).toContain('1:05');
      expect(result.content[0].text).toContain('Now click on the button');
      expect(result.content[0].text).toContain('Extracted frame');
      // Should have image content as second item
      expect(result.content.length).toBe(2);
      expect(result.content[1].type).toBe('image');
    });

    it('handles videos without transcript', async () => {
      mockTranscriptService.getVideoMoment.mockResolvedValue({
        videoTitle: 'Music Video',
        timestamp: 30,
        formattedTime: '0:30',
        transcript: { currentText: '', contextBefore: '', contextAfter: '' },
        visual: {
          spriteUrl: null,
          thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
          framePosition: null,
        },
        hasTranscript: false,
        hasStoryboard: false,
      });

      // Mock no frame available
      mockTranscriptService.extractFrameImage.mockResolvedValue(null);

      const result = await handleToolCall(
        'get_video_moment',
        { videoId: 'dQw4w9WgXcQ', timestamp: '0:30' },
        ctx
      );

      expect(result.content[0].text).toContain('Not available');
      expect(result.content[0].text).toContain('Thumbnail');
      // Should only have text content when no image
      expect(result.content.length).toBe(1);
    });
  });

  describe('Scenario: User finds when a topic is discussed', () => {
    it('returns timestamps where topic is mentioned', async () => {
      mockTranscriptService.searchTranscript.mockResolvedValue([
        { timestamp: 45, context: 'let me explain machine learning basics' },
        { timestamp: 120, context: 'machine learning applications in healthcare' },
        { timestamp: 300, context: 'advanced machine learning techniques' },
      ]);

      const result = await handleToolCall(
        'find_moment_by_topic',
        { videoId: 'dQw4w9WgXcQ', topic: 'machine learning' },
        ctx
      );

      expect(result.content[0].text).toContain('3 mention');
      expect(result.content[0].text).toContain('0:45');
      expect(result.content[0].text).toContain('2:00');
      expect(result.content[0].text).toContain('youtube.com/watch?v=dQw4w9WgXcQ&t=');
    });

    it('handles no matches found', async () => {
      mockTranscriptService.searchTranscript.mockResolvedValue([]);

      const result = await handleToolCall(
        'find_moment_by_topic',
        { videoId: 'dQw4w9WgXcQ', topic: 'quantum physics' },
        ctx
      );

      expect(result.content[0].text).toContain('No mentions');
    });
  });

  describe('Scenario: User checks live stream status', () => {
    it('identifies a live stream', async () => {
      mockYoutubeApi.getLiveStreamDetails.mockResolvedValue({
        isLive: true,
        isUpcoming: false,
        concurrentViewers: 15000,
        actualStartTime: '2024-01-15T10:00:00Z',
      });

      const result = await handleToolCall('check_live_status', { videoId: 'dQw4w9WgXcQ' }, ctx);

      expect(result.content[0].text).toContain('LIVE NOW');
      expect(result.content[0].text).toContain('15K');
    });

    it('identifies an upcoming stream', async () => {
      mockYoutubeApi.getLiveStreamDetails.mockResolvedValue({
        isLive: false,
        isUpcoming: true,
        scheduledStartTime: '2024-12-25T18:00:00Z',
      });

      const result = await handleToolCall('check_live_status', { videoId: 'dQw4w9WgXcQ' }, ctx);

      expect(result.content[0].text).toContain('UPCOMING');
      expect(result.content[0].text).toContain('Scheduled');
    });

    it('identifies a regular video', async () => {
      mockYoutubeApi.getLiveStreamDetails.mockResolvedValue({
        isLive: false,
        isUpcoming: false,
      });

      const result = await handleToolCall('check_live_status', { videoId: 'dQw4w9WgXcQ' }, ctx);

      expect(result.content[0].text).toContain('Regular Video');
    });
  });

  describe('Scenario: User gets YouTube Shorts', () => {
    it('returns shorts from a channel', async () => {
      mockYoutubeApi.getChannelByUsername.mockResolvedValue({ id: 'UC123', title: 'Test Channel' });
      mockYoutubeApi.searchVideos.mockResolvedValue([
        { id: 'short1', title: 'Short 1' },
        { id: 'short2', title: 'Short 2' },
      ]);
      mockYoutubeApi.getMultipleVideoDetails.mockResolvedValue([
        { id: 'short1', title: 'Short 1', duration: 'PT45S', viewCount: 100000 },
        { id: 'short2', title: 'Short 2', duration: 'PT30S', viewCount: 50000 },
      ]);

      const result = await handleToolCall('get_shorts', { channelId: '@testchannel' }, ctx);

      expect(result.content[0].text).toContain('YouTube Shorts');
      expect(result.content[0].text).toContain('Short 1');
      expect(result.content[0].text).toContain('/shorts/');
    });
  });

  describe('Scenario: User searches by hashtag', () => {
    it('finds videos with hashtag', async () => {
      mockYoutubeApi.searchVideos.mockResolvedValue([
        { id: 'v1', title: 'Trending Video 1', channelTitle: 'Creator 1' },
        { id: 'v2', title: 'Trending Video 2', channelTitle: 'Creator 2' },
      ]);

      const result = await handleToolCall('search_by_hashtag', { hashtag: '#trending' }, ctx);

      expect(result.content[0].text).toContain('#trending');
      expect(result.content[0].text).toContain('Trending Video 1');
    });

    it('handles hashtag without # prefix', async () => {
      mockYoutubeApi.searchVideos.mockResolvedValue([]);

      const result = await handleToolCall('search_by_hashtag', { hashtag: 'coding' }, ctx);

      expect(result.content[0].text).toContain('#coding');
    });
  });

  describe('Scenario: User compares multiple channels', () => {
    it('compares 2-5 channels', async () => {
      mockYoutubeApi.getChannelByUsername.mockResolvedValue({
        id: 'UC1',
        title: 'Channel A',
        subscriberCount: 1000000,
        videoCount: 500,
        viewCount: 50000000,
        customUrl: 'channelA',
      });
      mockYoutubeApi.getChannelDetails.mockResolvedValue({
        id: 'UC2',
        title: 'Channel B',
        subscriberCount: 500000,
        videoCount: 200,
        viewCount: 25000000,
        customUrl: 'channelB',
      });

      const result = await handleToolCall(
        'compare_channels',
        { channelIds: ['@channelA', 'UC2'] },
        ctx
      );

      expect(result.content[0].text).toContain('Channel Comparison');
      expect(result.content[0].text).toContain('Channel A');
      expect(result.content[0].text).toContain('Subscribers');
    });

    it('rejects less than 2 channels', async () => {
      const result = await handleToolCall('compare_channels', { channelIds: ['@onechannel'] }, ctx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('2-5');
    });
  });

  describe('Scenario: User analyzes comment sentiment', () => {
    it('analyzes positive and negative comments', async () => {
      mockYoutubeApi.getVideoComments.mockResolvedValue([
        {
          textOriginal: 'Love this video! Amazing content ❤️',
          authorDisplayName: 'Fan1',
          likeCount: 100,
        },
        { textOriginal: 'Great tutorial, very helpful!', authorDisplayName: 'Fan2', likeCount: 50 },
        {
          textOriginal: 'This is terrible, waste of time',
          authorDisplayName: 'Critic',
          likeCount: 5,
        },
        { textOriginal: 'Interesting perspective.', authorDisplayName: 'Neutral', likeCount: 10 },
      ]);

      const result = await handleToolCall(
        'analyze_comments_sentiment',
        { videoId: 'dQw4w9WgXcQ' },
        ctx
      );

      expect(result.content[0].text).toContain('Sentiment Analysis');
      expect(result.content[0].text).toContain('Positive');
      expect(result.content[0].text).toContain('Negative');
    });
  });

  describe('Scenario: User gets comment replies', () => {
    it('returns replies to a comment', async () => {
      mockYoutubeApi.getCommentReplies.mockResolvedValue([
        { authorDisplayName: 'User1', textOriginal: 'I agree!', likeCount: 10 },
        { authorDisplayName: 'User2', textOriginal: 'Same here', likeCount: 5 },
      ]);

      const result = await handleToolCall('get_comment_replies', { commentId: 'comment123' }, ctx);

      expect(result.content[0].text).toContain('Replies');
      expect(result.content[0].text).toContain('I agree');
    });
  });

  describe('Scenario: User gets video statistics', () => {
    it('returns video stats with performance metrics', async () => {
      mockYoutubeApi.getVideoDetails.mockResolvedValue({
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        viewCount: 1000000,
        likeCount: 50000,
        commentCount: 5000,
        publishedAt: '2024-01-01T00:00:00Z',
      });

      const result = await handleToolCall(
        'get_video_stats_history',
        { videoId: 'dQw4w9WgXcQ' },
        ctx
      );

      expect(result.content[0].text).toContain('Video Statistics');
      expect(result.content[0].text).toContain('Views');
      expect(result.content[0].text).toContain('Engagement rate');
    });
  });

  // === DEVELOPER TOOLS ===

  describe('Scenario: Developer extracts code from tutorial', () => {
    it('finds CLI commands and code patterns', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText:
          'Run npm install express to install the package. Then create a file called app.js',
        segments: [
          { start: 0, text: 'Run npm install express to install the package' },
          { start: 30, text: 'Then create a file called app.js' },
        ],
      });

      const result = await handleToolCall('extract_code_snippets', { videoId: 'tutorial123' }, ctx);

      expect(result.content[0].text).toContain('Code Snippets');
      expect(result.content[0].text).toContain('npm install');
    });

    it('returns helpful message when no code found', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'This is a travel vlog about my trip to Paris.',
        segments: [{ start: 0, text: 'This is a travel vlog about my trip to Paris.' }],
      });

      const result = await handleToolCall('extract_code_snippets', { videoId: 'vlog12345ab' }, ctx);

      expect(result.content[0].text).toContain('No code snippets');
    });
  });

  describe('Scenario: Developer gets tutorial steps', () => {
    it('extracts step-by-step instructions', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText:
          'First, create a new folder. Then, initialize npm. Next, install the dependencies.',
        segments: [
          { start: 0, text: 'First, create a new folder for your project.' },
          { start: 30, text: 'Then, initialize npm with npm init.' },
          { start: 60, text: 'Next, install the dependencies you need.' },
        ],
      });
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Node.js Tutorial',
        author: 'Dev Channel',
        lengthSeconds: 600,
        description: 'Learn Node.js',
        keywords: ['nodejs'],
      });

      const result = await handleToolCall('get_tutorial_steps', { videoId: 'tutorial123' }, ctx);

      expect(result.content[0].text).toContain('Tutorial Steps');
      expect(result.content[0].text).toContain('First');
    });
  });

  describe('Scenario: Developer finds tech stack', () => {
    it('detects technologies mentioned in video', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText:
          'We will be using React for the frontend and Node.js with Express for the backend. PostgreSQL will be our database.',
        segments: [
          {
            start: 0,
            text: 'We will be using React for the frontend and Node.js with Express for the backend. PostgreSQL will be our database.',
          },
        ],
      });
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Full Stack Tutorial',
        author: 'Dev Channel',
        lengthSeconds: 3600,
        description: 'Build a full stack app with React',
        keywords: ['react', 'nodejs', 'tutorial'],
      });

      const result = await handleToolCall('find_tech_stack', { videoId: 'fullstack123' }, ctx);

      expect(result.content[0].text).toContain('Tech Stack');
      expect(result.content[0].text).toContain('react');
    });
  });

  describe('Scenario: Developer converts video to notes', () => {
    it('generates markdown notes from transcript', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'Welcome to this tutorial. Today we learn about APIs.',
        segments: [
          { start: 0, text: 'Welcome to this tutorial.' },
          { start: 30, text: 'Today we learn about APIs.' },
        ],
      });
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'API Tutorial',
        author: 'Dev Channel',
        lengthSeconds: 600,
        description: 'Learn about REST APIs',
        keywords: ['api', 'rest'],
      });

      const result = await handleToolCall('convert_to_notes', { videoId: 'api12345abc' }, ctx);

      expect(result.content[0].text).toContain('# API Tutorial');
      expect(result.content[0].text).toContain('Channel:');
    });
  });

  describe('Scenario: Developer finds GitHub links', () => {
    it('extracts repository URLs from description', async () => {
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Open Source Project',
        author: 'Dev Channel',
        lengthSeconds: 600,
        description: 'Check out the code at https://github.com/user/awesome-project',
        keywords: ['opensource'],
      });
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'You can find the npm package at https://npmjs.com/package/my-lib',
        segments: [],
      });

      const result = await handleToolCall('find_github_links', { videoId: 'oss12345abc' }, ctx);

      expect(result.content[0].text).toContain('Code Resources');
      expect(result.content[0].text).toContain('github.com');
    });

    it('handles videos with no code links', async () => {
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Cooking Video',
        author: 'Food Channel',
        lengthSeconds: 600,
        description: 'How to make pasta',
        keywords: ['cooking'],
      });
      mockTranscriptService.getTranscript.mockRejectedValue(new Error('No transcript'));

      const result = await handleToolCall('find_github_links', { videoId: 'cook1234abc' }, ctx);

      expect(result.content[0].text).toContain('No GitHub');
    });
  });

  // === CONTENT ANALYSIS TOOLS ===

  describe('Scenario: User gets video summary', () => {
    it('generates bullet-point summary', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText:
          'The important thing to remember is that APIs are essential. In summary, always use proper authentication.',
        segments: [
          { start: 0, text: 'The important thing to remember is that APIs are essential.' },
          { start: 60, text: 'In summary, always use proper authentication.' },
        ],
      });
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'API Security',
        author: 'Security Channel',
        lengthSeconds: 300,
        description: 'Learn about API security',
        keywords: ['api', 'security'],
      });

      const result = await handleToolCall('get_video_summary', { videoId: 'sec12345abc' }, ctx);

      expect(result.content[0].text).toContain('API Security');
      expect(result.content[0].text).toContain('Key Points');
    });
  });

  describe('Scenario: User asks question about video', () => {
    it('finds relevant segments to answer question', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'The price of the product is 99 dollars. It comes with free shipping.',
        segments: [
          { start: 0, text: 'The price of the product is 99 dollars.' },
          { start: 30, text: 'It comes with free shipping.' },
        ],
      });
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Product Review',
        author: 'Review Channel',
        lengthSeconds: 300,
        description: 'Product review',
        keywords: ['review'],
      });

      const result = await handleToolCall(
        'answer_from_video',
        { videoId: 'review12abc', question: 'What is the price?' },
        ctx
      );

      expect(result.content[0].text).toContain('price');
      expect(result.content[0].text).toContain('Relevant Sections');
    });

    it('handles questions with no matching content', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'This is a video about cooking pasta.',
        segments: [{ start: 0, text: 'This is a video about cooking pasta.' }],
      });
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Cooking Tutorial',
        author: 'Chef',
        lengthSeconds: 300,
        description: 'Pasta recipe',
        keywords: ['cooking'],
      });

      const result = await handleToolCall(
        'answer_from_video',
        { videoId: 'cook1234abc', question: 'What programming language is used?' },
        ctx
      );

      expect(result.content[0].text).toContain("doesn't appear to be discussed");
    });
  });

  describe('Scenario: User extracts links and mentions', () => {
    it('finds URLs and product mentions', async () => {
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Tech Review',
        author: 'Tech Channel',
        lengthSeconds: 600,
        description: 'Check out https://example.com and use code SAVE10. Follow me @techreviewer',
        keywords: ['tech'],
      });
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText: 'I recommend using ProductX for this task.',
        segments: [],
      });

      const result = await handleToolCall(
        'extract_links_mentions',
        { videoId: 'tech1234abc' },
        ctx
      );

      expect(result.content[0].text).toContain('Links & Mentions');
      expect(result.content[0].text).toContain('https://example.com');
      expect(result.content[0].text).toContain('@techreviewer');
    });
  });

  describe('Scenario: User gets video outline', () => {
    it('creates structured outline with sections', async () => {
      mockTranscriptService.getTranscript.mockResolvedValue({
        fullText:
          'Introduction to the topic. Now lets talk about the main concepts. Finally, here is the conclusion.',
        segments: [
          { start: 0, text: 'Introduction to the topic.' },
          { start: 120, text: 'Now lets talk about the main concepts.' },
          { start: 240, text: 'Finally, here is the conclusion.' },
        ],
      });
      mockTranscriptService.getVideoInfo.mockResolvedValue({
        title: 'Course Lecture',
        author: 'Professor',
        lengthSeconds: 360,
        description: 'Lecture notes',
        keywords: ['education'],
      });

      const result = await handleToolCall('get_video_outline', { videoId: 'lecture12ab' }, ctx);

      expect(result.content[0].text).toContain('Video Outline');
      expect(result.content[0].text).toContain('Course Lecture');
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
        new Error(
          'No captions available for this video.\n\nVideo: Lo-Fi Beats\nDescription: Relaxing music...'
        )
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
