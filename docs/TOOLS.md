# TubePilot Tools Reference

Complete documentation for all 49 tools.

---

## Free Tools (No API Key Required)

### Core Tools

#### `health_check`
Check server health and status.

```
"Is TubePilot working?"
```

**Returns:** API status, cache stats, tool counts

---

#### `get_video_info`
Get basic video metadata.

```
"What is this video? https://youtube.com/watch?v=dQw4w9WgXcQ"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL

**Returns:** Title, description, channel, duration, keywords

**Tip:** Start here for any video analysis, then use other tools for deeper analysis.

---

#### `get_transcript`
Extract full video transcript/captions.

```
"Get the transcript of this video"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Language code (default: "en")
- `withTimestamps` (optional): Include timestamps (default: false)

**Returns:** Full transcript text, segments with timestamps

**Tip:** Use `list_caption_languages` first to check available languages.

---

#### `search_in_transcript`
Find specific words/phrases in a video.

```
"When do they mention 'pricing' in this video?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `query` (required): Text to search for
- `language` (optional): Language code

**Returns:** Matching segments with timestamps and context

---

#### `get_video_frames`
Get visual screenshots at regular intervals.

```
"Show me frames from this video"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `count` (optional): Number of frames 1-10 (default: 5)

**Returns:** Storyboard frame images

**Use when:** Video has no captions (gameplay, music, visual content)

---

#### `get_frame_at_time`
Get a screenshot at a specific timestamp.

```
"What's shown at 2:30 in this video?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `timestamp` (required): Time like "1:30" or "90" (seconds)

**Returns:** Single frame image at that timestamp

---

#### `list_caption_languages`
List available subtitle languages.

```
"What languages are available for this video?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL

**Returns:** List of language codes, auto-generated vs manual indicator

**Tip:** Manual captions are higher quality than auto-generated.

---

#### `create_clip_url`
Generate a shareable timestamped link.

```
"Create a link starting at 1:30"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `startTime` (required): Start timestamp
- `endTime` (optional): End timestamp

**Returns:** Shareable YouTube URL with timestamp

---

#### `get_video_moment`
**COMBO TOOL:** Get transcript + visual frame together.

```
"What happens at 1:05 in this video?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `timestamp` (required): Time like "1:05"

**Returns:** Transcript text being spoken + visual frame image

**Best for:** Understanding exactly what's happening at a specific moment.

---

#### `find_moment_by_topic`
Find when a topic is discussed.

```
"When do they talk about machine learning?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `topic` (required): Topic to search for
- `maxResults` (optional): Max matches (default: 5)

**Returns:** Timestamps with context, clickable links

---

### Developer Tools

#### `extract_code_snippets`
Find code and commands in tutorials.

```
"Extract all the code from this tutorial"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Transcript language

**Detects:**
- npm/yarn/pip commands
- git commands
- Code patterns
- File paths
- URLs

**Returns:** Timestamped code blocks

---

#### `get_tutorial_steps`
Extract step-by-step instructions.

```
"What are the steps in this tutorial?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Transcript language

**Detects:** Numbered steps, "first/then/next" patterns

**Returns:** Ordered list of steps with timestamps

---

#### `find_tech_stack`
Detect technologies mentioned.

```
"What tech stack is used in this video?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Transcript language

**Detects:** Languages, frameworks, databases, cloud services, tools

**Returns:** Categorized list of technologies

---

#### `convert_to_notes`
**POWER TOOL:** Convert video to markdown notes.

```
"Turn this tutorial into notes I can save"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Transcript language
- `includeTimestamps` (optional): Include timestamp links (default: true)

**Returns:** Structured markdown with key points, code snippets, sections

---

#### `find_github_links`
Extract GitHub and code resource links.

```
"Find all the GitHub repos mentioned"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL

**Returns:** GitHub repos, gists, npm packages, code resources

---

### Content Analysis Tools

#### `get_video_summary`
Generate a structured summary.

```
"Summarize this video for me"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Transcript language
- `style` (optional): "brief", "detailed", or "bullet-points"

**Returns:** Key points, timestamps, main takeaways

---

#### `answer_from_video`
Q&A from video content.

```
"Does this video explain how to deploy to AWS?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `question` (required): Your question
- `language` (optional): Transcript language

**Returns:** Relevant segments that answer the question

---

#### `extract_links_mentions`
Find URLs and mentions.

```
"What products/tools are mentioned in this video?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Transcript language

**Returns:** URLs, @mentions, products, books, courses

---

#### `get_video_outline`
Auto-detect video structure.

```
"Give me an outline of this lecture"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Transcript language

**Returns:** Hierarchical outline with timestamps

---

### Enhanced/Combo Tools

#### `deep_analyze_video`
**POWER TOOL:** Complete analysis in one call.

```
"Analyze this video thoroughly"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `language` (optional): Transcript language

**Combines:** get_video_info + get_transcript + chapters + links + visual frame

**Returns:** Metadata, transcript stats, chapters, links, mid-video frame

**Best for:** When you want everything about a video.

---

#### `video_timeline`
**VISUAL OVERVIEW:** Timeline with frames + transcript.

```
"Show me a timeline of this video"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `intervals` (optional): Number of points 3-10 (default: 5)

**Returns:** Multiple frames with transcript excerpts at intervals

**Best for:** Long videos, lectures, documentaries.

---

#### `compare_moments`
**MULTI-VIDEO:** Compare same timestamp across videos.

```
"Compare what these tutorials show at the 5 minute mark"
```

