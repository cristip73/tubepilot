import { z } from 'zod';

// Common validation schemas
export const videoIdSchema = z.string().min(1).describe('YouTube video ID or URL');
export const channelIdSchema = z.string().min(1).describe('YouTube channel ID, handle, or URL');
export const playlistIdSchema = z.string().min(1).describe('YouTube playlist ID or URL');

export const searchOptionsSchema = z.object({
  query: z.string().min(1).describe('Search query'),
  maxResults: z.number().min(1).max(50).default(10).describe('Maximum results to return (1-50)'),
  order: z
    .enum(['date', 'rating', 'relevance', 'title', 'viewCount'])
    .default('relevance')
    .describe('Sort order'),
  type: z
    .enum(['video', 'channel', 'playlist'])
    .default('video')
    .describe('Type of content to search'),
  duration: z
    .enum(['any', 'short', 'medium', 'long'])
    .optional()
    .describe('Video duration filter (short: <4min, medium: 4-20min, long: >20min)'),
  publishedAfter: z.string().optional().describe('Only include videos published after this date (ISO 8601)'),
  regionCode: z.string().length(2).default('US').describe('Region code (ISO 3166-1 alpha-2)'),
});

export const transcriptOptionsSchema = z.object({
  videoId: videoIdSchema,
  language: z.string().default('en').describe('Language code for transcript'),
  withTimestamps: z.boolean().default(false).describe('Include timestamps in output'),
});

export const commentsOptionsSchema = z.object({
  videoId: videoIdSchema,
  maxResults: z.number().min(1).max(100).default(20).describe('Maximum comments to fetch'),
  order: z.enum(['time', 'relevance']).default('relevance').describe('Comment sort order'),
});

export const trendingOptionsSchema = z.object({
  regionCode: z.string().length(2).default('US').describe('Region code'),
  categoryId: z.string().optional().describe('Video category ID'),
  maxResults: z.number().min(1).max(50).default(20).describe('Maximum results'),
});

// Validate and extract video ID
export function validateVideoId(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) {
    throw new Error('Video ID is required');
  }
  return cleaned;
}

// Validate and extract channel ID
export function validateChannelId(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) {
    throw new Error('Channel ID is required');
  }
  return cleaned;
}
