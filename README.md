# TubePilot

> Your AI Co-Pilot for YouTube

TubePilot bridges the gap between AI and YouTube content. Extract transcripts, analyze videos, discover trends, and make any YouTube video accessible to AI understanding.

## Installation

### Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tubepilot": {
      "command": "npx",
      "args": ["-y", "tubepilot"],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **YouTube Data API v3**
4. Create credentials → API Key
5. Add the key to your configuration

## Tools

### Video Intelligence
- **search_videos** - Search YouTube with filters (date, duration, relevance)
- **get_video_details** - Get full video metadata, stats, and tags
- **get_transcript** - Extract complete video transcripts
- **search_in_transcript** - Find specific moments in video content

### Channels & Playlists
- **get_channel_info** - Channel stats and description
- **get_channel_videos** - List videos from a channel
- **get_playlist** - Get playlist contents

### Discovery
- **get_trending** - Trending videos by region/category
- **get_related_videos** - Find similar content
- **get_video_comments** - Analyze video comments

## Usage Examples

**Understand a video without watching:**
```
"Summarize this video: https://youtube.com/watch?v=..."
```

**Research a topic:**
```
"Find the top 5 TypeScript tutorial videos from this month"
```

**Analyze a channel:**
```
"What kind of content does @mkbhd post?"
```

**Find specific content:**
```
"Search for where they mention 'machine learning' in this video transcript"
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start
```

## License

MIT
