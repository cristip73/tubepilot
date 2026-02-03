/**
 * API handlers - Tools requiring YouTube Data API key
 * Search, channels, playlists, comments, trending, etc.
 */
import { HandlerModule, ToolHandler, truncateResponse, formatTime } from '../types.js';
import {
  formatVideoDetails,
  formatChannelDetails,
  formatSearchResults,
  formatNumber,
  extractVideoId,
  extractChannelId,
  extractPlaylistId,
} from '../../utils/formatting.js';
import { CacheService } from '../../services/cache.js';

const handlers = new Map<string, ToolHandler>();

// ============================================
// search_videos
// ============================================
handlers.set('search_videos', async (args, ctx) => {
  const query = args?.query as string;
  const maxResults = (args?.maxResults as number) || 10;
  const order =
    (args?.order as 'date' | 'rating' | 'relevance' | 'title' | 'viewCount') || 'relevance';
  const type = (args?.type as 'video' | 'channel' | 'playlist') || 'video';
  const duration = args?.duration as 'any' | 'short' | 'medium' | 'long' | undefined;
  const regionCode = (args?.regionCode as string) || 'US';

  const cacheKey = CacheService.makeKey(
    'search',
    query,
    maxResults,
    order,
    type,
    duration,
    regionCode
  );
  const results = await ctx.cache.getOrSet(cacheKey, () =>
    ctx.youtubeApi!.searchVideos(query, {
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
});

// ============================================
// get_video_details
// ============================================
handlers.set('get_video_details', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const cacheKey = CacheService.makeKey('video', videoId);
  const video = await ctx.cache.getOrSet(cacheKey, () => ctx.youtubeApi!.getVideoDetails(videoId));

  if (!video) {
    return { content: [{ type: 'text', text: `Video not found: ${videoId}` }], isError: true };
  }

  return { content: [{ type: 'text', text: formatVideoDetails(video) }] };
});

// ============================================
// get_channel_info
// ============================================
handlers.set('get_channel_info', async (args, ctx) => {
  const channelInput = args?.channelId as string;
  let channel;

  if (channelInput.startsWith('@')) {
    channel = await ctx.youtubeApi!.getChannelByUsername(channelInput);
  } else {
    const channelId = extractChannelId(channelInput);
    channel = await ctx.youtubeApi!.getChannelDetails(channelId);
  }

  if (!channel) {
    return {
      content: [{ type: 'text', text: `Channel not found: ${channelInput}` }],
      isError: true,
    };
  }

  return { content: [{ type: 'text', text: formatChannelDetails(channel) }] };
});

// ============================================
// get_channel_videos
// ============================================
handlers.set('get_channel_videos', async (args, ctx) => {
  const channelInput = args?.channelId as string;
  const maxResults = (args?.maxResults as number) || 20;
  const order = (args?.order as 'date' | 'rating' | 'relevance' | 'title' | 'viewCount') || 'date';

  let channelId = channelInput;
  if (channelInput.startsWith('@')) {
    const channel = await ctx.youtubeApi!.getChannelByUsername(channelInput);
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

  const videos = await ctx.youtubeApi!.getChannelVideos(channelId, { maxResults, order });
  return {
    content: [
      { type: 'text', text: `Latest ${videos.length} videos:\n\n${formatSearchResults(videos)}` },
    ],
  };
});

// ============================================
// get_playlist
// ============================================
handlers.set('get_playlist', async (args, ctx) => {
  const playlistId = extractPlaylistId(args?.playlistId as string);
  const maxResults = (args?.maxResults as number) || 50;

  const [playlist, items] = await Promise.all([
    ctx.youtubeApi!.getPlaylistDetails(playlistId),
    ctx.youtubeApi!.getPlaylistItems(playlistId, maxResults),
  ]);

  if (!playlist) {
    return {
      content: [{ type: 'text', text: `Playlist not found: ${playlistId}` }],
      isError: true,
    };
  }

  const itemsList = items
    .map((item, i) => `${i + 1}. **${item.title}**\n   https://youtube.com/watch?v=${item.videoId}`)
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `**${playlist.title}**\nBy: ${playlist.channelTitle} | ${playlist.itemCount} videos\n\n${itemsList}`,
      },
    ],
  };
});

