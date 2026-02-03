import { YouTubeAPIService } from '../services/youtube-api.js';
import { TranscriptService } from '../services/transcript.js';
import { CacheService } from '../services/cache.js';
import {
  formatVideoDetails,
  formatChannelDetails,
  formatSearchResults,
  formatNumber,
  extractVideoId,
  extractChannelId,
  extractPlaylistId,
} from '../utils/formatting.js';
import { getApiKeyInstructions } from '../auth/index.js';

// Max response size to avoid eating Claude's context
const MAX_RESPONSE_LENGTH = 15000;
const MAX_TRANSCRIPT_LENGTH = 30000;

/**
 * Truncate response to prevent context overflow
 */
function truncateResponse(text: string, maxLength: number = MAX_RESPONSE_LENGTH): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint = lastNewline > maxLength * 0.8 ? lastNewline : maxLength;
  return truncated.substring(0, cutPoint) + '\n\n...[Response truncated for context efficiency]';
}

export interface ToolContext {
  youtubeApi: YouTubeAPIService | null;
  transcriptService: TranscriptService;
  cache: CacheService;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
  ctx: ToolContext
): Promise<ToolResult> {
  const { youtubeApi, transcriptService, cache } = ctx;

  // === CORE TOOLS (no API key needed) ===

  if (name === 'get_video_info') {
    const videoId = extractVideoId(args?.videoId as string);
    const cacheKey = CacheService.makeKey('videoinfo', videoId);

    const info = await cache.getOrSet(cacheKey, () => transcriptService.getVideoInfo(videoId));

    // Format duration
    const hours = Math.floor(info.lengthSeconds / 3600);
    const minutes = Math.floor((info.lengthSeconds % 3600) / 60);
    const seconds = info.lengthSeconds % 60;
    const duration =
      hours > 0
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const response = `**${info.title}**
Channel: ${info.author}
Duration: ${duration}
URL: https://youtube.com/watch?v=${videoId}

**Description:**
${info.description.substring(0, 1000)}${info.description.length > 1000 ? '...' : ''}

${info.keywords.length > 0 ? `**Keywords:** ${info.keywords.slice(0, 15).join(', ')}` : ''}`;

    return { content: [{ type: 'text', text: response.trim() }] };
  }

  if (name === 'get_transcript') {
    const videoId = extractVideoId(args?.videoId as string);
    const language = (args?.language as string) || 'en';
    const withTimestamps = (args?.withTimestamps as boolean) || false;

    const cacheKey = CacheService.makeKey('transcript', videoId, language, withTimestamps ? 'ts' : 'plain');

    if (withTimestamps) {
      const transcript = await cache.getOrSet(cacheKey, () =>
        transcriptService.getTimestampedTranscript(videoId, language)
      );
      return { content: [{ type: 'text', text: truncateResponse(transcript, MAX_TRANSCRIPT_LENGTH) }] };
    }

    const transcript = await cache.getOrSet(cacheKey, () =>
      transcriptService.getTranscript(videoId, language)
    );
    return { content: [{ type: 'text', text: truncateResponse(transcript.fullText, MAX_TRANSCRIPT_LENGTH) }] };
  }

  if (name === 'search_in_transcript') {
    const videoId = extractVideoId(args?.videoId as string);
    const query = args?.query as string;
    const language = (args?.language as string) || 'en';

    const results = await transcriptService.searchTranscript(videoId, query, language);

    if (results.length === 0) {
      return { content: [{ type: 'text', text: `No matches found for "${query}" in the transcript.` }] };
    }

    const formatted = results
      .map((r) => {
        const mins = Math.floor(r.timestamp / 60);
        const secs = Math.floor(r.timestamp % 60);
        return `[${mins}:${secs.toString().padStart(2, '0')}] ...${r.context}...`;
      })
      .join('\n\n');

    return { content: [{ type: 'text', text: `Found ${results.length} matches for "${query}":\n\n${formatted}` }] };
  }

  // === API TOOLS (require API key) ===

  if (!youtubeApi) {
    return { content: [{ type: 'text', text: getApiKeyInstructions() }], isError: true };
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

      const formatted = chapters.map((c, i) => `${i + 1}. [${c.time}] ${c.title}`).join('\n');

      return {
        content: [{ type: 'text', text: `**${video.title}**\n\n${chapters.length} chapters found:\n\n${formatted}` }],
      };
    }

    case 'get_categories': {
      const regionCode = (args?.regionCode as string) || 'US';
      const categories = await youtubeApi.getVideoCategories(regionCode);

      const formatted = categories.map((c) => `• **${c.id}**: ${c.title}`).join('\n');

      return {
        content: [{ type: 'text', text: `YouTube categories for ${regionCode}:\n\n${formatted}\n\nUse the ID with get_trending to filter by category.` }],
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
        content: [{ type: 'text', text: `**Video Comparison** (${videos.length} videos)\n\nTotal views: ${formatNumber(totalViews)} | Avg views: ${formatNumber(avgViews)}\n\n${comparison}` }],
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

      const recentVideos = await youtubeApi.getChannelVideos(channel.id, { maxResults: videoCount, order: 'date' });
      const videoIds = recentVideos.map((v) => v.id);
      const videoDetails = videoIds.length > 0 ? await youtubeApi.getMultipleVideoDetails(videoIds) : [];

      const totalViews = videoDetails.reduce((sum, v) => sum + v.viewCount, 0);
      const totalLikes = videoDetails.reduce((sum, v) => sum + v.likeCount, 0);
      const avgViews = videoDetails.length > 0 ? Math.round(totalViews / videoDetails.length) : 0;
      const avgLikes = videoDetails.length > 0 ? Math.round(totalLikes / videoDetails.length) : 0;
      const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : '0.00';

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

      const topVideo = videoDetails.length > 0
        ? videoDetails.reduce((max, v) => (v.viewCount > max.viewCount ? v : max), videoDetails[0])
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

      const jsonOutput = JSON.stringify(exportData, null, 2);
      return {
        content: [{ type: 'text', text: truncateResponse(`**Exported: ${playlist.title}**\n${items.length} videos\n\n\`\`\`json\n${jsonOutput}\n\`\`\``) }],
      };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
}
