# TubePilot 🎬

**Your AI Co-Pilot for YouTube** - An MCP server that gives AI assistants the power to understand YouTube videos.

TubePilot bridges the gap between AI and YouTube content. Since AI can't watch videos, TubePilot extracts transcripts, analyzes content, and provides rich video intelligence - making any YouTube video accessible to AI understanding.

## Features

### 🔍 Video Intelligence
- **Search Videos** - Find videos with filters for date, duration, and relevance
- **Video Details** - Get full metadata including stats, tags, and descriptions
- **Transcripts** - Extract complete video transcripts with timestamps
- **Search in Transcript** - Find specific moments within video content

### 📺 Channel Analytics
- **Channel Info** - Subscriber counts, video counts, descriptions
- **Channel Videos** - List videos from any channel with sorting options

### 📋 Playlist Management
- **Get Playlist** - Retrieve playlist contents and metadata

### 📈 Discovery & Trends
- **Trending Videos** - See what's popular by region and category
- **Related Videos** - Find similar content
- **Video Categories** - Browse category listings

### 💬 Community Insights
- **Video Comments** - Analyze top comments with engagement metrics

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
# Required: YouTube Data API v3 Key
YOUTUBE_API_KEY=your_api_key_here

# Optional: For playlist management features
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
```

### Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Create credentials → API Key
5. Copy the key to your `.env` file

## Usage with MCP

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "tubepilot": {
      "command": "node",
      "args": ["path/to/tubepilot/dist/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `search_videos` | Search YouTube with filters |
| `get_video_details` | Get full video metadata |
| `get_transcript` | Extract video transcript |
| `search_in_transcript` | Search within video content |
| `get_channel_info` | Get channel details |
| `get_channel_videos` | List channel's videos |
| `get_playlist` | Get playlist contents |
| `get_video_comments` | Fetch video comments |
| `get_trending` | Get trending videos |
| `get_related_videos` | Find related content |
| `get_video_categories` | List video categories |

## Examples

### Get Video Transcript
```
"Get the transcript of https://youtube.com/watch?v=dQw4w9WgXcQ"
```

### Search Videos
```
"Search for TypeScript tutorials published this month"
```

### Analyze a Channel
```
"Get info about @mkbhd channel"
```

### Find Trending Content
```
"Show me trending gaming videos in the US"
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Tech Stack

- TypeScript
- MCP SDK
- YouTube Data API v3
- youtube-transcript
- Zod (validation)
- node-cache (caching)

## License

MIT