// ============================================
// get_video_comments
// ============================================
handlers.set('get_video_comments', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const maxResults = (args?.maxResults as number) || 20;
  const order = (args?.order as 'time' | 'relevance') || 'relevance';

  const comments = await ctx.youtubeApi!.getVideoComments(videoId, { maxResults, order });

  const formatted = comments
    .map(
      (c) =>
        `**${c.authorDisplayName}** (${formatNumber(c.likeCount)} likes)\n${c.textOriginal.substring(0, 300)}${c.textOriginal.length > 300 ? '...' : ''}`
    )
    .join('\n\n---\n\n');

  return { content: [{ type: 'text', text: `Top ${comments.length} comments:\n\n${formatted}` }] };
});

// ============================================
// get_trending
// ============================================
handlers.set('get_trending', async (args, ctx) => {
  const regionCode = (args?.regionCode as string) || 'US';
  const categoryId = args?.categoryId as string | undefined;
  const maxResults = (args?.maxResults as number) || 20;

  const trending = await ctx.youtubeApi!.getTrendingVideos(regionCode, categoryId, maxResults);

  const formatted = trending
    .map(
      (v, i) =>
        `${i + 1}. **${v.title}**\n   ${v.channelTitle} | ${formatNumber(v.viewCount)} views\n   https://youtube.com/watch?v=${v.id}`
    )
    .join('\n\n');

  return { content: [{ type: 'text', text: `Trending in ${regionCode}:\n\n${formatted}` }] };
});

// ============================================
// get_related_videos
// ============================================
handlers.set('get_related_videos', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const maxResults = (args?.maxResults as number) || 10;
  const related = await ctx.youtubeApi!.getRelatedVideos(videoId, maxResults);

  return {
    content: [{ type: 'text', text: `Related videos:\n\n${formatSearchResults(related)}` }],
  };
});

// ============================================
// get_video_chapters
// ============================================
handlers.set('get_video_chapters', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const video = await ctx.youtubeApi!.getVideoDetails(videoId);

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
    return {
      content: [
        {
          type: 'text',
          text: `No chapters found in "${video.title}". The video may not have chapter markers in its description.`,
        },
      ],
    };
  }

  const formatted = chapters.map((c, i) => `${i + 1}. [${c.time}] ${c.title}`).join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `**${video.title}**\n\n${chapters.length} chapters found:\n\n${formatted}`,
      },
    ],
  };
});

// ============================================
// get_categories
// ============================================
handlers.set('get_categories', async (args, ctx) => {
  const regionCode = (args?.regionCode as string) || 'US';
  const categories = await ctx.youtubeApi!.getVideoCategories(regionCode);

  const formatted = categories.map((c) => `• **${c.id}**: ${c.title}`).join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `YouTube categories for ${regionCode}:\n\n${formatted}\n\nUse the ID with get_trending to filter by category.`,
      },
    ],
  };
});

// ============================================
// compare_videos
// ============================================
handlers.set('compare_videos', async (args, ctx) => {
  const videoIds = (args?.videoIds as string[]) || [];
  if (videoIds.length < 2 || videoIds.length > 10) {
    return {
      content: [{ type: 'text', text: 'Please provide 2-10 video IDs to compare.' }],
      isError: true,
    };
  }

  const cleanIds = videoIds.map((id) => extractVideoId(id));
  const videos = await ctx.youtubeApi!.getMultipleVideoDetails(cleanIds);

  if (videos.length === 0) {
    return { content: [{ type: 'text', text: 'No videos found.' }], isError: true };
  }

  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
  const avgViews = Math.round(totalViews / videos.length);

  const comparison = videos
    .sort((a, b) => b.viewCount - a.viewCount)
    .map((v, i) => {
      const engagementRate =
        v.viewCount > 0 ? ((v.likeCount / v.viewCount) * 100).toFixed(2) : '0.00';
      return `**${i + 1}. ${v.title}**
   Views: ${formatNumber(v.viewCount)} | Likes: ${formatNumber(v.likeCount)} | Comments: ${formatNumber(v.commentCount)}
   Engagement: ${engagementRate}% | Channel: ${v.channelTitle}
   https://youtube.com/watch?v=${v.id}`;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `**Video Comparison** (${videos.length} videos)\n\nTotal views: ${formatNumber(totalViews)} | Avg views: ${formatNumber(avgViews)}\n\n${comparison}`,
      },
    ],
  };
});

