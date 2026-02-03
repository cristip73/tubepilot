import { z } from 'zod';

// Security constants
const MAX_URL_LENGTH = 2048;
const MAX_QUERY_LENGTH = 500;
const MAX_LANGUAGE_CODE_LENGTH = 10;

// Common validation schemas with security constraints
export const videoIdSchema = z
  .string()
  .min(1)
  .max(MAX_URL_LENGTH)
  .describe('YouTube video ID or URL');

export const channelIdSchema = z
  .string()
  .min(1)
  .max(MAX_URL_LENGTH)
  .describe('YouTube channel ID, handle, or URL');

export const playlistIdSchema = z
  .string()
  .min(1)
  .max(MAX_URL_LENGTH)
  .describe('YouTube playlist ID or URL');

export const searchOptionsSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(MAX_QUERY_LENGTH)
    .describe('Search query (max 500 chars)'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe('Maximum results to return (1-50)'),
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
  publishedAfter: z
    .string()
    .max(30)
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Must be ISO 8601 date format')
    .optional()
    .describe('Only include videos published after this date (ISO 8601)'),
  regionCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, 'Must be 2-letter country code')
    .default('US')
    .describe('Region code (ISO 3166-1 alpha-2)'),
});

export const transcriptOptionsSchema = z.object({
  videoId: videoIdSchema,
  language: z
    .string()
    .min(2)
    .max(MAX_LANGUAGE_CODE_LENGTH)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Must be valid language code (e.g., en, en-US)')
    .default('en')
    .describe('Language code for transcript'),
  withTimestamps: z
    .boolean()
    .default(false)
    .describe('Include timestamps in output'),
});

export const commentsOptionsSchema = z.object({
  videoId: videoIdSchema,
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum comments to fetch'),
  order: z
    .enum(['time', 'relevance'])
    .default('relevance')
    .describe('Comment sort order'),
});

export const trendingOptionsSchema = z.object({
  regionCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, 'Must be 2-letter country code')
    .default('US')
    .describe('Region code'),
  categoryId: z
    .string()
    .max(5)
    .regex(/^\d+$/, 'Must be numeric category ID')
    .optional()
    .describe('Video category ID'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Maximum results'),
});

/**
 * Extract video ID from various YouTube URL formats
 * Handles:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID (strips playlist)
 * - https://youtu.be/VIDEO_ID
 * - https://youtu.be/VIDEO_ID?si=SHARE_ID&t=123
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - Just the video ID itself (11 characters)
 */
export function extractVideoId(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Video ID or URL is required');
  }

  // Security: limit input length to prevent DoS
  if (input.length > MAX_URL_LENGTH) {
    throw new Error('Input too long');
  }

  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error('Video ID or URL is required');
  }

  // If it looks like just a video ID (11 chars, alphanumeric + _ -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return cleaned;
  }

  // Check if it looks like a URL
  const looksLikeUrl = cleaned.includes('://') || cleaned.startsWith('www.');

  try {
    const url = new URL(cleaned);
    const hostname = url.hostname.replace('www.', '');

    // All YouTube domains
    const youtubeHosts = [
      'youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'gaming.youtube.com',
      'youtube-nocookie.com',
    ];

    if (youtubeHosts.includes(hostname)) {
      // /watch?v=ID
      const vParam = url.searchParams.get('v');
      if (vParam) {
        return validateVideoIdFormat(vParam);
      }

      // /embed/ID, /v/ID, /shorts/ID, /live/ID, /e/ID
      const pathMatch = url.pathname.match(/^\/(embed|v|shorts|live|e)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) {
        return pathMatch[2];
      }

      // Could not extract from YouTube URL
      throw new Error(`Could not extract video ID from: ${cleaned}`);
    }

    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1).split('/')[0];
      if (videoId) {
        return validateVideoIdFormat(videoId);
      }
    }

    // Non-YouTube URL - don't try to extract
    throw new Error(`Could not extract video ID from: ${cleaned}`);

  } catch (e) {
    // If it's our error, rethrow
    if (e instanceof Error && e.message.includes('Could not extract')) {
      throw e;
    }
    // Not a valid URL - continue to fallback only if it doesn't look like a URL
  }

  // Only try fallback extraction if input doesn't look like a URL
  if (!looksLikeUrl) {
    const idMatch = cleaned.match(/[a-zA-Z0-9_-]{11}/);
    if (idMatch) {
      return idMatch[0];
    }
  }

  throw new Error(`Could not extract video ID from: ${cleaned}`);
}

/**
 * Extract playlist ID from URL or return as-is
 * Handles:
 * - https://www.youtube.com/playlist?list=PLAYLIST_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 * - Just the playlist ID itself
 */
