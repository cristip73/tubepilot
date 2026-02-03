import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig, hasApiKey } from './config.js';
import { YouTubeAPIService } from './services/youtube-api.js';
import { TranscriptService } from './services/transcript.js';
import { CacheService } from './services/cache.js';
import {
  formatVideoDetails,
  formatChannelDetails,
  formatSearchResults,
  formatNumber,
  extractVideoId,
  extractChannelId,
  extractPlaylistId,
} from './utils/formatting.js';
import { sanitizeErrorMessage, logError } from './utils/errors.js';

// Core tools - work WITHOUT API key (transcript-based)
const CORE_TOOLS: Tool[] = [
  {
    name: 'get_transcript',
    description:
      'Extract the full transcript/captions from a YouTube video. Use this to understand video content, summarize videos, or answer questions about what was said.',
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
];

// API tools - require YouTube Data API key
const API_TOOLS: Tool[] = [
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
    description: 'Get information about a YouTube channel including subscriber count and description. (Requires API key)',
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
    description: 'Extract chapters/timestamps from a video description. Returns structured chapter data with times and titles. (Requires API key)',
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
    description: 'Get list of YouTube video categories for a region. Useful for filtering trending videos. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        regionCode: { type: 'string', description: 'Region code (e.g., US, UK, JP)', default: 'US' },
      },
    },
  },
  {
    name: 'compare_videos',
    description: 'Compare stats of multiple videos side by side. Great for analyzing performance. (Requires API key)',
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
    description: 'Get detailed channel analytics including posting frequency, average views, and content breakdown. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Channel ID, handle (@username), or URL' },
        videoCount: { type: 'number', description: 'Number of recent videos to analyze (5-50)', default: 20 },
      },
      required: ['channelId'],
    },
  },
  {
    name: 'export_playlist',
    description: 'Export a playlist to JSON format with all video details. Perfect for backup or analysis. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        playlistId: { type: 'string', description: 'Playlist ID or URL' },
        includeDescriptions: { type: 'boolean', description: 'Include video descriptions', default: false },
      },
      required: ['playlistId'],
    },
  },
];

