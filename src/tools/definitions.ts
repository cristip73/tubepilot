import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Default annotations for all TubePilot tools
// All tools are read-only (they only fetch data from YouTube, never modify anything)
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true, // Tools interact with external YouTube API
};

// Helper to create tool with annotations
function createTool(
  name: string,
  title: string,
  description: string,
  inputSchema: Tool['inputSchema']
): Tool {
  return {
    name,
    description,
    inputSchema,
    annotations: {
      title,
      ...READ_ONLY_ANNOTATIONS,
    },
  };
}

// Core tools - work WITHOUT API key
export const CORE_TOOLS: Tool[] = [
  createTool(
    'health_check',
    'Health Check',
    'Check TubePilot server health and status. Returns API key status, cache stats, and available features. Use this for debugging connectivity issues.',
    {
      type: 'object',
      properties: {},
    }
  ),
  createTool(
    'get_video_info',
    'Get Video Info',
    'Get basic information about a YouTube video: title, description, channel, duration, and keywords. Works without API key. START HERE for any video analysis - then use get_transcript for content or get_video_frames for visuals. For complete analysis in one call, use deep_analyze_video instead.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_transcript',
    'Get Transcript',
    'Extract the full transcript/captions from a YouTube video. Use this to understand video content, summarize videos, or answer questions about what was said. COMBINE WITH: get_video_frames for visual context, search_in_transcript to find specific moments, or get_video_info for metadata. TIP: Use list_caption_languages first to check available languages. Note: Only works for videos with captions enabled.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: {
          type: 'string',
          description: 'Language code (e.g., en, es, fr)',
          default: 'en',
        },
        withTimestamps: {
          type: 'boolean',
          description: 'Include timestamps for each segment',
          default: false,
        },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'search_in_transcript',
    'Search in Transcript',
    'Search for specific words or phrases within a video transcript. Returns matching segments with timestamps.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        query: { type: 'string', description: 'Text to search for in the transcript' },
        language: { type: 'string', description: 'Language code', default: 'en' },
      },
      required: ['videoId', 'query'],
    }
  ),
  createTool(
    'get_video_frames',
    'Get Video Frames',
    'Get visual frames/screenshots from a video at regular intervals. Use this to understand video content visually, especially for videos without captions (gameplay, music, documentaries). COMBINE WITH: get_transcript for text+visual analysis. For a specific timestamp, use get_video_moment instead (gets frame + transcript together). For a full timeline view, use video_timeline.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        count: { type: 'number', description: 'Number of frames to extract (1-10)', default: 5 },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_frame_at_time',
    'Get Frame at Time',
    'Get a video frame/screenshot at a specific timestamp. Use this when user asks "what happens at 1:02?" Returns an image URL that Claude can analyze with vision.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        timestamp: {
          type: 'string',
          description: 'Timestamp like "1:02" or "1:30:45" or seconds "62"',
        },
      },
      required: ['videoId', 'timestamp'],
    }
  ),
  createTool(
    'list_caption_languages',
    'List Caption Languages',
    'List all available caption/subtitle languages for a video. USE THIS FIRST before get_transcript to check language availability. Shows auto-generated vs manual captions (manual = better quality). Essential for non-English videos.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'create_clip_url',
    'Create Clip URL',
    'Generate a shareable YouTube URL that starts at a specific timestamp. Perfect for sharing specific moments in videos.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        startTime: {
          type: 'string',
          description: 'Start timestamp like "1:02" or "1:30:45" or seconds "62"',
        },
        endTime: { type: 'string', description: 'Optional end timestamp for clip range' },
      },
      required: ['videoId', 'startTime'],
    }
  ),
  createTool(
    'get_video_moment',
    'Get Video Moment',
    'COMBO TOOL: Get what\'s happening at a specific moment in a video. Returns BOTH the transcript text AND a visual frame together. Use this when user asks "what happens at 1:05?" For comparing same moment across videos, use compare_moments. For full video overview, use video_timeline.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        timestamp: {
          type: 'string',
          description: 'Timestamp like "1:02" or "1:30:45" or seconds "62"',
        },
      },
      required: ['videoId', 'timestamp'],
    }
  ),
  createTool(
    'find_moment_by_topic',
    'Find Moment by Topic',
    'Find when a specific topic is discussed in a video. Searches transcript and returns timestamps with context. Use when user asks "when do they talk about X?" Returns multiple matches with surrounding text.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        topic: { type: 'string', description: 'Topic or phrase to search for' },
        maxResults: { type: 'number', description: 'Max matches to return (1-20)', default: 5 },
      },
      required: ['videoId', 'topic'],
    }
  ),
  // === DEVELOPER TOOLS (no API key) ===
  createTool(
    'extract_code_snippets',
    'Extract Code Snippets',
    'Extract code snippets, CLI commands, and programming content from a video transcript. Perfect for developer tutorials. Detects: npm/yarn/pip commands, git commands, code patterns, file paths, URLs. COMBINE WITH: find_tech_stack for technologies used, find_github_links for repos, get_tutorial_steps for instructions. For complete dev notes, use convert_to_notes.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_tutorial_steps',
    'Get Tutorial Steps',
    'Extract step-by-step instructions from a tutorial video. Identifies numbered steps, "first/then/next" patterns, and instructional segments. COMBINE WITH: extract_code_snippets for code commands, find_github_links for source code, get_video_frames to see what they\'re doing visually.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'find_tech_stack',
    'Find Tech Stack',
    'Find technologies, frameworks, libraries, and tools mentioned in a video. Detects programming languages, frameworks (React, Vue, Django, etc.), databases, cloud services, and dev tools. Great for tech talks and tutorials.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'convert_to_notes',
    'Convert to Notes',
    'POWER TOOL: Convert a video transcript into structured markdown notes. Extracts key points, code snippets, and creates a developer-friendly summary. This combines transcript analysis + code extraction + structure detection. Use this for comprehensive tutorial documentation.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
        includeTimestamps: {
          type: 'boolean',
          description: 'Include timestamp links',
          default: true,
        },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'find_github_links',
    'Find GitHub Links',
    'Extract GitHub repositories, gists, and code resource links mentioned in a video. Searches both transcript and video description. Returns clickable links to repos, code samples, and resources.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  // === CONTENT ANALYSIS TOOLS (no API key) ===
  createTool(
    'get_video_summary',
    'Get Video Summary',
    'Generate a structured summary of a video with key points, timestamps, and main takeaways. COMBINE WITH: get_video_outline for structure, answer_from_video for specific questions, video_timeline for visual overview. For complete analysis, use deep_analyze_video instead.',
    {
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
    }
  ),
  createTool(
    'answer_from_video',
    'Answer from Video',
    'Search a video transcript to answer a specific question. Finds relevant segments and returns context. Use when user asks "does the video mention X?" COMBINE WITH: get_video_moment to see the visual at that timestamp, create_clip_url to share the exact moment.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        question: { type: 'string', description: 'The question to answer from the video content' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId', 'question'],
    }
  ),
  createTool(
    'extract_links_mentions',
    'Extract Links & Mentions',
    'Extract all URLs, product mentions, brand names, and resources referenced in a video. Searches description and transcript for links, @mentions, product names, books, courses, and tools mentioned.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_video_outline',
    'Get Video Outline',
    'Auto-detect topic structure and create an outline of a video. Identifies main sections, topic transitions, and creates a hierarchical structure with timestamps. Great for long videos and lectures.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    }
  ),
  // === ENHANCED/COMBO TOOLS (no API key) ===
  createTool(
    'merge_transcripts',
    'Merge Transcripts',
    'MULTI-VIDEO TOOL: Merge transcripts from 2-10 videos into one document. Perfect for course playlists, tutorial series, or comparing coverage of same topic. COMBINE WITH: compare_moments to see same timestamp across videos, get_playlist (API) to get video IDs from a playlist first.',
    {
      type: 'object',
      properties: {
        videoIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of video IDs or URLs (2-10 videos)',
        },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
        includeSeparators: {
          type: 'boolean',
          description: 'Add video title separators',
          default: true,
        },
      },
      required: ['videoIds'],
    }
  ),
  createTool(
    'analyze_short',
    'Analyze Short',
    'SHORTS-SPECIFIC TOOL: Specialized analysis for YouTube Shorts (<60 sec). Extracts hook timing, CTA patterns, words-per-second, hashtags, + visual frame. Use this instead of deep_analyze_video for Shorts. COMBINE WITH: get_shorts (API) to find Shorts from a channel first.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube Short video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_hd_thumbnail',
    'Get HD Thumbnail',
    'Get high-resolution thumbnail URLs for a video. Returns maxres (1280x720), sd (640x480), hq (480x360), and other quality options. Better than storyboard frames.',
    {
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
    }
  ),
  createTool(
    'detect_music',
    'Detect Music',
    'Detect if a video is a music video and parse artist/song info. Use this BEFORE get_transcript - music videos often have lyrics as captions. Returns confidence score, artist, song title, and music type (official video, lyric video, live, cover, etc.).',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_video_chapters_free',
    'Get Video Chapters (Free)',
    'Extract chapters from video description without API key. Parses timestamp markers (0:00, 1:30, etc.) and their titles. Free alternative to get_video_chapters.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'deep_analyze_video',
    'Deep Analyze Video',
    'POWER TOOL: Complete video analysis in ONE call. Combines: get_video_info + get_transcript + get_video_chapters_free + extract_links_mentions + visual frame. Returns metadata, transcript stats, chapters, links, and a mid-video frame. USE THIS FIRST for thorough analysis - then use specific tools for deep dives.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        language: { type: 'string', description: 'Transcript language code', default: 'en' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'compare_moments',
    'Compare Moments',
    'MULTI-VIDEO TOOL: Compare the same timestamp across 2-5 videos. See what different creators show/say at the same moment. Returns transcript + visual frames side by side. Great for comparing tutorials, reactions, or coverage of same event.',
    {
      type: 'object',
      properties: {
        videoIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of video IDs or URLs (2-5 videos)',
        },
        timestamp: {
          type: 'string',
          description: 'Timestamp to compare (e.g., "1:30")',
          default: '0:30',
        },
      },
      required: ['videoIds'],
    }
  ),
  createTool(
    'video_timeline',
    'Video Timeline',
    'VISUAL OVERVIEW TOOL: Generate a timeline with frames + transcript at regular intervals. Perfect for long videos, lectures, documentaries. Returns multiple images with text context. Use instead of calling get_video_frames + get_transcript separately.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        intervals: { type: 'number', description: 'Number of timeline points (3-10)', default: 5 },
      },
      required: ['videoId'],
    }
  ),
];

