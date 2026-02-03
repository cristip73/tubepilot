import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Core tools - work WITHOUT API key
export const CORE_TOOLS: Tool[] = [
  {
    name: 'get_video_info',
    description:
      'Get basic information about a YouTube video: title, description, channel, duration, and keywords. Works without API key. Use this for documentaries, music videos, or any video where you need metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_transcript',
    description:
      'Extract the full transcript/captions from a YouTube video. Use this to understand video content, summarize videos, or answer questions about what was said. Note: Only works for videos with captions enabled.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Language code (e.g., en, es, fr)', default: 'en' },
        withTimestamps: {
          type: 'boolean',
          description: 'Include timestamps for each segment',
          default: false,
        },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'search_in_transcript',
    description:
      'Search for specific words or phrases within a video transcript. Returns matching segments with timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        query: { type: 'string', description: 'Text to search for in the transcript' },
        language: { type: 'string', description: 'Language code', default: 'en' },
      },
      required: ['videoId', 'query'],
    },
  },
  {
    name: 'get_video_frames',
    description:
      'Get visual frames/screenshots from a video at regular intervals. Use this to understand video content visually, especially for videos without captions (gameplay, music, documentaries). Returns image URLs that Claude can analyze with vision.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        count: { type: 'number', description: 'Number of frames to extract (1-10)', default: 5 },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_frame_at_time',
    description:
      'Get a video frame/screenshot at a specific timestamp. Use this when user asks "what happens at 1:02?" Returns an image URL that Claude can analyze with vision.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        timestamp: { type: 'string', description: 'Timestamp like "1:02" or "1:30:45" or seconds "62"' },
      },
      required: ['videoId', 'timestamp'],
    },
  },
];

// API tools - require YouTube Data API key
export const API_TOOLS: Tool[] = [
  {
    name: 'search_videos',
    description:
      'Search YouTube for videos, channels, or playlists. Returns titles, channels, and URLs. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        maxResults: { type: 'number', description: 'Max results (1-50)', default: 10 },
        order: {
          type: 'string',
          enum: ['date', 'rating', 'relevance', 'title', 'viewCount'],
          default: 'relevance',
        },
        type: {
          type: 'string',
          enum: ['video', 'channel', 'playlist'],
          default: 'video',
        },
        duration: {
          type: 'string',
          enum: ['any', 'short', 'medium', 'long'],
          description: 'Filter by duration',
        },
        regionCode: { type: 'string', description: 'Region code (e.g., US, UK)', default: 'US' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_video_details',
    description:
      'Get full details about a YouTube video including title, description, stats, tags, and duration. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: {
          type: 'string',
          description: 'YouTube video ID or URL',
        },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_channel_info',
    description:
      'Get information about a YouTube channel including subscriber count and description. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: {
          type: 'string',
          description: 'Channel ID, handle (@username), or channel URL',
        },
      },
      required: ['channelId'],
    },
  },
  {
    name: 'get_channel_videos',
    description: 'Get a list of videos from a YouTube channel. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Channel ID or handle' },
        maxResults: { type: 'number', description: 'Max videos to return (1-50)', default: 20 },
        order: {
          type: 'string',
          enum: ['date', 'rating', 'relevance', 'title', 'viewCount'],
          default: 'date',
        },
      },
      required: ['channelId'],
    },
  },
  {
    name: 'get_playlist',
    description: 'Get details and videos from a YouTube playlist. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        playlistId: { type: 'string', description: 'Playlist ID or URL' },
        maxResults: { type: 'number', description: 'Max items to return', default: 50 },
      },
      required: ['playlistId'],
    },
  },
  {
    name: 'get_video_comments',
    description: 'Get comments from a YouTube video. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        maxResults: { type: 'number', description: 'Max comments (1-100)', default: 20 },
        order: {
          type: 'string',
          enum: ['time', 'relevance'],
          default: 'relevance',
        },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_trending',
    description: 'Get trending videos in a specific region and category. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        regionCode: { type: 'string', description: 'Region code (e.g., US, UK, JP)', default: 'US' },
        categoryId: {
          type: 'string',
          description: 'Category ID (e.g., 10 for Music, 20 for Gaming)',
        },
        maxResults: { type: 'number', description: 'Max results (1-50)', default: 20 },
      },
    },
  },
  {
    name: 'get_related_videos',
    description: 'Find videos related to a specific video. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        maxResults: { type: 'number', description: 'Max results', default: 10 },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_video_chapters',
    description:
      'Extract chapters/timestamps from a video description. Returns structured chapter data with times and titles. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_categories',
    description:
      'Get list of YouTube video categories for a region. Useful for filtering trending videos. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        regionCode: { type: 'string', description: 'Region code (e.g., US, UK, JP)', default: 'US' },
      },
    },
  },
  {
    name: 'compare_videos',
    description:
      'Compare stats of multiple videos side by side. Great for analyzing performance. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of video IDs or URLs (2-10 videos)',
        },
      },
      required: ['videoIds'],
    },
  },
  {
    name: 'analyze_channel',
    description:
      'Get detailed channel analytics including posting frequency, average views, and content breakdown. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Channel ID, handle (@username), or URL' },
        videoCount: {
          type: 'number',
          description: 'Number of recent videos to analyze (5-50)',
          default: 20,
        },
      },
      required: ['channelId'],
    },
  },
  {
    name: 'export_playlist',
    description:
      'Export a playlist to JSON format with all video details. Perfect for backup or analysis. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        playlistId: { type: 'string', description: 'Playlist ID or URL' },
        includeDescriptions: {
          type: 'boolean',
          description: 'Include video descriptions',
          default: false,
        },
      },
      required: ['playlistId'],
    },
  },
];

export function getAllTools(hasApiKey: boolean): Tool[] {
  return hasApiKey ? [...CORE_TOOLS, ...API_TOOLS] : CORE_TOOLS;
}