// ============================================
// analyze_channel
// ============================================
handlers.set('analyze_channel', async (args, ctx) => {
  const channelInput = args?.channelId as string;
  const videoCount = Math.min(Math.max((args?.videoCount as number) || 20, 5), 50);

  let channel;
  if (channelInput.startsWith('@')) {
    channel = await ctx.youtubeApi!.getChannelByUsername(channelInput);
  } else {
    const channelId = extractChannelId(channelInput);
    channel = await ctx.youtubeApi!.getChannelDetails(channelId);
  }

  if (!channel) {
    return {
      content: [{ type: 'text', text: `Channel not found: ${channelInput}` }],
      isError: true,
    };
  }

  const recentVideos = await ctx.youtubeApi!.getChannelVideos(channel.id, {
    maxResults: videoCount,
    order: 'date',
  });
  const videoIds = recentVideos.map((v) => v.id);
  const videoDetails =
    videoIds.length > 0 ? await ctx.youtubeApi!.getMultipleVideoDetails(videoIds) : [];

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

  const topVideo =
    videoDetails.length > 0
      ? videoDetails.reduce((max, v) => (v.viewCount > max.viewCount ? v : max), videoDetails[0])
      : null;

  return {
    content: [
      {
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

${
  topVideo
    ? `**Top Performing Video**
"${topVideo.title}"
${formatNumber(topVideo.viewCount)} views | ${formatNumber(topVideo.likeCount)} likes
https://youtube.com/watch?v=${topVideo.id}`
    : ''
}`,
      },
    ],
  };
});

// ============================================
// export_playlist
// ============================================
handlers.set('export_playlist', async (args, ctx) => {
  const playlistId = extractPlaylistId(args?.playlistId as string);
  const includeDescriptions = (args?.includeDescriptions as boolean) || false;

  const [playlist, items] = await Promise.all([
    ctx.youtubeApi!.getPlaylistDetails(playlistId),
    ctx.youtubeApi!.getPlaylistItems(playlistId, 50),
  ]);

  if (!playlist) {
    return {
      content: [{ type: 'text', text: `Playlist not found: ${playlistId}` }],
      isError: true,
    };
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
    content: [
      {
        type: 'text',
        text: truncateResponse(
          `**Exported: ${playlist.title}**\n${items.length} videos\n\n\`\`\`json\n${jsonOutput}\n\`\`\``
        ),
      },
    ],
  };
});

// ============================================
// check_live_status
// ============================================
handlers.set('check_live_status', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const liveDetails = await ctx.youtubeApi!.getLiveStreamDetails(videoId);

  if (!liveDetails) {
    return { content: [{ type: 'text', text: `Video not found: ${videoId}` }], isError: true };
  }

  let status = 'Regular Video';
  let details = '';

  if (liveDetails.isLive) {
    status = '🔴 LIVE NOW';
    details = `\n• Concurrent viewers: ${formatNumber(liveDetails.concurrentViewers || 0)}`;
    if (liveDetails.actualStartTime) {
      details += `\n• Started: ${new Date(liveDetails.actualStartTime).toLocaleString()}`;
    }
  } else if (liveDetails.isUpcoming) {
    status = '📅 UPCOMING';
    if (liveDetails.scheduledStartTime) {
      details = `\n• Scheduled for: ${new Date(liveDetails.scheduledStartTime).toLocaleString()}`;
    }
  } else if (liveDetails.actualEndTime) {
    status = '⏹️ Past Live Stream';
    details = `\n• Streamed: ${new Date(liveDetails.actualStartTime || '').toLocaleString()}`;
    details += `\n• Ended: ${new Date(liveDetails.actualEndTime).toLocaleString()}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: `**Live Status:** ${status}${details}\n\nhttps://youtube.com/watch?v=${videoId}`,
      },
    ],
  };
});