export function extractPlaylistId(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Playlist ID or URL is required');
  }

  // Security: limit input length
  if (input.length > MAX_URL_LENGTH) {
    throw new Error('Input too long');
  }

  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error('Playlist ID or URL is required');
  }

  // If it looks like just a playlist ID (starts with PL, UU, etc.)
  if (/^(PL|UU|LL|FL|RD|OL)[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned;
  }

  try {
    const url = new URL(cleaned);
    const hostname = url.hostname.replace('www.', '');

    // Only accept YouTube URLs
    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const listParam = url.searchParams.get('list');
      if (listParam) {
        return listParam;
      }
    }

    // Non-YouTube URL
    throw new Error(`Could not extract playlist ID from: ${cleaned}`);
  } catch (e) {
    // If it's our error, rethrow
    if (e instanceof Error && e.message.includes('Could not extract')) {
      throw e;
    }
    // Not a valid URL - check if it looks like a valid playlist ID
  }

  // Special playlist types: WL (Watch Later), LL (Liked), etc.
  if (/^(WL|LL)$/.test(cleaned)) {
    return cleaned;
  }

  // Standard playlist IDs: PL, UU, FL, RD, OL followed by more chars
  if (/^(PL|UU|LL|FL|RD|OL)[a-zA-Z0-9_-]{10,}$/.test(cleaned)) {
    return cleaned;
  }

  throw new Error(`Could not extract playlist ID from: ${cleaned}`);
}

/**
 * Extract channel identifier from URL or return as-is
 * Handles:
 * - https://www.youtube.com/channel/CHANNEL_ID
 * - https://www.youtube.com/@handle
 * - https://www.youtube.com/c/CustomName
 * - https://www.youtube.com/user/Username
 * - Just the channel ID or @handle
 */
export function extractChannelId(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Channel ID or URL is required');
  }

  // Security: limit input length
  if (input.length > MAX_URL_LENGTH) {
    throw new Error('Input too long');
  }

  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error('Channel ID or URL is required');
  }

  try {
    const url = new URL(cleaned);
    const hostname = url.hostname.replace('www.', '');

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const pathParts = url.pathname.split('/').filter(Boolean);

      // /channel/UC...
      if (pathParts[0] === 'channel' && pathParts[1]) {
        return pathParts[1];
      }

      // /@handle
      if (pathParts[0]?.startsWith('@')) {
        return pathParts[0];
      }

      // /c/CustomName or /user/Username
      if ((pathParts[0] === 'c' || pathParts[0] === 'user') && pathParts[1]) {
        return pathParts[1];
      }

      // YouTube URL but couldn't extract channel
      throw new Error(`Could not extract channel ID from: ${cleaned}`);
    }

    // Non-YouTube URL
    throw new Error(`Could not extract channel ID from: ${cleaned}`);
  } catch (e) {
    // If it's our error, rethrow
    if (e instanceof Error && e.message.includes('Could not extract')) {
      throw e;
    }
    // Not a valid URL - check if it looks like a valid channel identifier
  }

  // Channel ID (UC + 22 chars)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(cleaned)) {
    return cleaned;
  }

  // Handle (@username) - must start with @ or be alphanumeric
  if (/^@?[a-zA-Z0-9_.-]{1,100}$/.test(cleaned)) {
    return cleaned.startsWith('@') ? cleaned : cleaned;
  }

  throw new Error(`Could not extract channel ID from: ${cleaned}`);
}

/**
 * Validate video ID format
 */
function validateVideoIdFormat(id: string): string {
  // Video IDs are exactly 11 characters
  const cleaned = id.trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    throw new Error(`Invalid video ID format: ${cleaned}`);
  }
  return cleaned;
}

/**
 * Clean and normalize a YouTube URL, extracting just the video
 * Removes playlist params, share tracking, etc.
 */
export function cleanVideoUrl(input: string): { videoId: string; timestamp?: number } {
  const cleaned = input.trim();
  let timestamp: number | undefined;

  try {
    const url = new URL(cleaned);

    // Extract timestamp if present
    const tParam = url.searchParams.get('t');
    if (tParam) {
      // Handle formats: "123", "123s", "1m30s", "1h2m3s"
      timestamp = parseTimestamp(tParam);
    }
  } catch {
    // Not a URL, no timestamp
  }

  const videoId = extractVideoId(cleaned);
  return { videoId, timestamp };
}

/**
 * Parse timestamp string to seconds
 * Handles: "123", "123s", "2m30s", "1h2m30s"
 */
function parseTimestamp(ts: string): number {
  // Just a number (seconds)
  if (/^\d+$/.test(ts)) {
    return parseInt(ts, 10);
  }

  // With suffix: "123s"
  if (/^\d+s$/.test(ts)) {
    return parseInt(ts, 10);
  }

  // Full format: "1h2m30s" or "2m30s"
  const match = ts.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (match) {
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

// Legacy functions for backward compatibility
export function validateVideoId(input: string): string {
  return extractVideoId(input);
}

export function validateChannelId(input: string): string {
  return extractChannelId(input);
}
