# TubePilot Usage Examples

Real-world examples of how to use TubePilot with AI assistants.

---

## Quick Start Examples

### Basic Video Analysis
```
"What is this video about? https://youtube.com/watch?v=dQw4w9WgXcQ"
```

### Get a Summary
```
"Summarize this 2-hour lecture into key points"
```

### Find Specific Information
```
"At what timestamp do they mention the pricing?"
```

---

## Developer Workflows

### Learning from Tutorials

**Step 1: Get an overview**
```
"Give me an outline of this React tutorial"
```

**Step 2: Extract the code**
```
"Extract all the code snippets and commands from this video"
```

**Step 3: Find resources**
```
"What GitHub repos and npm packages are mentioned?"
```

**Step 4: Save as notes**
```
"Convert this tutorial into markdown notes I can reference later"
```

---

### Tech Stack Research

```
"What technologies are used in this video? I want to know the frameworks, databases, and tools they mention"
```

**Follow-up:**
```
"Find the timestamps where they discuss the database choice"
```

---

### Code Review from Video

```
"Extract all the code shown in this tutorial and identify any potential issues or best practices they mention"
```

---

## Content Creator Workflows

### Competitive Analysis (Requires API Key)

**Compare your video to competitors:**
```
"Compare these 3 videos on the same topic - which performed best and why?"
[video1_url, video2_url, video3_url]
```

**Channel comparison:**
```
"Compare @mkbhd and @LinusTechTips - subscriber growth, posting frequency, average views"
```

---

### Content Research

**Find trending topics:**
```
"What's trending in the tech category right now?"
```

**Analyze successful videos:**
```
"Analyze the top 5 videos about 'AI coding assistants' - what do they have in common?"
```

---

### Comment Analysis (Requires API Key)

```
"What's the sentiment in the comments? Are viewers happy with this video?"
```

**Find feedback:**
```
"What are the main complaints or suggestions in the comments?"
```

---

## Research Workflows

### Video-Based Research

**Deep dive on a topic:**
```
"I'm researching quantum computing. Analyze this lecture and extract all key concepts with timestamps"
```

**Cross-reference videos:**
```
"Merge the transcripts from these 3 videos on the same topic so I can compare their coverage"
```

---

### Academic Use

**Lecture notes:**
```
"Convert this MIT lecture into structured study notes with key concepts and timestamps"
```

**Find definitions:**
```
"When does the professor define 'neural network' in this lecture?"
```

---

## Multi-Video Analysis

### Playlist Analysis

**Course overview:**
```
"Summarize this course playlist - what topics are covered and in what order?"
```

**Total learning time:**
```
"How long would it take to watch this entire playlist?"
```

---

### Comparing Perspectives

**Same topic, different creators:**
```
"Compare what these 3 creators say at the 5-minute mark about React vs Vue"
```

---

## Visual Content Analysis

### When There's No Transcript

**For gameplay, music, or visual content:**
```
"This video has no captions. Show me frames from throughout the video so I can understand what's happening"
```

---

### Specific Moment Analysis

**What's on screen:**
```
"What's shown at 3:45 in this video? Show me the frame and tell me what's being said"
```

---

## YouTube Shorts

### Shorts-Specific Analysis

```
"Analyze this YouTube Short - what's the hook, how fast is the pacing, and what's the call-to-action?"
```

---

## Music Videos

### Music Detection

```
"Is this a music video? If so, who's the artist and what's the song?"
```

**Get lyrics:**
```
"Get the lyrics/transcript from this music video"
```

---

## Practical Combinations

### The "Learn Everything" Workflow

1. **Start broad:** `deep_analyze_video` - get complete overview
2. **Go deep:** `get_transcript` with timestamps
3. **Find specifics:** `search_in_transcript` or `answer_from_video`
4. **Visual context:** `get_video_moment` at interesting timestamps
5. **Save it:** `convert_to_notes` for future reference

---

### The "Research" Workflow

1. **Search:** `search_videos` to find relevant content
2. **Compare:** `compare_videos` to find the best ones
3. **Analyze:** `deep_analyze_video` on top picks
4. **Combine:** `merge_transcripts` to create comprehensive notes

---

### The "Content Creator" Workflow

1. **Research:** `get_trending` in your category
2. **Analyze competitors:** `analyze_channel` on top creators
3. **Study structure:** `get_video_outline` on successful videos
4. **Learn patterns:** `analyze_short` to understand Shorts format

---

## Tips

### Supported URL Formats

All of these work:
- `https://youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxx&t=120`
- `https://youtube.com/shorts/abc123`
- `https://music.youtube.com/watch?v=dQw4w9WgXcQ`
- Just the ID: `dQw4w9WgXcQ`

### Non-English Videos

Always check available languages first:
```
"What caption languages are available for this video?"
```

Then request the specific language:
```
"Get the transcript in Spanish"
```

### No Captions Available?

Use visual analysis:
```
"This video has no captions. Extract frames at regular intervals so I can see what's happening"
```

### Long Videos

Use timeline view:
```
"Give me a visual timeline of this 3-hour video with frames every 20 minutes"
```

Or get an outline first:
```
"Create an outline of this lecture so I can jump to relevant sections"
```
