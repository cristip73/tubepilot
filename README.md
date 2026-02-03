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

### Video Analysis (No API Key)

**Get info about any video:**
```
"What is this video about? https://youtube.com/watch?v=dQw4w9WgXcQ"
```

**Summarize or get an outline:**
```
"Summarize this video for me" | "Give me an outline of this lecture"
```

**Find specific moments:**
```
"When do they talk about pricing?" | "Find where they mention React"
```

**Analyze what happens at a timestamp:**
```
"What happens at 1:05?" → Gets transcript + visual frame together for full context
```

**Developer-focused analysis:**
```
"Extract all code snippets and commands from this tutorial"
"What tech stack is used in this video?"
```

### Comparison & Analytics (Requires API Key)

**Compare multiple videos:**
```
"Compare these 3 videos - which performed best and why?"
→ Side-by-side: views, likes, engagement rate, comments
```

**Compare YouTube channels:**
```
"Compare @mkbhd vs @LinusTechTips - subscriber counts, posting frequency, engagement"
```

**Analyze a channel:**
```
"Analyze @veritasium - posting patterns, avg views, top videos"
```

**Playlist insights:**
```
"Summarize this course playlist - total duration, topics covered, key videos"
```

**Comment sentiment:**
```
"What's the sentiment in the comments? Are people happy with this video?"
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

### Extended Tools (Requires API Key) - 22 Tools

| Tool | Description |
|------|-------------|
| **Search & Discovery** | |
| `search_videos` | Search YouTube for videos, channels, playlists |
| `get_related_videos` | Find similar videos |
| `search_by_hashtag` | Find videos with a specific hashtag |
| `get_trending` | Trending videos by region/category |
| `get_categories` | List YouTube categories |
| **Video Analysis** | |
| `get_video_details` | Full stats: views, likes, comments, tags |
| `get_video_chapters` | Extract chapter markers from description |
| `get_video_stats_history` | Get current stats with performance metrics |
| `check_live_status` | Check if video is live, upcoming, or regular |
| `get_video_metadata_bulk` | Get metadata for up to 50 videos in one call |
| `compare_videos` | Side-by-side stats comparison (2-10 videos) |
| **Channel Analysis** | |
| `get_channel_info` | Channel subscribers, video count, description |
| `get_channel_videos` | List videos from a channel |
| `get_shorts` | Get YouTube Shorts from a channel |
| `analyze_channel` | Deep analytics: posting frequency, avg views, top content |
| `compare_channels` | Compare stats of 2-5 channels side by side |
| **Playlists** | |
| `get_playlist` | Get playlist contents |
| `export_playlist` | Export playlist to JSON format |
| `get_playlist_summary` | Full analysis: duration, topics, key videos |
| **Comments** | |
| `get_video_comments` | Fetch top/recent comments |
| `get_comment_replies` | Get replies to a specific comment |
| `analyze_comments_sentiment` | Analyze positive/negative comment sentiment |

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
