import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { getConfig } from './config.js';
import { YouTubeAPIService } from './services/youtube-api.js';
import { TranscriptService } from './services/transcript.js';
import { CacheService } from './services/cache.js';
import {
  formatVideoDetails,
  formatChannelDetails,
  formatSearchResults,
  formatNumber,
  formatDuration,
  extractVideoId,
  extractChannelId,
  extractPlaylistId,
} from './utils/formatting.js';

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'search_videos',
    description:
      'Search YouTube for videos, channels, or playlists. Returns titles, channels, and URLs.',
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
          description: 'Filter by duration (short <4min, medium 4-20min, long >20min)',
        },
        regionCode: { type: 'string', description: 'Region code (e.g., US, UK)', default: 'US' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_video_details',
    description:
      'Get full details about a YouTube video including title, description, stats, tags, and duration.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: {
          type: 'string',
          description: 'YouTube video ID or URL (e.g., dQw4w9WgXcQ or full URL)',
        },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_transcript',
    description:
      'Extract the full transcript/captions from a YouTube video. Essential for understanding video content without watching it.',
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
    name: 'get_channel_info',
    description: 'Get information about a YouTube channel including subscriber count, video count, and description.',
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
    description: 'Get a list of videos from a YouTube channel.',
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
    description: 'Get details and videos from a YouTube playlist.',
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
    description: 'Get comments from a YouTube video with like counts and replies.',
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
    description: 'Get trending videos in a specific region and category.',
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
    description: 'Find videos related to a specific video.',
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
    name: 'get_video_categories',
    description: 'Get list of video categories for a region.',
    inputSchema: {
      type: 'object',
      properties: {
        regionCode: { type: 'string', description: 'Region code', default: 'US' },
      },
    },
  },
];