// ============================================
// get_shorts
// ============================================
handlers.set('get_shorts', async (args, ctx) => {
  const channelInput = args?.channelId as string;
  const maxResults = (args?.maxResults as number) || 20;

  let channelId = channelInput;
  if (channelInput.startsWith('@')) {
    const channel = await ctx.youtubeApi!.getChannelByUsername(channelInput);
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

  const videos = await ctx.youtubeApi!.searchVideos('', {
    channelId,
    maxResults: maxResults * 2,
    order: 'date',
    type: 'video',
    videoDuration: 'short',
  });

  const videoIds = videos.map((v) => v.id);
  const details = await ctx.youtubeApi!.getMultipleVideoDetails(videoIds);

  const shorts = details
    .filter((v) => {
      const duration = v.duration;
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return false;
      const hours = parseInt(match[1] || '0', 10);
      const mins = parseInt(match[2] || '0', 10);
      const secs = parseInt(match[3] || '0', 10);
      const totalSecs = hours * 3600 + mins * 60 + secs;
      return totalSecs <= 60;
    })
    .slice(0, maxResults);

  if (shorts.length === 0) {
    return { content: [{ type: 'text', text: `No Shorts found for this channel.` }] };
  }

  const formatted = shorts
    .map(
      (v, i) =>
        `${i + 1}. **${v.title}**\n   ${formatNumber(v.viewCount)} views\n   https://youtube.com/shorts/${v.id}`
    )
    .join('\n\n');

  return {
    content: [
      { type: 'text', text: `**YouTube Shorts** (${shorts.length} found)\n\n${formatted}` },
    ],
  };
});

// ============================================
// search_by_hashtag
// ============================================
handlers.set('search_by_hashtag', async (args, ctx) => {
  const hashtagInput = args?.hashtag as string;
  const maxResults = (args?.maxResults as number) || 20;

  const hashtag = hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`;

  const results = await ctx.youtubeApi!.searchVideos(hashtag, {
    maxResults,
    type: 'video',
    order: 'relevance',
  });

  if (results.length === 0) {
    return { content: [{ type: 'text', text: `No videos found with hashtag ${hashtag}` }] };
  }

  const formatted = results
    .map(
      (v, i) =>
        `${i + 1}. **${v.title}**\n   ${v.channelTitle}\n   https://youtube.com/watch?v=${v.id}`
    )
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `**Videos with ${hashtag}** (${results.length} found)\n\n${formatted}`,
      },
    ],
  };
});

// ============================================
// compare_channels
// ============================================
handlers.set('compare_channels', async (args, ctx) => {
  const channelInputs = (args?.channelIds as string[]) || [];
  if (channelInputs.length < 2 || channelInputs.length > 5) {
    return {
      content: [{ type: 'text', text: 'Please provide 2-5 channel IDs or handles to compare.' }],
      isError: true,
    };
  }

  const channelPromises = channelInputs.map(async (input) => {
    if (input.startsWith('@')) {
      return ctx.youtubeApi!.getChannelByUsername(input);
    }
    const id = extractChannelId(input);
    return ctx.youtubeApi!.getChannelDetails(id);
  });

  const channelsRaw = await Promise.all(channelPromises);
  const channels = channelsRaw.filter(
    (c): c is NonNullable<typeof c> => c !== null && c !== undefined
  );

  if (channels.length < 2) {
    return {
      content: [{ type: 'text', text: 'Could not find enough channels to compare.' }],
      isError: true,
    };
  }

  channels.sort((a, b) => (b?.subscriberCount || 0) - (a?.subscriberCount || 0));

  const totalSubs = channels.reduce((sum, c) => sum + (c?.subscriberCount || 0), 0);
  const totalViews = channels.reduce((sum, c) => sum + (c?.viewCount || 0), 0);

  const comparison = channels
    .map((c, i) => {
      if (!c) return '';
      const viewsPerSub =
        c.subscriberCount > 0 ? (c.viewCount / c.subscriberCount).toFixed(1) : '0';
      return `**${i + 1}. ${c.title}**${c.customUrl ? ` (@${c.customUrl})` : ''}
   Subscribers: ${formatNumber(c.subscriberCount)} | Videos: ${formatNumber(c.videoCount)}
   Total Views: ${formatNumber(c.viewCount)} | Views/Sub: ${viewsPerSub}
   Country: ${c.country || 'N/A'}`;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `**Channel Comparison** (${channels.length} channels)\n\nTotal subscribers: ${formatNumber(totalSubs)}\nTotal views: ${formatNumber(totalViews)}\n\n${comparison}`,
      },
    ],
  };
});

