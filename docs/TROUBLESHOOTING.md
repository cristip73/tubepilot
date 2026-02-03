# TubePilot Troubleshooting Guide

Common issues and solutions.

---

## Connection Issues

### "TubePilot not responding"

**Check if the server is running:**
```bash
npx tubepilot
```

**Verify MCP client configuration:**
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

**Try running health check:**
```
"Run a health check on TubePilot"
```

---

## Transcript Issues

### "No captions available for this video"

**Cause:** The video doesn't have captions enabled.

**Solutions:**
1. Check if captions exist: `"What caption languages are available?"`
2. Try a different language: `"Get transcript in Spanish"`
3. Use visual analysis instead: `"Show me frames from this video"`

---

### "Transcript is garbled or inaccurate"

**Cause:** Auto-generated captions can have errors.

**Solutions:**
1. Check for manual captions: `"List caption languages"` - manual captions are marked differently
2. For music videos, lyrics may show as `[Music]` markers
3. Accept that auto-generated captions aren't perfect

---

### "Wrong language transcript"

**Solution:** Specify the language explicitly:
```
"Get the transcript in English" or "Get transcript with language: en"
```

---

## Video Access Issues

### "Video not found"

**Possible causes:**
- Video was deleted
- Video is private (not just unlisted)
- Invalid video ID
- Regional restrictions

**Check:** Can you access the video in a browser?

---

### "Cannot access this video"

**Possible causes:**
- Age-restricted video (TubePilot cannot bypass)
- Premium-only content
- Geographic restrictions

**Solutions:**
- Age-restricted: No workaround available
- Geographic: Try without the visual frame features

---

## URL Issues

### "Could not extract video ID"

**Supported formats:**
```
✓ https://youtube.com/watch?v=dQw4w9WgXcQ
✓ https://youtu.be/dQw4w9WgXcQ
✓ https://youtube.com/shorts/abc123
✓ https://youtube.com/embed/dQw4w9WgXcQ
✓ dQw4w9WgXcQ (just the ID)
```

**Not supported:**
```
✗ https://vimeo.com/... (not YouTube)
✗ https://dailymotion.com/... (not YouTube)
```

---

### "Playlist URL not working"

**Use playlist tools:**
```
"Get the videos in this playlist: [playlist_url]"
```

**Not:**
```
"Analyze this video: [playlist_url]"  ← Wrong, this is a playlist
```

---

## API Key Issues

### "API key required for this feature"

**Features requiring API key:**
- Search (`search_videos`)
- Channel analytics (`analyze_channel`, `compare_channels`)
- Comments (`get_video_comments`, `analyze_comments_sentiment`)
- Trending (`get_trending`)
- Video stats (`get_video_details`, `compare_videos`)

**Add API key to config:**
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

---

### "API quota exceeded"

**Cause:** YouTube Data API has daily quotas.

**Solutions:**
1. Wait until quota resets (midnight Pacific Time)
2. Use free tools that don't require API
3. Create a new API key/project

---

### "Invalid API key"

**Check:**
1. API key is correctly copied (no extra spaces)
2. YouTube Data API v3 is enabled in Google Cloud Console
3. API key has no restrictions blocking your IP

---

## Visual Frame Issues

### "Could not extract frame"

**Possible causes:**
- Video is too short
- Storyboards not available
- Timestamp exceeds video length

**Solutions:**
- Check video duration first
- Try a different timestamp
- Use `get_hd_thumbnail` for video thumbnail instead

---

### "Frame quality is low"

**Explanation:** Frames come from YouTube's storyboard sprites, not the actual video. Resolution is typically 160x90 pixels.

**For better quality:** Use `get_hd_thumbnail` for the video's thumbnail (up to 1280x720).

---

## Performance Issues

### "Tool is slow"

**Normal behavior:**
- First request may be slower (cache is empty)
- Subsequent requests are faster (cached)
- Long videos with transcripts take longer

**Tips:**
- Use `deep_analyze_video` instead of multiple separate calls
- Use `get_video_metadata_bulk` for multiple videos

---

### "Timeout errors"

**Cause:** Very long videos or slow network.

**Solutions:**
- Try again
- For very long videos, get outline first then analyze sections

---

## Common Mistakes

### Using wrong tool

| Want to do | Wrong tool | Right tool |
|------------|-----------|------------|
| Analyze a Short | `deep_analyze_video` | `analyze_short` |
| Get chapters (no API) | `get_video_chapters` | `get_video_chapters_free` |
| Compare video content | `compare_videos` | `compare_moments` |
| Compare video stats | `compare_moments` | `compare_videos` (API) |

---

### Expecting downloads

TubePilot **cannot** download videos or audio files. It only reads data.

**Can do:**
- Extract transcript text
- Get storyboard frames (screenshots)
- Get thumbnails

**Cannot do:**
- Download MP4/WebM video files
- Download MP3/audio files
- Download high-res frames from actual video

---

## Getting Help

### Check server status
```
"Run health check"
```

### Report issues
Open an issue at: https://github.com/ixex/tubepilot/issues

Include:
- Video URL (if applicable)
- Error message
- What you were trying to do
- Node.js version
- MCP client you're using