export async function createServer() {
  const config = getConfig();
  const youtubeApi = new YouTubeAPIService(config.youtubeApiKey);
  const transcriptService = new TranscriptService();
  const cache = new CacheService(config.cacheTtl);

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
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
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
            youtubeApi.searchVideos(query, {
              maxResults,
              order,
              type,
              videoDuration: duration,
              regionCode,
            })
          );

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} results for "${query}":\n\n${formatSearchResults(results)}`,
              },
            ],
          };
        }

        case 'get_video_details': {
          const videoId = extractVideoId(args?.videoId as string);
          const cacheKey = CacheService.makeKey('video', videoId);

          const video = await cache.getOrSet(cacheKey, () => youtubeApi.getVideoDetails(videoId));

          if (!video) {
            return {
              content: [{ type: 'text', text: `Video not found: ${videoId}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: formatVideoDetails(video) }],
          };
        }

        case 'get_transcript': {
          const videoId = extractVideoId(args?.videoId as string);
          const language = (args?.language as string) || 'en';
          const withTimestamps = (args?.withTimestamps as boolean) || false;

          const cacheKey = CacheService.makeKey('transcript', videoId, language, withTimestamps);

          if (withTimestamps) {
            const transcript = await cache.getOrSet(cacheKey, () =>
              transcriptService.getTimestampedTranscript(videoId, language)
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `**Transcript for video ${videoId}:**\n\n${transcript}`,
                },
              ],
            };
          }

          const transcript = await cache.getOrSet(cacheKey, () =>
            transcriptService.getTranscript(videoId, language)
          );

          return {
            content: [
              {
                type: 'text',
                text: `**Transcript for video ${videoId}:**\n\n${transcript.fullText}`,
              },
            ],
          };
        }

        case 'search_in_transcript': {
          const videoId = extractVideoId(args?.videoId as string);
          const query = args?.query as string;
          const language = (args?.language as string) || 'en';

          const results = await transcriptService.searchTranscript(videoId, query, language);

          if (results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No matches found for "${query}" in the transcript.`,
                },
              ],
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
            content: [
              {
                type: 'text',
                text: `Found ${results.length} matches for "${query}":\n\n${formatted}`,
              },
            ],
          };
        }

        case 'get_channel_info': {
          const channelInput = args?.channelId as string;
          let channel;

          // Check if it's a handle (@username)
          if (channelInput.startsWith('@')) {
            channel = await youtubeApi.getChannelByUsername(channelInput);
          } else {
            const channelId = extractChannelId(channelInput);
            channel = await youtubeApi.getChannelDetails(channelId);
          }

          if (!channel) {
            return {
              content: [{ type: 'text', text: `Channel not found: ${channelInput}` }],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: formatChannelDetails(channel) }],
          };
        }

        case 'get_channel_videos': {
          const channelInput = args?.channelId as string;
          const maxResults = (args?.maxResults as number) || 20;
          const order = (args?.order as 'date' | 'rating' | 'relevance' | 'title' | 'viewCount') || 'date';

          let channelId = channelInput;
          if (channelInput.startsWith('@')) {
            const channel = await youtubeApi.getChannelByUsername(channelInput);
            if (!channel) {
              return {
                content: [{ type: 'text', text: `Channel not found: ${channelInput}` }],
                isError: true,
              };
            }
            channelId = channel.id;
          } else {
            channelId = extractChannelId(channelInput);
          }

          const videos = await youtubeApi.getChannelVideos(channelId, { maxResults, order });

          return {
            content: [
              {
                type: 'text',
                text: `Latest ${videos.length} videos:\n\n${formatSearchResults(videos)}`,
              },
            ],
          };
        }

        case 'get_playlist': {
          const playlistId = extractPlaylistId(args?.playlistId as string);
          const maxResults = (args?.maxResults as number) || 50;

          const [playlist, items] = await Promise.all([
            youtubeApi.getPlaylistDetails(playlistId),
            youtubeApi.getPlaylistItems(playlistId, maxResults),
          ]);

          if (!playlist) {
            return {
              content: [{ type: 'text', text: `Playlist not found: ${playlistId}` }],
              isError: true,
            };
          }

          const itemsList = items
            .map(
              (item, i) =>
                `${i + 1}. **${item.title}**\n   https://youtube.com/watch?v=${item.videoId}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `**${playlist.title}**\nBy: ${playlist.channelTitle} | ${playlist.itemCount} videos\n\n${playlist.description.substring(0, 300)}${playlist.description.length > 300 ? '...' : ''}\n\n**Videos:**\n${itemsList}`,
              },
            ],
          };
        }

        case 'get_video_comments': {
          const videoId = extractVideoId(args?.videoId as string);
          const maxResults = (args?.maxResults as number) || 20;
          const order = (args?.order as 'time' | 'relevance') || 'relevance';

          const comments = await youtubeApi.getVideoComments(videoId, { maxResults, order });

          const formatted = comments
            .map(
              (c) =>
                `**${c.authorDisplayName}** (${formatNumber(c.likeCount)} likes${c.replyCount > 0 ? `, ${c.replyCount} replies` : ''})\n${c.textOriginal.substring(0, 500)}${c.textOriginal.length > 500 ? '...' : ''}`
            )
            .join('\n\n---\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `**Top ${comments.length} comments:**\n\n${formatted}`,
              },
            ],
          };
        }

        case 'get_trending': {
          const regionCode = (args?.regionCode as string) || 'US';
          const categoryId = args?.categoryId as string | undefined;
          const maxResults = (args?.maxResults as number) || 20;

          const trending = await youtubeApi.getTrendingVideos(regionCode, categoryId, maxResults);

          const formatted = trending
            .map(
              (v, i) =>
                `${i + 1}. **${v.title}**\n   ${v.channelTitle} | ${formatNumber(v.viewCount)} views\n   https://youtube.com/watch?v=${v.id}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `**Trending in ${regionCode}:**\n\n${formatted}`,
              },
            ],
          };
        }

        case 'get_related_videos': {
          const videoId = extractVideoId(args?.videoId as string);
          const maxResults = (args?.maxResults as number) || 10;

          const related = await youtubeApi.getRelatedVideos(videoId, maxResults);

          return {
            content: [
              {
                type: 'text',
                text: `**Related videos:**\n\n${formatSearchResults(related)}`,
              },
            ],
          };
        }

        case 'get_video_categories': {
          const regionCode = (args?.regionCode as string) || 'US';

          const categories = await youtubeApi.getVideoCategories(regionCode);

          const formatted = categories.map((c) => `- **${c.id}**: ${c.title}`).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: `**Video Categories (${regionCode}):**\n\n${formatted}`,
              },
            ],
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

export async function runServer() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('TubePilot MCP server running on stdio');
}
