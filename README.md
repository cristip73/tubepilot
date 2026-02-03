# TubePilot

> Your AI Co-Pilot for YouTube

TubePilot is an MCP server that lets Claude fetch and analyze YouTube data. Get video info, extract transcripts, analyze channels, compare videos, and more.

## Installation

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tubepilot": {
      "command": "npx",
      "args": ["-y", "tubepilot"]
    }
  }
}
```

**No API key required** for basic video info and transcripts!

## What You Can Do

**Get info about any video (no API key):**
```
"What is this video about? https://youtube.com/watch?v=dQw4w9WgXcQ"
```

**Summarize video content:**
```
"Summarize this video for me"
```

**Find specific moments:**
```
"When do they talk about pricing in this video?"
```

**Analyze what happens at a timestamp:**
```
"What happens at 1:05 in this video?" → Gets transcript + visual frame together
```

**Analyze a channel (requires API key):**
```
"Analyze @mkbhd's channel - posting frequency, avg views, top videos"
```

**Compare videos (requires API key):**
```
"Compare these two videos and tell me which performed better"
```

## Tools

### Free Tools (No API Key) - 19 Tools

| Tool | Description |
|------|-------------|
| `health_check` | Check server health, API status, cache stats |
| `get_video_info` | Get video title, description, channel, duration, keywords |
| `get_transcript` | Extract full video transcript (requires captions enabled) |
| `search_in_transcript` | Find specific words/moments by timestamp |
| `get_video_frames` | Get visual frames/screenshots at regular intervals |
| `get_frame_at_time` | Get a video frame at a specific timestamp |
| `list_caption_languages` | List all available caption/subtitle languages |
| `create_clip_url` | Generate shareable timestamped URLs |
| `get_video_moment` | **Power tool**: Get transcript + visual frame at a timestamp together |
| `find_moment_by_topic` | Find when a topic is discussed, with clickable timestamps |
| **Developer Tools** | |
| `extract_code_snippets` | Find CLI commands, code patterns, file paths in tutorials |
| `get_tutorial_steps` | Auto-extract step-by-step instructions from tutorials |
| `find_tech_stack` | Detect technologies, frameworks, libraries mentioned |
| `convert_to_notes` | Convert video transcript to structured markdown notes |
| `find_github_links` | Extract GitHub repos, npm packages, code resource links |
| **Content Analysis** | |
| `get_video_summary` | Generate key points and structured summary |
| `answer_from_video` | Q&A - find relevant segments to answer questions |
| `extract_links_mentions` | Find URLs, @mentions, products, books referenced |
| `get_video_outline` | Auto-detect topic structure and create outline |

### Extended Tools (Requires API Key) - 20 Tools

| Tool | Description |
|------|-------------|
| `search_videos` | Search YouTube for videos, channels, playlists |
| `get_video_details` | Full stats: views, likes, comments, tags |
| `get_video_chapters` | Extract chapter markers from description |
| `get_video_comments` | Fetch top/recent comments |
| `get_comment_replies` | Get replies to a specific comment |
| `get_channel_info` | Channel subscribers, video count, description |
| `get_channel_videos` | List videos from a channel |
| `analyze_channel` | Deep analytics: posting frequency, avg views, top content |
| `compare_channels` | Compare stats of 2-5 channels side by side |
| `get_playlist` | Get playlist contents |
| `export_playlist` | Export playlist to JSON format |
| `get_trending` | Trending videos by region/category |
| `get_categories` | List YouTube categories |
| `get_related_videos` | Find similar videos |
| `compare_videos` | Side-by-side stats comparison (2-10 videos) |
| `check_live_status` | Check if video is live, upcoming, or regular |
| `get_shorts` | Get YouTube Shorts from a channel |
| `search_by_hashtag` | Find videos with a specific hashtag |
| `analyze_comments_sentiment` | Analyze positive/negative comment sentiment |
| `get_video_stats_history` | Get current stats with performance metrics |

## Limitations

**TubePilot is a data reader, not a downloader or uploader:**

- ❌ Cannot download videos or audio
- ❌ Cannot upload, like, comment, or subscribe
- ❌ Cannot access private videos or watch history
- ❌ Cannot get transcripts for videos without captions
- ❌ Cannot access monetization/revenue data

## Optional: Enable All Features

For search, detailed stats, and analytics, add a YouTube API key:

```json
{
  "mcpServers": {
    "tubepilot": {
      "command": "npx",
      "args": ["-y", "tubepilot"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key"
      }
    }
  }
}
```

**Get a free API key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable "YouTube Data API v3"
4. Create credentials → API Key

## Development

```bash
npm install      # Install dependencies
npm run dev      # Run in development
npm run build    # Build for production
npm test         # Run tests (113 tests)
npm run format   # Format code
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
