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

**Analyze a channel (requires API key):**
```
"Analyze @mkbhd's channel - posting frequency, avg views, top videos"
```

**Compare videos (requires API key):**
```
"Compare these two videos and tell me which performed better"
```

## Tools

### Free Tools (No API Key)

| Tool | Description |
|------|-------------|
| `get_video_info` | Get video title, description, channel, duration, keywords |
| `get_transcript` | Extract full video transcript (requires captions enabled) |
| `search_in_transcript` | Find specific words/moments by timestamp |

### Extended Tools (Requires API Key)

| Tool | Description |
|------|-------------|
| `search_videos` | Search YouTube for videos, channels, playlists |
| `get_video_details` | Full stats: views, likes, comments, tags |
| `get_video_chapters` | Extract chapter markers from description |
| `get_video_comments` | Fetch top/recent comments |
| `get_channel_info` | Channel subscribers, video count, description |
| `get_channel_videos` | List videos from a channel |
| `analyze_channel` | Deep analytics: posting frequency, avg views, top content |
| `get_playlist` | Get playlist contents |
| `export_playlist` | Export playlist to JSON format |
| `get_trending` | Trending videos by region/category |
| `get_categories` | List YouTube categories |
| `get_related_videos` | Find similar videos |
| `compare_videos` | Side-by-side stats comparison (2-10 videos) |

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
npm test         # Run tests (82 tests)
npm run format   # Format code
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
