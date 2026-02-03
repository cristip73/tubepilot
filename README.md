# TubePilot

> Your AI Co-Pilot for YouTube

TubePilot lets AI understand YouTube videos. Extract transcripts, summarize content, and search within videos - **no API key required** for core features.

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

**Get timestamped transcripts:**
```
"Get the transcript with timestamps for this video"
```

## Tools

### Core Tools (No API Key)
| Tool | Description |
|------|-------------|
| `get_transcript` | Extract full video transcript |
| `search_in_transcript` | Find specific moments/quotes |

### Extended Tools (Requires API Key)
| Tool | Description |
|------|-------------|
| `search_videos` | Search YouTube |
| `get_video_details` | Video metadata & stats |
| `get_channel_info` | Channel information |
| `get_channel_videos` | List channel uploads |
| `get_playlist` | Playlist contents |
| `get_video_comments` | Video comments |
| `get_trending` | Trending videos |

## Optional: Enable Search & More

For search and metadata features, add a YouTube API key:

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

Get a free API key at [Google Cloud Console](https://console.cloud.google.com/) → Enable YouTube Data API v3 → Create credentials.

## License

MIT
