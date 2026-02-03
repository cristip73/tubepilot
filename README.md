# TubePilot

> Your AI Co-Pilot for YouTube

TubePilot is an MCP server that lets Claude understand YouTube. Extract transcripts, analyze channels, compare videos, and more - **no API key required** for core features.

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

That's it! No API key needed for transcript features.

## What You Can Do

**Summarize any video:**
```
"Summarize this video: https://youtube.com/watch?v=dQw4w9WgXcQ"
```

**Ask questions about video content:**
```
"What does this video say about machine learning?"
```

**Find specific moments:**
```
"When do they talk about pricing in this video?"
```

**Analyze a channel:**
```
"Analyze @mkbhd's channel - posting frequency, avg views, top videos"
```

**Compare videos:**
```
"Compare these two videos and tell me which performed better"
```

**Export a playlist:**
```
"Export my Watch Later playlist to JSON"
```

## Tools

### Core Tools (No API Key)

| Tool | Description |
|------|-------------|
| `get_transcript` | Extract full video transcript with optional timestamps |
| `search_in_transcript` | Find specific words/moments in a video |

### Extended Tools (Requires API Key)

| Tool | Description |
|------|-------------|
| `search_videos` | Search YouTube for videos, channels, playlists |
| `get_video_details` | Full video metadata, stats, tags, duration |
| `get_video_chapters` | Extract chapter markers from video |
| `get_video_comments` | Fetch video comments |
| `get_channel_info` | Channel stats and description |
| `get_channel_videos` | List videos from a channel |
| `analyze_channel` | Deep analytics: posting frequency, avg views, top content |
| `get_playlist` | Get playlist contents |
| `export_playlist` | Export playlist to JSON format |
| `get_trending` | Trending videos by region/category |
| `get_categories` | List YouTube categories (for trending filter) |
| `get_related_videos` | Find similar videos |
| `compare_videos` | Side-by-side stats comparison |

## Optional: Enable All Features

For search, metadata, and analytics features, add a YouTube API key:

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
# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Test
npm test

# Format code
npm run format
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
