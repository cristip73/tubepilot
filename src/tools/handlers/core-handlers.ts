/**
 * Core handlers - Basic video info and transcript tools
 * These work WITHOUT an API key
 */
import {
  HandlerModule,
  ToolHandler,
  ToolContext,
  ToolResult,
  ContentItem,
  truncateResponse,
  formatTime,
  parseTimestamp,
  MAX_TRANSCRIPT_LENGTH,
} from '../types.js';
import { extractVideoId } from '../../utils/formatting.js';
import { CacheService } from '../../services/cache.js';

const handlers = new Map<string, ToolHandler>();

// ============================================
// health_check
// ============================================
handlers.set('health_check', async (args, ctx) => {
  const hasApiKey = ctx.youtubeApi !== null;
  const cacheStats = ctx.cache.getStats();

  const status = {
    status: 'healthy',
    version: '1.0.0',
    apiKeyConfigured: hasApiKey,
    freeToolsAvailable: 27,
    apiToolsAvailable: hasApiKey ? 22 : 0,
    cache: {
      entries: cacheStats.keys,
      maxEntries: cacheStats.maxKeys,
      hitRate:
        cacheStats.hits + cacheStats.misses > 0
          ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) + '%'
          : 'N/A',
    },
    capabilities: {
      transcripts: true,
      videoFrames: true,
      developerTools: true,
      contentAnalysis: true,
      search: hasApiKey,
      channelAnalytics: hasApiKey,
      comments: hasApiKey,
      trending: hasApiKey,
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: `**TubePilot Health Check**\n\n\`\`\`json\n${JSON.stringify(status, null, 2)}\n\`\`\``,
      },
    ],
  };
});

// ============================================
// get_video_info
// ============================================
handlers.set('get_video_info', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const cacheKey = CacheService.makeKey('videoinfo', videoId);

  const info = await ctx.cache.getOrSet(cacheKey, () =>
    ctx.transcriptService.getVideoInfo(videoId)
  );

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
});

// ============================================
// get_transcript
// ============================================
handlers.set('get_transcript', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';
  const withTimestamps = (args?.withTimestamps as boolean) || false;

  const cacheKey = CacheService.makeKey(
    'transcript',
    videoId,
    language,
    withTimestamps ? 'ts' : 'plain'
  );

  if (withTimestamps) {
    const transcript = await ctx.cache.getOrSet(cacheKey, () =>
      ctx.transcriptService.getTimestampedTranscript(videoId, language)
    );
    return {
      content: [{ type: 'text', text: truncateResponse(transcript, MAX_TRANSCRIPT_LENGTH) }],
    };
  }

  const transcript = await ctx.cache.getOrSet(cacheKey, () =>
    ctx.transcriptService.getTranscript(videoId, language)
  );
  return {
    content: [{ type: 'text', text: truncateResponse(transcript.fullText, MAX_TRANSCRIPT_LENGTH) }],
  };
});

// ============================================
// search_in_transcript
// ============================================
handlers.set('search_in_transcript', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const query = args?.query as string;
  const language = (args?.language as string) || 'en';

  const results = await ctx.transcriptService.searchTranscript(videoId, query, language);

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
    content: [
      { type: 'text', text: `Found ${results.length} matches for "${query}":\n\n${formatted}` },
    ],
  };
});

// ============================================
// get_video_frames
// ============================================
handlers.set('get_video_frames', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const count = Math.min(Math.max((args?.count as number) || 5, 1), 10);

  const frames = await ctx.transcriptService.getVideoFrames(videoId, count);
  const info = await ctx.transcriptService.getVideoInfo(videoId);

  const frameList = frames
    .map((f, i) => {
      const mins = Math.floor(f.timestamp / 60);
      const secs = Math.floor(f.timestamp % 60);
      return `**Frame ${i + 1}** [${mins}:${secs.toString().padStart(2, '0')}]\n${f.imageUrl}`;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `**${info.title}** - ${count} frames extracted\n\nAnalyze these frames to understand the video content:\n\n${frameList}`,
      },
    ],
  };
});

// ============================================
// get_frame_at_time
// ============================================
handlers.set('get_frame_at_time', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const seconds = parseTimestamp(args?.timestamp as string);

  const frame = await ctx.transcriptService.getFrameAtTimestamp(videoId, seconds);
  const timestamp = formatTime(seconds);

  return {
    content: [
      {
        type: 'text',
        text: `**${frame.videoTitle}** - Frame at ${timestamp}\n\nAnalyze this frame to see what's happening:\n\n${frame.imageUrl}`,
      },
    ],
  };
});