export async function createServer() {
  const config = getConfig();
  const hasKey = hasApiKey();

  // YouTube API service - only create if we have an API key
  const youtubeApi = hasKey && config.youtubeApiKey
    ? new YouTubeAPIService(config.youtubeApiKey)
    : null;

  const transcriptService = new TranscriptService();
  const cache = new CacheService(config.cacheTtl);

  // Determine available tools
  const availableTools = hasKey ? [...CORE_TOOLS, ...API_TOOLS] : CORE_TOOLS;

  const server = new Server(
    {
      name: 'tubepilot',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: availableTools,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      // === CORE TOOLS (no API key needed) ===

      if (name === 'get_transcript') {
        const videoId = extractVideoId(args?.videoId as string);
        const language = (args?.language as string) || 'en';
        const withTimestamps = (args?.withTimestamps as boolean) || false;

        const cacheKey = CacheService.makeKey('transcript', videoId, language, withTimestamps ? 'ts' : 'plain');

        if (withTimestamps) {
          const transcript = await cache.getOrSet(cacheKey, () =>
            transcriptService.getTimestampedTranscript(videoId, language)
          );
          return {
            content: [{ type: 'text', text: transcript }],
          };
        }

        const transcript = await cache.getOrSet(cacheKey, () =>
          transcriptService.getTranscript(videoId, language)
        );

        return {
          content: [{ type: 'text', text: transcript.fullText }],
        };
      }

      if (name === 'search_in_transcript') {
        const videoId = extractVideoId(args?.videoId as string);
        const query = args?.query as string;
        const language = (args?.language as string) || 'en';

        const results = await transcriptService.searchTranscript(videoId, query, language);

        if (results.length === 0) {
          return {
            content: [{ type: 'text', text: `No matches found for "${query}" in the transcript.` }],
          };
        }

        const formatted = results
          .map((r) => {
            const mins = Math.floor(r.timestamp / 60);
            const secs = Math.floor(r.timestamp % 60);
            return `[${mins}:${secs.toString().padStart(2, '0')}] ...${r.context}...`;
          })
          .join('\n\n');

        return {
          content: [{ type: 'text', text: `Found ${results.length} matches for "${query}":\n\n${formatted}` }],
        };
      }

      // === API TOOLS (require API key) ===

      if (!youtubeApi) {
        return {
          content: [{
            type: 'text',
            text: `This feature requires a YouTube API key.

To enable search, video details, and other features:

1. Get a free API key at https://console.cloud.google.com
   - Create a project → Enable "YouTube Data API v3" → Create credentials → API Key

2. Add it to your Claude Desktop config (claude_desktop_config.json):

{
  "mcpServers": {
    "tubepilot": {
      "command": "npx",
      "args": ["-y", "tubepilot"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here"
      }
    }
  }
}

3. Restart Claude Desktop`
          }],
          isError: true,
        };
      }

      switch (name) {
        case 'search_videos': {
          const query = args?.query as string;
          const maxResults = (args?.maxResults as number) || 10;
          const order = (args?.order as 'date' | 'rating' | 'relevance' | 'title' | 'viewCount') || 'relevance';
          const type = (args?.type as 'video' | 'channel' | 'playlist') || 'video';
          const duration = args?.duration as 'any' | 'short' | 'medium' | 'long' | undefined;
          const regionCode = (args?.regionCode as string) || 'US';

          const cacheKey = CacheService.makeKey('search', query, maxResults, order, type, duration, regionCode);
          const results = await cache.getOrSet(cacheKey, () =>
            youtubeApi.searchVideos(query, { maxResults, order, type, videoDuration: duration, regionCode })
          );

          return {
            content: [{ type: 'text', text: `Found ${results.length} results for "${query}":\n\n${formatSearchResults(results)}` }],
          };
        }

        case 'get_video_details': {
          const videoId = extractVideoId(args?.videoId as string);
          const cacheKey = CacheService.makeKey('video', videoId);
          const video = await cache.getOrSet(cacheKey, () => youtubeApi.getVideoDetails(videoId));

          if (!video) {
            return { content: [{ type: 'text', text: `Video not found: ${videoId}` }], isError: true };
          }

          return { content: [{ type: 'text', text: formatVideoDetails(video) }] };
        }

        case 'get_channel_info': {
          const channelInput = args?.channelId as string;
          let channel;

          if (channelInput.startsWith('@')) {
            channel = await youtubeApi.getChannelByUsername(channelInput);
          } else {
            const channelId = extractChannelId(channelInput);
            channel = await youtubeApi.getChannelDetails(channelId);
          }

          if (!channel) {
            return { content: [{ type: 'text', text: `Channel not found: ${channelInput}` }], isError: true };
          }

          return { content: [{ type: 'text', text: formatChannelDetails(channel) }] };
        }

        case 'get_channel_videos': {
          const channelInput = args?.channelId as string;
          const maxResults = (args?.maxResults as number) || 20;
          const order = (args?.order as 'date' | 'rating' | 'relevance' | 'title' | 'viewCount') || 'date';

          let channelId = channelInput;
          if (channelInput.startsWith('@')) {
            const channel = await youtubeApi.getChannelByUsername(channelInput);
            if (!channel) {
              return { content: [{ type: 'text', text: `Channel not found: ${channelInput}` }], isError: true };
            }
            channelId = channel.id;
          } else {
            channelId = extractChannelId(channelInput);
          }

          const videos = await youtubeApi.getChannelVideos(channelId, { maxResults, order });
          return { content: [{ type: 'text', text: `Latest ${videos.length} videos:\n\n${formatSearchResults(videos)}` }] };
        }

        case 'get_playlist': {
          const playlistId = extractPlaylistId(args?.playlistId as string);
          const maxResults = (args?.maxResults as number) || 50;

          const [playlist, items] = await Promise.all([
            youtubeApi.getPlaylistDetails(playlistId),
            youtubeApi.getPlaylistItems(playlistId, maxResults),
          ]);

          if (!playlist) {
            return { content: [{ type: 'text', text: `Playlist not found: ${playlistId}` }], isError: true };
          }

          const itemsList = items
            .map((item, i) => `${i + 1}. **${item.title}**\n   https://youtube.com/watch?v=${item.videoId}`)
            .join('\n\n');

          return {
            content: [{ type: 'text', text: `**${playlist.title}**\nBy: ${playlist.channelTitle} | ${playlist.itemCount} videos\n\n${itemsList}` }],
          };
        }

        case 'get_video_comments': {
          const videoId = extractVideoId(args?.videoId as string);
          const maxResults = (args?.maxResults as number) || 20;
          const order = (args?.order as 'time' | 'relevance') || 'relevance';

          const comments = await youtubeApi.getVideoComments(videoId, { maxResults, order });

          const formatted = comments
            .map((c) => `**${c.authorDisplayName}** (${formatNumber(c.likeCount)} likes)\n${c.textOriginal.substring(0, 300)}${c.textOriginal.length > 300 ? '...' : ''}`)
            .join('\n\n---\n\n');

          return { content: [{ type: 'text', text: `Top ${comments.length} comments:\n\n${formatted}` }] };
        }

        case 'get_trending': {
          const regionCode = (args?.regionCode as string) || 'US';
          const categoryId = args?.categoryId as string | undefined;
          const maxResults = (args?.maxResults as number) || 20;

          const trending = await youtubeApi.getTrendingVideos(regionCode, categoryId, maxResults);

          const formatted = trending
            .map((v, i) => `${i + 1}. **${v.title}**\n   ${v.channelTitle} | ${formatNumber(v.viewCount)} views\n   https://youtube.com/watch?v=${v.id}`)
            .join('\n\n');

          return { content: [{ type: 'text', text: `Trending in ${regionCode}:\n\n${formatted}` }] };
        }

        case 'get_related_videos': {
          const videoId = extractVideoId(args?.videoId as string);
          const maxResults = (args?.maxResults as number) || 10;
          const related = await youtubeApi.getRelatedVideos(videoId, maxResults);

          return { content: [{ type: 'text', text: `Related videos:\n\n${formatSearchResults(related)}` }] };
        }

        case 'get_video_chapters': {
          const videoId = extractVideoId(args?.videoId as string);
          const video = await youtubeApi.getVideoDetails(videoId);

          if (!video) {
            return { content: [{ type: 'text', text: `Video not found: ${videoId}` }], isError: true };
          }

          // Parse chapters from description (format: 0:00 Title or 00:00:00 Title)
          const chapterRegex = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)(?=\n|$)/g;
          const chapters: { time: string; seconds: number; title: string }[] = [];
          let match;

          while ((match = chapterRegex.exec(video.description)) !== null) {
            const timeStr = match[1];
            const title = match[2].trim();
            const parts = timeStr.split(':').map(Number);
            let seconds = 0;
            if (parts.length === 3) {
              seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else {
              seconds = parts[0] * 60 + parts[1];
            }
            chapters.push({ time: timeStr, seconds, title });
          }

          if (chapters.length === 0) {
            return { content: [{ type: 'text', text: `No chapters found in "${video.title}". The video may not have chapter markers in its description.` }] };
          }

          const formatted = chapters
            .map((c, i) => `${i + 1}. [${c.time}] ${c.title}`)
            .join('\n');

          return {
            content: [{
              type: 'text',
              text: `**${video.title}**\n\n${chapters.length} chapters found:\n\n${formatted}`,
            }],
          };
        }

        case 'get_categories': {
          const regionCode = (args?.regionCode as string) || 'US';
          const categories = await youtubeApi.getVideoCategories(regionCode);

          const formatted = categories
            .map((c) => `• **${c.id}**: ${c.title}`)
            .join('\n');

          return {
            content: [{
              type: 'text',
              text: `YouTube categories for ${regionCode}:\n\n${formatted}\n\nUse the ID with get_trending to filter by category.`,
            }],
          };
        }

        case 'compare_videos': {
          const videoIds = (args?.videoIds as string[]) || [];
          if (videoIds.length < 2 || videoIds.length > 10) {
            return { content: [{ type: 'text', text: 'Please provide 2-10 video IDs to compare.' }], isError: true };
          }

          const cleanIds = videoIds.map((id) => extractVideoId(id));
          const videos = await youtubeApi.getMultipleVideoDetails(cleanIds);

          if (videos.length === 0) {
            return { content: [{ type: 'text', text: 'No videos found.' }], isError: true };
          }

          // Calculate stats
          const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
          const avgViews = Math.round(totalViews / videos.length);

          const comparison = videos
            .sort((a, b) => b.viewCount - a.viewCount)
            .map((v, i) => {
              const engagementRate = v.viewCount > 0 ? ((v.likeCount / v.viewCount) * 100).toFixed(2) : '0.00';
              return `**${i + 1}. ${v.title}**
   Views: ${formatNumber(v.viewCount)} | Likes: ${formatNumber(v.likeCount)} | Comments: ${formatNumber(v.commentCount)}
   Engagement: ${engagementRate}% | Channel: ${v.channelTitle}
   https://youtube.com/watch?v=${v.id}`;
            })
            .join('\n\n');

          return {
            content: [{
              type: 'text',
              text: `**Video Comparison** (${videos.length} videos)\n\nTotal views: ${formatNumber(totalViews)} | Avg views: ${formatNumber(avgViews)}\n\n${comparison}`,
            }],
          };
        }

        case 'analyze_channel': {
          const channelInput = args?.channelId as string;
          const videoCount = Math.min(Math.max((args?.videoCount as number) || 20, 5), 50);

          let channel;
          if (channelInput.startsWith('@')) {
            channel = await youtubeApi.getChannelByUsername(channelInput);
          } else {
            const channelId = extractChannelId(channelInput);
            channel = await youtubeApi.getChannelDetails(channelId);
          }

          if (!channel) {
            return { content: [{ type: 'text', text: `Channel not found: ${channelInput}` }], isError: true };
          }

          // Get recent videos
          const recentVideos = await youtubeApi.getChannelVideos(channel.id, { maxResults: videoCount, order: 'date' });
          const videoIds = recentVideos.map((v) => v.id);
          const videoDetails = videoIds.length > 0 ? await youtubeApi.getMultipleVideoDetails(videoIds) : [];

          // Calculate analytics
          const totalViews = videoDetails.reduce((sum, v) => sum + v.viewCount, 0);
          const totalLikes = videoDetails.reduce((sum, v) => sum + v.likeCount, 0);
          const avgViews = videoDetails.length > 0 ? Math.round(totalViews / videoDetails.length) : 0;
          const avgLikes = videoDetails.length > 0 ? Math.round(totalLikes / videoDetails.length) : 0;
          const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : '0.00';

          // Calculate posting frequency
          let postingFrequency = 'Unknown';
          if (videoDetails.length >= 2) {
            const dates = videoDetails.map((v) => new Date(v.publishedAt).getTime()).sort((a, b) => b - a);
            const daysBetween = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);
            const avgDaysBetweenPosts = daysBetween / (videoDetails.length - 1);
            if (avgDaysBetweenPosts < 1) postingFrequency = 'Multiple times daily';
            else if (avgDaysBetweenPosts < 2) postingFrequency = 'Daily';
            else if (avgDaysBetweenPosts < 4) postingFrequency = 'Every 2-3 days';
            else if (avgDaysBetweenPosts < 8) postingFrequency = 'Weekly';
            else if (avgDaysBetweenPosts < 15) postingFrequency = 'Bi-weekly';
            else if (avgDaysBetweenPosts < 35) postingFrequency = 'Monthly';
            else postingFrequency = 'Infrequent';
          }

          // Find top video
          const topVideo = videoDetails.length > 0
            ? videoDetails.reduce((max, v) => v.viewCount > max.viewCount ? v : max, videoDetails[0])
            : null;

          return {
            content: [{
              type: 'text',
              text: `**Channel Analysis: ${channel.title}**
${channel.customUrl ? `@${channel.customUrl}` : ''}

**Overview**
• Subscribers: ${formatNumber(channel.subscriberCount)}
• Total videos: ${formatNumber(channel.videoCount)}
• Total channel views: ${formatNumber(channel.viewCount)}
• Country: ${channel.country || 'Not specified'}

**Recent Performance** (last ${videoDetails.length} videos)
• Average views: ${formatNumber(avgViews)}
• Average likes: ${formatNumber(avgLikes)}
• Engagement rate: ${engagementRate}%
• Posting frequency: ${postingFrequency}

${topVideo ? `**Top Performing Video**
"${topVideo.title}"
${formatNumber(topVideo.viewCount)} views | ${formatNumber(topVideo.likeCount)} likes
https://youtube.com/watch?v=${topVideo.id}` : ''}`,
            }],
          };
        }

        case 'export_playlist': {
          const playlistId = extractPlaylistId(args?.playlistId as string);
          const includeDescriptions = (args?.includeDescriptions as boolean) || false;

          const [playlist, items] = await Promise.all([
            youtubeApi.getPlaylistDetails(playlistId),
            youtubeApi.getPlaylistItems(playlistId, 50),
          ]);

          if (!playlist) {
            return { content: [{ type: 'text', text: `Playlist not found: ${playlistId}` }], isError: true };
          }

          const exportData = {
            playlist: {
              id: playlist.id,
              title: playlist.title,
              description: playlist.description,
              channelTitle: playlist.channelTitle,
              itemCount: playlist.itemCount,
              exportedAt: new Date().toISOString(),
            },
            videos: items.map((item) => ({
              position: item.position,
              videoId: item.videoId,
              title: item.title,
              url: `https://youtube.com/watch?v=${item.videoId}`,
              ...(includeDescriptions && { description: item.description }),
            })),
          };

          return {
            content: [{
              type: 'text',
              text: `**Exported: ${playlist.title}**\n${items.length} videos\n\n\`\`\`json\n${JSON.stringify(exportData, null, 2)}\n\`\`\``,
            }],
          };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      // Log full error internally for debugging
      logError(`Tool ${name}`, error);

      // Return sanitized error to client
      const message = sanitizeErrorMessage(error);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  return server;
}

export async function runServer() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const mode = hasApiKey() ? 'full mode' : 'transcript-only mode (no API key)';
  console.error(`TubePilot MCP server running in ${mode}`);
}