// ============================================
// analyze_comments_sentiment
// ============================================
handlers.set('analyze_comments_sentiment', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const maxComments = Math.min(Math.max((args?.maxComments as number) || 50, 10), 100);

  const comments = await ctx.youtubeApi!.getVideoComments(videoId, {
    maxResults: maxComments,
    order: 'relevance',
  });

  if (comments.length === 0) {
    return { content: [{ type: 'text', text: 'No comments found for this video.' }] };
  }

  const positiveWords = [
    'love',
    'great',
    'amazing',
    'awesome',
    'excellent',
    'best',
    'fantastic',
    'perfect',
    'beautiful',
    'wonderful',
    'helpful',
    'thanks',
    'thank you',
    '❤️',
    '👍',
    '🔥',
    '😍',
    '💯',
  ];
  const negativeWords = [
    'hate',
    'bad',
    'terrible',
    'worst',
    'awful',
    'horrible',
    'disappointing',
    'waste',
    'boring',
    'clickbait',
    'scam',
    'fake',
    '👎',
    '😡',
    '🤮',
  ];

  let positive = 0;
  let negative = 0;
  let neutral = 0;
  const positiveExamples: string[] = [];
  const negativeExamples: string[] = [];

  for (const comment of comments) {
    const text = comment.textOriginal.toLowerCase();
    const hasPositive = positiveWords.some((w) => text.includes(w.toLowerCase()));
    const hasNegative = negativeWords.some((w) => text.includes(w.toLowerCase()));

    if (hasPositive && !hasNegative) {
      positive++;
      if (positiveExamples.length < 2)
        positiveExamples.push(comment.textOriginal.substring(0, 100));
    } else if (hasNegative && !hasPositive) {
      negative++;
      if (negativeExamples.length < 2)
        negativeExamples.push(comment.textOriginal.substring(0, 100));
    } else {
      neutral++;
    }
  }

  const total = comments.length;
  const positivePercent = ((positive / total) * 100).toFixed(1);
  const negativePercent = ((negative / total) * 100).toFixed(1);
  const neutralPercent = ((neutral / total) * 100).toFixed(1);

  let sentimentScore = 'Mixed';
  if (positive > negative * 2) sentimentScore = '😊 Very Positive';
  else if (positive > negative) sentimentScore = '🙂 Positive';
  else if (negative > positive * 2) sentimentScore = '😞 Very Negative';
  else if (negative > positive) sentimentScore = '😕 Negative';

  return {
    content: [
      {
        type: 'text',
        text: `**Comment Sentiment Analysis** (${total} comments)\n\n**Overall: ${sentimentScore}**\n\n• 👍 Positive: ${positive} (${positivePercent}%)\n• 👎 Negative: ${negative} (${negativePercent}%)\n• 😐 Neutral: ${neutral} (${neutralPercent}%)\n\n${positiveExamples.length > 0 ? `**Sample Positive:**\n"${positiveExamples[0]}..."\n\n` : ''}${negativeExamples.length > 0 ? `**Sample Negative:**\n"${negativeExamples[0]}..."` : ''}`,
      },
    ],
  };
});

// ============================================
// get_comment_replies
// ============================================
handlers.set('get_comment_replies', async (args, ctx) => {
  const commentId = args?.commentId as string;
  const maxResults = (args?.maxResults as number) || 20;

  const replies = await ctx.youtubeApi!.getCommentReplies(commentId, maxResults);

  if (replies.length === 0) {
    return { content: [{ type: 'text', text: 'No replies found for this comment.' }] };
  }

  const formatted = replies
    .map(
      (r) =>
        `**${r.authorDisplayName}** (${formatNumber(r.likeCount)} likes)\n${r.textOriginal.substring(0, 200)}${r.textOriginal.length > 200 ? '...' : ''}`
    )
    .join('\n\n---\n\n');

  return {
    content: [{ type: 'text', text: `**Replies** (${replies.length} found)\n\n${formatted}` }],
  };
});