**Parameters:**
- `videoIds` (required): Array of 2-5 video IDs/URLs
- `timestamp` (optional): Time to compare (default: "0:30")

**Returns:** Transcript + frames for each video at that timestamp

---

#### `merge_transcripts`
**MULTI-VIDEO:** Combine transcripts from multiple videos.

```
"Merge the transcripts from this playlist"
```

**Parameters:**
- `videoIds` (required): Array of 2-10 video IDs/URLs
- `language` (optional): Transcript language
- `includeSeparators` (optional): Add video title separators

**Returns:** Combined transcript document

---

#### `analyze_short`
**SHORTS-SPECIFIC:** Analysis for YouTube Shorts.

```
"Analyze this YouTube Short"
```

**Parameters:**
- `videoId` (required): YouTube Short video ID or URL

**Returns:** Hook timing, CTA patterns, words-per-second, hashtags, frame

**Note:** Use instead of deep_analyze_video for Shorts (<60 sec).

---

#### `detect_music`
Detect if video is a music video.

```
"Is this a music video?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL

**Returns:** Confidence score, artist, song title, music type

**Tip:** Use before get_transcript - music videos have lyrics as captions.

---

#### `get_hd_thumbnail`
Get high-resolution thumbnails.

```
"Get the best thumbnail for this video"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `quality` (optional): "maxres", "sd", "hq", "mq", "default"

**Returns:** Thumbnail URLs at various resolutions (up to 1280x720)

---

#### `get_video_chapters_free`
Extract chapters from description (no API needed).

```
"What are the chapters in this video?"
```

**Parameters:**
- `videoId` (required): YouTube video ID or URL

**Returns:** Chapter timestamps and titles with clickable links

---

## API Tools (Requires YouTube API Key)

### Search & Discovery

#### `search_videos`
Search YouTube.

**Parameters:**
- `query` (required): Search query
- `maxResults` (optional): 1-50 (default: 10)
- `order` (optional): date, rating, relevance, title, viewCount
- `type` (optional): video, channel, playlist
- `duration` (optional): any, short, medium, long
- `regionCode` (optional): US, UK, etc.

---

#### `get_trending`
Get trending videos.

**Parameters:**
- `regionCode` (optional): Country code (default: US)
- `categoryId` (optional): Category ID
- `maxResults` (optional): 1-50

---

#### `get_related_videos`
Find similar videos.

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `maxResults` (optional): Max results

---

#### `search_by_hashtag`
Search by hashtag.

**Parameters:**
- `hashtag` (required): Hashtag (with or without #)
- `maxResults` (optional): 1-50

---

#### `get_categories`
List YouTube categories.

**Parameters:**
- `regionCode` (optional): Country code

---

### Video Analysis (API)

#### `get_video_details`
Full video stats.

**Parameters:**
- `videoId` (required): YouTube video ID or URL

**Returns:** Views, likes, comments, tags, duration, publish date

---

#### `get_video_chapters`
Extract chapters (API version).

**Parameters:**
- `videoId` (required): YouTube video ID or URL

---

#### `get_video_stats_history`
Current stats with metrics.

**Parameters:**
- `videoId` (required): YouTube video ID or URL

---

#### `check_live_status`
Check if video is live/upcoming.

**Parameters:**
- `videoId` (required): YouTube video ID or URL

---

#### `get_video_metadata_bulk`
Get metadata for up to 50 videos.

**Parameters:**
- `videoIds` (required): Array of video IDs/URLs
- `includeStats` (optional): Include view/like counts

---

#### `compare_videos`
Compare stats of 2-10 videos.

**Parameters:**
- `videoIds` (required): Array of video IDs/URLs

---

### Channel Analysis

#### `get_channel_info`
Channel information.

**Parameters:**
- `channelId` (required): Channel ID, @handle, or URL

---

#### `get_channel_videos`
List channel videos.

**Parameters:**
- `channelId` (required): Channel ID or handle
- `maxResults` (optional): 1-50
- `order` (optional): date, rating, relevance, title, viewCount

---

#### `get_shorts`
Get YouTube Shorts from channel.

**Parameters:**
- `channelId` (required): Channel ID, @handle, or URL
- `maxResults` (optional): 1-50

---

#### `analyze_channel`
Deep channel analytics.

**Parameters:**
- `channelId` (required): Channel ID, @handle, or URL
- `videoCount` (optional): Videos to analyze (5-50)

---

#### `compare_channels`
Compare 2-5 channels.

**Parameters:**
- `channelIds` (required): Array of channel IDs/handles

---

### Playlists

#### `get_playlist`
Get playlist contents.

**Parameters:**
- `playlistId` (required): Playlist ID or URL
- `maxResults` (optional): Max items

---

#### `export_playlist`
Export playlist to JSON.

**Parameters:**
- `playlistId` (required): Playlist ID or URL
- `includeDescriptions` (optional): Include video descriptions

---

#### `get_playlist_summary`
Full playlist analysis.

**Parameters:**
- `playlistId` (required): Playlist ID or URL
- `includeTopics` (optional): Extract topics from titles

---

### Comments

#### `get_video_comments`
Fetch video comments.

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `maxResults` (optional): 1-100
- `order` (optional): time, relevance

---

#### `get_comment_replies`
Get replies to a comment.

**Parameters:**
- `commentId` (required): Comment ID
- `maxResults` (optional): 1-100

---

#### `analyze_comments_sentiment`
Analyze comment sentiment.

**Parameters:**
- `videoId` (required): YouTube video ID or URL
- `maxComments` (optional): 10-100

**Returns:** Positive/negative/neutral breakdown with examples