// API tools - require YouTube Data API key
export const API_TOOLS: Tool[] = [
  createTool(
    'search_videos',
    'Search Videos',
    'Search YouTube for videos, channels, or playlists. Returns titles, channels, and URLs. WORKFLOW: Search → compare_videos for stats → deep_analyze_video for content → merge_transcripts for combined analysis. (Requires API key)',
    {
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
    }
  ),
  createTool(
    'get_video_details',
    'Get Video Details',
    'Get full details about a YouTube video including title, description, stats, tags, and duration. (Requires API key)',
    {
      type: 'object',
      properties: {
        videoId: {
          type: 'string',
          description: 'YouTube video ID or URL',
        },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_channel_info',
    'Get Channel Info',
    'Get information about a YouTube channel including subscriber count and description. (Requires API key)',
    {
      type: 'object',
      properties: {
        channelId: {
          type: 'string',
          description: 'Channel ID, handle (@username), or channel URL',
        },
      },
      required: ['channelId'],
    }
  ),
  createTool(
    'get_channel_videos',
    'Get Channel Videos',
    'Get a list of videos from a YouTube channel. COMBINE WITH: get_video_metadata_bulk for detailed stats, merge_transcripts for combined content, compare_videos for performance comparison. (Requires API key)',
    {
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
    }
  ),
  createTool(
    'get_playlist',
    'Get Playlist',
    'Get details and videos from a YouTube playlist. COMBINE WITH: merge_transcripts to get all transcripts, get_video_metadata_bulk for stats on all videos, get_playlist_summary for full analysis. (Requires API key)',
    {
      type: 'object',
      properties: {
        playlistId: { type: 'string', description: 'Playlist ID or URL' },
        maxResults: { type: 'number', description: 'Max items to return', default: 50 },
      },
      required: ['playlistId'],
    }
  ),
  createTool(
    'get_video_comments',
    'Get Video Comments',
    'Get comments from a YouTube video. COMBINE WITH: analyze_comments_sentiment for sentiment analysis, get_comment_replies for threaded discussions. (Requires API key)',
    {
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
    }
  ),
  createTool(
    'get_trending',
    'Get Trending',
    'Get trending videos in a specific region and category. (Requires API key)',
    {
      type: 'object',
      properties: {
        regionCode: {
          type: 'string',
          description: 'Region code (e.g., US, UK, JP)',
          default: 'US',
        },
        categoryId: {
          type: 'string',
          description: 'Category ID (e.g., 10 for Music, 20 for Gaming)',
        },
        maxResults: { type: 'number', description: 'Max results (1-50)', default: 20 },
      },
    }
  ),
  createTool(
    'get_related_videos',
    'Get Related Videos',
    'Find videos related to a specific video. (Requires API key)',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        maxResults: { type: 'number', description: 'Max results', default: 10 },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_video_chapters',
    'Get Video Chapters',
    'Extract chapters/timestamps from a video description. Returns structured chapter data with times and titles. (Requires API key)',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_categories',
    'Get Categories',
    'Get list of YouTube video categories for a region. Useful for filtering trending videos. (Requires API key)',
    {
      type: 'object',
      properties: {
        regionCode: {
          type: 'string',
          description: 'Region code (e.g., US, UK, JP)',
          default: 'US',
        },
      },
    }
  ),
  createTool(
    'compare_videos',
    'Compare Videos',
    'Compare stats (views, likes, comments) of 2-10 videos side by side. Great for performance analysis. COMBINE WITH: compare_moments for content comparison, merge_transcripts for text comparison. (Requires API key)',
    {
      type: 'object',
      properties: {
        videoIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of video IDs or URLs (2-10 videos)',
        },
      },
      required: ['videoIds'],
    }
  ),
  createTool(
    'analyze_channel',
    'Analyze Channel',
    'Get detailed channel analytics including posting frequency, average views, and content breakdown. COMBINE WITH: compare_channels for competitive analysis, get_channel_videos + deep_analyze_video for top video deep dive. (Requires API key)',
    {
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
    }
  ),
  createTool(
    'export_playlist',
    'Export Playlist',
    'Export a playlist to JSON format with all video details. Perfect for backup or analysis. (Requires API key)',
    {
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
    }
  ),
  createTool(
    'check_live_status',
    'Check Live Status',
    'Check if a video is live, upcoming, or a regular video. Get live stream details like viewer count and scheduled start time. (Requires API key)',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_shorts',
    'Get Shorts',
    'Get YouTube Shorts from a channel. Shorts are vertical videos under 60 seconds. (Requires API key)',
    {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'Channel ID, handle (@username), or URL' },
        maxResults: { type: 'number', description: 'Max shorts to return (1-50)', default: 20 },
      },
      required: ['channelId'],
    }
  ),
  createTool(
    'search_by_hashtag',
    'Search by Hashtag',
    'Search for videos with a specific hashtag. Great for finding content on trending topics. (Requires API key)',
    {
      type: 'object',
      properties: {
        hashtag: { type: 'string', description: 'Hashtag to search (with or without #)' },
        maxResults: { type: 'number', description: 'Max results (1-50)', default: 20 },
      },
      required: ['hashtag'],
    }
  ),
  createTool(
    'compare_channels',
    'Compare Channels',
    'Compare statistics of multiple YouTube channels side by side. Great for competitive analysis. (Requires API key)',
    {
      type: 'object',
      properties: {
        channelIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of channel IDs, handles, or URLs (2-5 channels)',
        },
      },
      required: ['channelIds'],
    }
  ),
  createTool(
    'analyze_comments_sentiment',
    'Analyze Comments Sentiment',
    'Analyze the sentiment of video comments. Returns positive, negative, and neutral comment breakdown with examples. (Requires API key)',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
        maxComments: {
          type: 'number',
          description: 'Max comments to analyze (10-100)',
          default: 50,
        },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_comment_replies',
    'Get Comment Replies',
    'Get replies to a specific top-level comment. (Requires API key)',
    {
      type: 'object',
      properties: {
        commentId: { type: 'string', description: 'The comment ID to get replies for' },
        maxResults: { type: 'number', description: 'Max replies (1-100)', default: 20 },
      },
      required: ['commentId'],
    }
  ),
  createTool(
    'get_video_stats_history',
    'Get Video Stats History',
    'Get current statistics for a video. Note: Historical data requires external tracking. Returns current views, likes, comments with engagement metrics. (Requires API key)',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID or URL' },
      },
      required: ['videoId'],
    }
  ),
  createTool(
    'get_video_metadata_bulk',
    'Get Video Metadata Bulk',
    'Get metadata for multiple videos at once in a single efficient API call. Returns title, channel, views, likes, duration for each video. Perfect for batch analysis, playlist overviews, or comparing many videos. (Requires API key)',
    {
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
    }
  ),
  createTool(
    'get_playlist_summary',
    'Get Playlist Summary',
    'Generate a comprehensive summary of a YouTube playlist. Includes total duration, video count, topic overview, and key videos. Perfect for course playlists, tutorial series, or understanding playlist content. (Requires API key)',
    {
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
    }
  ),
];

export function getAllTools(hasApiKey: boolean): Tool[] {
  return hasApiKey ? [...CORE_TOOLS, ...API_TOOLS] : CORE_TOOLS;
}