// ============================================
// get_video_stats_history
// ============================================
handlers.set('get_video_stats_history', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const video = await ctx.youtubeApi!.getVideoDetails(videoId);

  if (!video) {
    return { content: [{ type: 'text', text: `Video not found: ${videoId}` }], isError: true };
  }

  const publishDate = new Date(video.publishedAt);
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
  const viewsPerDay = daysOld > 0 ? Math.round(video.viewCount / daysOld) : video.viewCount;
  const engagementRate =
    video.viewCount > 0 ? ((video.likeCount / video.viewCount) * 100).toFixed(2) : '0';
  const commentsPerView =
    video.viewCount > 0 ? ((video.commentCount / video.viewCount) * 100).toFixed(3) : '0';

  return {
    content: [
      {
        type: 'text',
        text: `**Video Statistics: ${video.title}**\n\n**Current Stats:**\n• Views: ${formatNumber(video.viewCount)}\n• Likes: ${formatNumber(video.likeCount)}\n• Comments: ${formatNumber(video.commentCount)}\n\n**Performance Metrics:**\n• Published: ${publishDate.toLocaleDateString()} (${daysOld} days ago)\n• Views/day: ${formatNumber(viewsPerDay)}\n• Engagement rate: ${engagementRate}% (likes/views)\n• Comment rate: ${commentsPerView}% (comments/views)\n\nhttps://youtube.com/watch?v=${videoId}`,
      },
    ],
  };
});

// ============================================
// get_video_metadata_bulk
// ============================================
handlers.set('get_video_metadata_bulk', async (args, ctx) => {
  const videoIds = (args?.videoIds as string[]) || [];
  const includeStats = args?.includeStats !== false;

  if (videoIds.length === 0) {
    return {
      content: [{ type: 'text', text: 'Please provide at least one video ID.' }],
      isError: true,
    };
  }

  if (videoIds.length > 50) {
    return {
      content: [{ type: 'text', text: 'Maximum 50 videos allowed per request.' }],
      isError: true,
    };
  }

  const cleanIds = videoIds.map((id) => extractVideoId(id));
  const videos = await ctx.youtubeApi!.getMultipleVideoDetails(cleanIds);

  if (videos.length === 0) {
    return {
      content: [{ type: 'text', text: 'No videos found for the provided IDs.' }],
      isError: true,
    };
  }

  // Calculate totals
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
  const totalLikes = videos.reduce((sum, v) => sum + v.likeCount, 0);

  // Parse durations and calculate total
  let totalDurationSeconds = 0;
  for (const v of videos) {
    const match = v.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const mins = parseInt(match[2] || '0', 10);
      const secs = parseInt(match[3] || '0', 10);
      totalDurationSeconds += hours * 3600 + mins * 60 + secs;
    }
  }

  const totalDuration = formatTime(totalDurationSeconds);

  const formatted = videos
    .map((v, i) => {
      const durationMatch = v.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      let durationStr = 'Unknown';
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || '0', 10);
        const mins = parseInt(durationMatch[2] || '0', 10);
        const secs = parseInt(durationMatch[3] || '0', 10);
        durationStr =
          hours > 0
            ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            : `${mins}:${secs.toString().padStart(2, '0')}`;
      }

      let line = `${i + 1}. **${v.title}**\n   ${v.channelTitle} | ${durationStr}`;
      if (includeStats) {
        line += ` | ${formatNumber(v.viewCount)} views | ${formatNumber(v.likeCount)} likes`;
      }
      line += `\n   https://youtube.com/watch?v=${v.id}`;
      return line;
    })
    .join('\n\n');

  const header =
    `**Bulk Video Metadata** (${videos.length}/${videoIds.length} found)\n\n` +
    `Total duration: ${totalDuration}\n` +
    (includeStats
      ? `Total views: ${formatNumber(totalViews)} | Total likes: ${formatNumber(totalLikes)}\n\n`
      : '\n');

  return { content: [{ type: 'text', text: header + formatted }] };
});