// ============================================
// list_caption_languages
// ============================================
handlers.set('list_caption_languages', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const languages = await ctx.transcriptService.listCaptionLanguages(videoId);

  if (languages.length === 0) {
    return {
      content: [{ type: 'text', text: 'No captions available for this video.' }],
    };
  }

  const formatted = languages
    .map((lang) => `• **${lang.code}**: ${lang.name}${lang.isAuto ? ' (auto-generated)' : ''}`)
    .join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `**Available Captions** (${languages.length} languages)\n\n${formatted}\n\nUse the language code with get_transcript to fetch captions in that language.`,
      },
    ],
  };
});

// ============================================
// create_clip_url
// ============================================
handlers.set('create_clip_url', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const startSeconds = parseTimestamp(args?.startTime as string);
  const endInput = args?.endTime as string | undefined;

  let clipUrl = `https://youtube.com/watch?v=${videoId}&t=${startSeconds}`;
  let response = `**Shareable Link** (starts at ${formatTime(startSeconds)})\n\n${clipUrl}`;

  if (endInput) {
    const endSeconds = parseTimestamp(endInput);
    const embedUrl = `https://youtube.com/embed/${videoId}?start=${startSeconds}&end=${endSeconds}`;
    response += `\n\n**Embed with End Time** (${formatTime(startSeconds)} - ${formatTime(endSeconds)})\n${embedUrl}`;
  }

  return { content: [{ type: 'text', text: response }] };
});

// ============================================
// get_video_moment
// ============================================
handlers.set('get_video_moment', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const seconds = parseTimestamp(args?.timestamp as string);

  const moment = await ctx.transcriptService.getVideoMoment(videoId, seconds);

  // Try to extract actual frame image for Claude's vision
  const frameImage = await ctx.transcriptService.extractFrameImage(videoId, seconds);

  let response = `**${moment.videoTitle}** - Moment at ${moment.formattedTime}\n\n`;

  if (moment.hasTranscript) {
    response += `**What's being said:**\n`;
    if (moment.transcript.contextBefore) {
      response += `...${moment.transcript.contextBefore} `;
    }
    response += `**→ ${moment.transcript.currentText} ←**`;
    if (moment.transcript.contextAfter) {
      response += ` ${moment.transcript.contextAfter}...`;
    }
    response += '\n\n';
  } else {
    response += `**Transcript:** Not available for this video (no captions)\n\n`;
  }

  // Build content array with text and optionally the frame image
  const content: ContentItem[] = [];

  if (frameImage) {
    response += `**Visual Frame:** Extracted frame at ${moment.formattedTime} (${frameImage.frameWidth}x${frameImage.frameHeight}px)\n`;
    response += `*Analyze the image below to see what's happening visually.*`;

    // Add text first, then image
    content.push({ type: 'text', text: response });
    content.push({
      type: 'image',
      data: frameImage.imageBase64,
      mimeType: frameImage.mimeType,
    });
  } else {
    response += `**Visual Frame:**\n`;
    response += `Thumbnail (storyboard not available): ${moment.visual.thumbnailUrl}\n`;
    response += `\n**Analysis tip:** Combine the transcript text and thumbnail to understand this moment.`;
    content.push({ type: 'text', text: response });
  }

  return { content };
});

// ============================================
// find_moment_by_topic
// ============================================
handlers.set('find_moment_by_topic', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const topic = args?.topic as string;
  const maxResults = Math.min(Math.max((args?.maxResults as number) || 5, 1), 20);

  const results = await ctx.transcriptService.searchTranscript(videoId, topic);

  if (results.length === 0) {
    return {
      content: [
        { type: 'text', text: `No mentions of "${topic}" found in this video's transcript.` },
      ],
    };
  }

  const topResults = results.slice(0, maxResults);

  const formatted = topResults
    .map((r, i) => {
      const timeStr = formatTime(r.timestamp);
      const secondsTotal = Math.floor(r.timestamp);
      return `**${i + 1}. [${timeStr}]** (https://youtube.com/watch?v=${videoId}&t=${secondsTotal})\n"...${r.context}..."`;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `**Found ${results.length} mention${results.length > 1 ? 's' : ''} of "${topic}"**\n\nShowing top ${topResults.length}:\n\n${formatted}\n\n*Tip: Use get_video_moment with any timestamp to see transcript + visual together.*`,
      },
    ],
  };
});

export const coreHandlers: HandlerModule = {
  handlers,
  requiresApiKey: false,
};
