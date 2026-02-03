import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Core tools - work WITHOUT API key
export const CORE_TOOLS: Tool[] = [
  {
    name: 'health_check',
    description:
      'Check TubePilot server health and status. Returns API key status, cache stats, and available features. Use this for debugging connectivity issues.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
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
  {
    name: 'list_caption_languages',
    description:
      'List all available caption/subtitle languages for a video. Use this before fetching transcripts to know which languages are available.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'create_clip_url',
    description:
      'Generate a shareable YouTube URL that starts at a specific timestamp. Perfect for sharing specific moments in videos.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        startTime: { type: 'string', description: 'Start timestamp like "1:02" or "1:30:45" or seconds "62"' },
        endTime: { type: 'string', description: 'Optional end timestamp for clip range' },
      },
      required: ['videoId', 'startTime'],
    },
  },
  {
    name: 'get_video_moment',
    description:
      'Get what\'s happening at a specific moment in a video. Returns BOTH the transcript text being spoken AND a visual storyboard frame. Use this when user asks "what happens at 1:05?" - you get text + image to analyze together.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        timestamp: { type: 'string', description: 'Timestamp like "1:02" or "1:30:45" or seconds "62"' },
      },
      required: ['videoId', 'timestamp'],
    },
  },
  {
    name: 'find_moment_by_topic',
    description:
      'Find when a specific topic is discussed in a video. Searches transcript and returns timestamps with context. Use when user asks "when do they talk about X?" Returns multiple matches with surrounding text.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        topic: { type: 'string', description: 'Topic or phrase to search for' },
        maxResults: { type: 'number', description: 'Max matches to return (1-20)', default: 5 },
      },
      required: ['videoId', 'topic'],
    },
  },
  // === DEVELOPER TOOLS (no API key) ===
  {
    name: 'extract_code_snippets',
    description:
      'Extract code snippets, CLI commands, and programming content from a video transcript. Perfect for developer tutorials. Detects: npm/yarn/pip commands, git commands, code patterns, file paths, URLs. Returns timestamped code blocks.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_tutorial_steps',
    description:
      'Extract step-by-step instructions from a tutorial video. Identifies numbered steps, "first/then/next" patterns, and instructional segments. Perfect for following along with coding tutorials.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'find_tech_stack',
    description:
      'Find technologies, frameworks, libraries, and tools mentioned in a video. Detects programming languages, frameworks (React, Vue, Django, etc.), databases, cloud services, and dev tools. Great for tech talks and tutorials.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'convert_to_notes',
    description:
      'Convert a video transcript into structured markdown notes. Extracts key points, code snippets, and creates a developer-friendly summary. Ideal for saving tutorial content as documentation.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
        includeTimestamps: { type: 'boolean', description: 'Include timestamp links', default: true },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'find_github_links',
    description:
      'Extract GitHub repositories, gists, and code resource links mentioned in a video. Searches both transcript and video description. Returns clickable links to repos, code samples, and resources.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  // === CONTENT ANALYSIS TOOLS (no API key) ===
  {
    name: 'get_video_summary',
    description:
      'Generate a structured summary of a video with key points, timestamps, and main takeaways. Perfect for quickly understanding video content without watching. Returns bullet points and highlights.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
        style: {
          type: 'string',
          enum: ['brief', 'detailed', 'bullet-points'],
          description: 'Summary style',
          default: 'bullet-points',
        },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'answer_from_video',
    description:
      'Search a video transcript to answer a specific question. Finds relevant segments and returns context needed to answer the question. Use this when user asks "does the video mention X?" or "what does the video say about Y?"',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        question: { type: 'string', description: 'The question to answer from the video content' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId', 'question'],
    },
  },
  {
    name: 'extract_links_mentions',
    description:
      'Extract all URLs, product mentions, brand names, and resources referenced in a video. Searches description and transcript for links, @mentions, product names, books, courses, and tools mentioned.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_video_outline',
    description:
      'Auto-detect topic structure and create an outline of a video. Identifies main sections, topic transitions, and creates a hierarchical structure with timestamps. Great for long videos and lectures.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    },
  },
  // === ENHANCED/COMBO TOOLS (no API key) ===
  {
    name: 'merge_transcripts',
    description:
      'Merge transcripts from multiple videos into one document. Perfect for playlists, course series, or comparing similar content. Combines 2-10 videos with separators.',
    inputSchema: {
      type: 'object',
      properties: {
        videoIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of video IDs or URLs (2-10 videos)',
        },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
        includeSeparators: { type: 'boolean', description: 'Add video title separators', default: true },
      },
      required: ['videoIds'],
    },
  },
  {
    name: 'analyze_short',
    description:
      'Specialized analysis for YouTube Shorts (videos under 60 seconds). Extracts hook, CTA patterns, words-per-second, hashtags, and provides a visual frame. Perfect for Shorts creators.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube Short video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_hd_thumbnail',
    description:
      'Get high-resolution thumbnail URLs for a video. Returns maxres (1280x720), sd (640x480), hq (480x360), and other quality options. Better than storyboard frames.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        quality: {
          type: 'string',
          enum: ['maxres', 'sd', 'hq', 'mq', 'default'],
          description: 'Thumbnail quality',
          default: 'maxres',
        },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'detect_music',
    description:
      'Detect if a video is a music video. Analyzes title patterns, keywords, channel name, and duration to determine if content is music. Parses artist and song name when possible.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_video_chapters_free',
    description:
      'Extract chapters from video description without API key. Parses timestamp markers (0:00, 1:30, etc.) and their titles. Free alternative to get_video_chapters.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'deep_analyze_video',
    description:
      'POWER TOOL: Complete video analysis combining info, transcript, chapters, links, and visual frame. Returns everything Claude needs to understand a video in one call. Best for thorough analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'compare_moments',
    description:
      'Compare the same timestamp across multiple videos. See what different creators show/say at the same point. Returns transcript + visual frames for 2-5 videos side by side.',
    inputSchema: {
      type: 'object',
      properties: {
        videoIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of video IDs or URLs (2-5 videos)',
        },
        timestamp: { type: 'string', description: 'Timestamp to compare (e.g., "1:30")', default: '0:30' },
      },
      required: ['videoIds'],
    },
  },
  {
    name: 'video_timeline',
    description:
      'Generate a visual timeline of a video with frames and transcript excerpts at regular intervals. Perfect for getting an overview of long videos. Returns multiple images + text.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        intervals: { type: 'number', description: 'Number of timeline points (3-10)', default: 5 },
      },
      required: ['videoId'],
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
  {
    name: 'check_live_status',
    description:
      'Check if a video is live, upcoming, or a regular video. Get live stream details like viewer count and scheduled start time. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_shorts',
    description:
      'Get YouTube Shorts from a channel. Shorts are vertical videos under 60 seconds. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Channel ID, handle (@username), or URL' },
        maxResults: { type: 'number', description: 'Max shorts to return (1-50)', default: 20 },
      },
      required: ['channelId'],
    },
  },
  {
    name: 'search_by_hashtag',
    description:
      'Search for videos with a specific hashtag. Great for finding content on trending topics. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        hashtag: { type: 'string', description: 'Hashtag to search (with or without #)' },
        maxResults: { type: 'number', description: 'Max results (1-50)', default: 20 },
      },
      required: ['hashtag'],
    },
  },
  {
    name: 'compare_channels',
    description:
      'Compare statistics of multiple YouTube channels side by side. Great for competitive analysis. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        channelIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of channel IDs, handles, or URLs (2-5 channels)',
        },
      },
      required: ['channelIds'],
    },
  },
  {
    name: 'analyze_comments_sentiment',
    description:
      'Analyze the sentiment of video comments. Returns positive, negative, and neutral comment breakdown with examples. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        maxComments: { type: 'number', description: 'Max comments to analyze (10-100)', default: 50 },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_comment_replies',
    description:
      'Get replies to a specific top-level comment. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: { type: 'string', description: 'The comment ID to get replies for' },
        maxResults: { type: 'number', description: 'Max replies (1-100)', default: 20 },
      },
      required: ['commentId'],
    },
  },
  {
    name: 'get_video_stats_history',
    description:
      'Get current statistics for a video. Note: Historical data requires external tracking. Returns current views, likes, comments with engagement metrics. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    },
  },
  {
    name: 'get_video_metadata_bulk',
    description:
      'Get metadata for multiple videos at once in a single efficient API call. Returns title, channel, views, likes, duration for each video. Perfect for batch analysis, playlist overviews, or comparing many videos. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        videoIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of video IDs or URLs (up to 50 videos)',
        },
        includeStats: {
          type: 'boolean',
          description: 'Include view count, likes, comments',
          default: true,
        },
      },
      required: ['videoIds'],
    },
  },
  {
    name: 'get_playlist_summary',
    description:
      'Generate a comprehensive summary of a YouTube playlist. Includes total duration, video count, topic overview, and key videos. Perfect for course playlists, tutorial series, or understanding playlist content. (Requires API key)',
    inputSchema: {
      type: 'object',
      properties: {
        playlistId: { type: 'string', description: 'Playlist ID or URL' },
        includeTopics: {
          type: 'boolean',
          description: 'Extract topics from video titles',
          default: true,
        },
      },
      required: ['playlistId'],
    },
  },
];

export function getAllTools(hasApiKey: boolean): Tool[] {
  return hasApiKey ? [...CORE_TOOLS, ...API_TOOLS] : CORE_TOOLS;
}