// ============================================
// get_playlist_summary
// ============================================
handlers.set('get_playlist_summary', async (args, ctx) => {
  const playlistId = extractPlaylistId(args?.playlistId as string);
  const includeTopics = args?.includeTopics !== false;

  const [playlist, items] = await Promise.all([
    ctx.youtubeApi!.getPlaylistDetails(playlistId),
    ctx.youtubeApi!.getPlaylistItems(playlistId, 50),
  ]);

  if (!playlist) {
    return {
      content: [{ type: 'text', text: `Playlist not found: ${playlistId}` }],
      isError: true,
    };
  }

  // Get video details for stats
  const videoIds = items.map((item) => item.videoId).filter(Boolean);
  const videoDetails =
    videoIds.length > 0 ? await ctx.youtubeApi!.getMultipleVideoDetails(videoIds) : [];

  // Calculate totals
  const totalViews = videoDetails.reduce((sum, v) => sum + v.viewCount, 0);
  const totalLikes = videoDetails.reduce((sum, v) => sum + v.likeCount, 0);
  const avgViews = videoDetails.length > 0 ? Math.round(totalViews / videoDetails.length) : 0;

  // Calculate total duration
  let totalDurationSeconds = 0;
  for (const v of videoDetails) {
    const match = v.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const mins = parseInt(match[2] || '0', 10);
      const secs = parseInt(match[3] || '0', 10);
      totalDurationSeconds += hours * 3600 + mins * 60 + secs;
    }
  }

  const totalDuration = formatTime(totalDurationSeconds);
  const avgDuration =
    videoDetails.length > 0
      ? formatTime(Math.round(totalDurationSeconds / videoDetails.length))
      : '0:00';

  // Extract topics from video titles if requested
  let topicsSection = '';
  if (includeTopics && videoDetails.length > 0) {
    // Extract common words/phrases from titles
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'it',
      'as',
      'be',
      'this',
      'that',
      'how',
      'what',
      'why',
      'when',
      'part',
      'episode',
      'ep',
      'chapter',
    ]);

    for (const v of videoDetails) {
      const words = v.title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Get top topics (words appearing in multiple videos)
    const topics = Array.from(wordCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);

    if (topics.length > 0) {
      topicsSection = `\n**Topics Covered:**\n${topics.map((t) => `• ${t}`).join('\n')}\n`;
    }
  }

  // Find most viewed and longest videos
  let keyVideosSection = '';
  if (videoDetails.length > 0) {
    const mostViewed = videoDetails.reduce(
      (max, v) => (v.viewCount > max.viewCount ? v : max),
      videoDetails[0]
    );
    const sorted = [...videoDetails].sort((a, b) => {
      const getDuration = (d: string) => {
        const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!m) return 0;
        return (
          parseInt(m[1] || '0', 10) * 3600 +
          parseInt(m[2] || '0', 10) * 60 +
          parseInt(m[3] || '0', 10)
        );
      };
      return getDuration(b.duration) - getDuration(a.duration);
    });
    const longest = sorted[0];

    keyVideosSection =
      `\n**Key Videos:**\n` +
      `• Most Viewed: "${mostViewed.title}" (${formatNumber(mostViewed.viewCount)} views)\n` +
      `• Longest: "${longest.title}"`;
  }

  // First 5 videos preview
  const previewItems = items
    .slice(0, 5)
    .map((item, i) => `${i + 1}. ${item.title}`)
    .join('\n');

  return {
    content: [
      {
        type: 'text',
        text:
          `**Playlist Summary: ${playlist.title}**\nBy: ${playlist.channelTitle}\n\n` +
          `**Overview:**\n` +
          `• Videos: ${playlist.itemCount}\n` +
          `• Total Duration: ${totalDuration}\n` +
          `• Avg Video Length: ${avgDuration}\n` +
          `• Total Views: ${formatNumber(totalViews)}\n` +
          `• Avg Views/Video: ${formatNumber(avgViews)}\n` +
          topicsSection +
          keyVideosSection +
          `\n\n**First ${Math.min(5, items.length)} Videos:**\n${previewItems}\n\n` +
          `https://youtube.com/playlist?list=${playlistId}`,
      },
    ],
  };
});

export const apiHandlers: HandlerModule = {
  handlers,
  requiresApiKey: true,
};
