/**
 * Enhanced handlers - Advanced features for power users
 * These work WITHOUT an API key (except where noted)
 */
import { HandlerModule, ToolHandler, truncateResponse, formatTime } from '../types.js';
import { extractVideoId } from '../../utils/formatting.js';

const handlers = new Map<string, ToolHandler>();

// ============================================
// merge_transcripts
// ============================================
handlers.set('merge_transcripts', async (args, ctx) => {
  const videoIds = (args?.videoIds as string[]) || [];
  const language = (args?.language as string) || 'en';
  const includeSeparators = args?.includeSeparators !== false;

  if (videoIds.length < 2) {
    return {
      content: [{ type: 'text', text: 'Please provide at least 2 video IDs to merge.' }],
      isError: true,
    };
  }

  if (videoIds.length > 10) {
    return {
      content: [{ type: 'text', text: 'Maximum 10 videos allowed per merge.' }],
      isError: true,
    };
  }

  const results: { videoId: string; title: string; transcript: string; error?: string }[] = [];
  let totalLength = 0;
  let totalSegments = 0;

  for (const rawId of videoIds) {
    const videoId = extractVideoId(rawId);
    try {
      const [info, transcript] = await Promise.all([
        ctx.transcriptService.getVideoInfo(videoId),
        ctx.transcriptService.getTranscript(videoId, language),
      ]);
      results.push({
        videoId,
        title: info.title,
        transcript: transcript.fullText,
      });
      totalLength += transcript.fullText.length;
      totalSegments += transcript.segments.length;
    } catch (e: any) {
      results.push({
        videoId,
        title: 'Unknown',
        transcript: '',
        error: e.message,
      });
    }
  }

  const successful = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);

  let merged = `# Merged Transcripts (${successful.length}/${videoIds.length} videos)\n\n`;
  merged += `**Total content:** ${totalLength.toLocaleString()} chars, ${totalSegments} segments\n\n`;

  if (failed.length > 0) {
    merged += `**Failed to fetch:** ${failed.map((f) => f.videoId).join(', ')}\n\n`;
  }

  merged += '---\n\n';

  for (let i = 0; i < successful.length; i++) {
    const r = successful[i];
    if (includeSeparators) {
      merged += `## Video ${i + 1}: ${r.title}\n`;
      merged += `https://youtube.com/watch?v=${r.videoId}\n\n`;
    }
    merged += r.transcript;
    merged += '\n\n';
    if (includeSeparators && i < successful.length - 1) {
      merged += '---\n\n';
    }
  }

  return { content: [{ type: 'text', text: truncateResponse(merged, 50000) }] };
});

// ============================================
// analyze_short
// ============================================
handlers.set('analyze_short', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);

  const info = await ctx.transcriptService.getVideoInfo(videoId);

  // Check if it's actually a Short (under 60 seconds)
  const isShort = info.lengthSeconds <= 60;

  let analysis = `# YouTube Short Analysis\n\n`;
  analysis += `**Title:** ${info.title}\n`;
  analysis += `**Channel:** ${info.author}\n`;
  analysis += `**Duration:** ${info.lengthSeconds}s ${isShort ? '(Valid Short)' : '(Not a Short - over 60s)'}\n\n`;

  // Try to get transcript
  let hasTranscript = false;
  let transcriptContent = '';
  try {
    const transcript = await ctx.transcriptService.getTranscript(videoId);
    hasTranscript = true;
    transcriptContent = transcript.fullText;
  } catch {
    // No transcript
  }

  // Shorts-specific metrics
  const wordsPerSecond = hasTranscript
    ? (transcriptContent.split(/\s+/).length / info.lengthSeconds).toFixed(1)
    : 'N/A';

  analysis += `## Short Metrics\n\n`;
  analysis += `| Metric | Value |\n`;
  analysis += `|--------|-------|\n`;
  analysis += `| Duration | ${info.lengthSeconds}s |\n`;
  analysis += `| Has Speech | ${hasTranscript ? 'Yes' : 'No (music/silent)'} |\n`;
  analysis += `| Words/Second | ${wordsPerSecond} |\n`;
  analysis += `| Vertical Format | Likely (Shorts are 9:16) |\n\n`;

  // Content analysis for Shorts
  if (hasTranscript) {
    analysis += `## Content\n\n`;
    analysis += `**Full Script:**\n> ${transcriptContent}\n\n`;

    // Detect hook (first few words)
    const words = transcriptContent.split(/\s+/);
    const hook = words.slice(0, 10).join(' ');
    analysis += `**Hook (first 10 words):** "${hook}..."\n\n`;

    // Detect CTA patterns
    const ctaPatterns = [
      /follow/i,
      /subscribe/i,
      /like/i,
      /comment/i,
      /share/i,
      /check out/i,
      /link in bio/i,
      /part \d/i,
      /more/i,
    ];
    const detectedCTAs = ctaPatterns.filter((p) => p.test(transcriptContent));
    if (detectedCTAs.length > 0) {
      analysis += `**Call-to-Actions Detected:** ${detectedCTAs.length}\n`;
    }
  }

  // Keywords as hashtags
  if (info.keywords.length > 0) {
    analysis += `\n## Hashtags/Keywords\n`;
    analysis += info.keywords
      .slice(0, 10)
      .map((k) => `#${k.replace(/\s+/g, '')}`)
      .join(' ');
    analysis += '\n';
  }

  // Get a frame for visual analysis
  analysis += `\n## Visual Preview\n`;
  const frame = await ctx.transcriptService.extractFrameImage(
    videoId,
    Math.floor(info.lengthSeconds / 2)
  );
  if (frame) {
    analysis += `Frame extracted at ${Math.floor(info.lengthSeconds / 2)}s - analyze the image below.\n`;
    return {
      content: [
        { type: 'text', text: analysis },
        { type: 'image', data: frame.imageBase64, mimeType: frame.mimeType },
      ],
    };
  }

  analysis += `Thumbnail: https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg\n`;

  return { content: [{ type: 'text', text: analysis }] };
});

// ============================================
// get_hd_thumbnail
// ============================================
handlers.set('get_hd_thumbnail', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const quality = (args?.quality as string) || 'maxres';

  const info = await ctx.transcriptService.getVideoInfo(videoId);

  // YouTube thumbnail URL patterns
  const thumbnailQualities: Record<string, { url: string; size: string }> = {
    maxres: { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, size: '1280x720' },
    sd: { url: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`, size: '640x480' },
    hq: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, size: '480x360' },
    mq: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, size: '320x180' },
    default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg`, size: '120x90' },
  };

  const selected = thumbnailQualities[quality] || thumbnailQualities.maxres;

  let response = `# HD Thumbnail: ${info.title}\n\n`;
  response += `**Selected Quality:** ${quality} (${selected.size})\n\n`;
  response += `## All Available Thumbnails\n\n`;

  for (const [name, data] of Object.entries(thumbnailQualities)) {
    const marker = name === quality ? '→ ' : '  ';
    response += `${marker}**${name}** (${data.size}): ${data.url}\n`;
  }

  response += `\n## Direct Link\n${selected.url}\n`;
  response += `\n*Note: maxresdefault.jpg may not exist for older/lower-quality videos. Try hqdefault.jpg as fallback.*`;

  return { content: [{ type: 'text', text: response }] };
});

// ============================================
// detect_music
// ============================================
handlers.set('detect_music', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);

  const info = await ctx.transcriptService.getVideoInfo(videoId);

  // Music detection heuristics
  const musicIndicators = {
    titlePatterns: [
      /official\s*(music\s*)?video/i,
      /official\s*audio/i,
      /\(lyrics?\)/i,
      /\[lyrics?\]/i,
      /lyric\s*video/i,
      /audio\s*only/i,
      /ft\.|feat\./i,
      /\s-\s.*\s-\s/, // Artist - Song - Something pattern
    ],
    keywordPatterns: ['music', 'song', 'album', 'single', 'lyrics', 'audio', 'vevo', 'official'],
    channelPatterns: [/vevo$/i, /music$/i, /records$/i, /entertainment$/i],
  };

  let musicScore = 0;
  const reasons: string[] = [];

  // Check title
  for (const pattern of musicIndicators.titlePatterns) {
    if (pattern.test(info.title)) {
      musicScore += 2;
      reasons.push(`Title matches: ${pattern.toString()}`);
    }
  }

  // Check keywords
  const keywordMatches = info.keywords.filter((k) =>
    musicIndicators.keywordPatterns.some((p) => k.toLowerCase().includes(p))
  );
  if (keywordMatches.length > 0) {
    musicScore += keywordMatches.length;
    reasons.push(`Keywords: ${keywordMatches.join(', ')}`);
  }

  // Check channel name
  for (const pattern of musicIndicators.channelPatterns) {
    if (pattern.test(info.author)) {
      musicScore += 2;
      reasons.push(`Channel name suggests music: ${info.author}`);
    }
  }

  // Check for typical music video duration (2-5 minutes)
  if (info.lengthSeconds >= 120 && info.lengthSeconds <= 360) {
    musicScore += 1;
    reasons.push(
      `Duration (${Math.floor(info.lengthSeconds / 60)}:${(info.lengthSeconds % 60).toString().padStart(2, '0')}) typical for music`
    );
  }

  // Try to parse artist - song from title
  let artist = '';
  let song = '';
  const titleMatch = info.title.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s*[\(\[]|$)/);
  if (titleMatch) {
    artist = titleMatch[1].trim();
    song = titleMatch[2].trim();
  }

  const isMusic = musicScore >= 3;

  let response = `# Music Detection: ${info.title}\n\n`;
  response += `**Result:** ${isMusic ? '🎵 MUSIC VIDEO DETECTED' : '📹 Not a music video'}\n`;
  response += `**Confidence Score:** ${musicScore}/10\n\n`;

  if (artist && song) {
    response += `## Parsed Info\n`;
    response += `**Artist:** ${artist}\n`;
    response += `**Song:** ${song}\n\n`;
  }

  response += `## Detection Reasons\n`;
  if (reasons.length > 0) {
    for (const reason of reasons) {
      response += `• ${reason}\n`;
    }
  } else {
    response += `• No music indicators found\n`;
  }

  response += `\n## Video Info\n`;
  response += `**Channel:** ${info.author}\n`;
  response += `**Duration:** ${Math.floor(info.lengthSeconds / 60)}:${(info.lengthSeconds % 60).toString().padStart(2, '0')}\n`;
  response += `**Keywords:** ${info.keywords.slice(0, 10).join(', ')}\n`;

  return { content: [{ type: 'text', text: response }] };
});

// ============================================
// get_video_chapters_free (no API key version)
// ============================================
handlers.set('get_video_chapters_free', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);

  const info = await ctx.transcriptService.getVideoInfo(videoId);

  // Parse chapters from description
  const chapterRegex = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)(?=\n|$)/g;
  const chapters: { time: string; seconds: number; title: string }[] = [];
  let match;

  while ((match = chapterRegex.exec(info.description)) !== null) {
    const timeStr = match[1];
    const title = match[2].trim();
    const parts = timeStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      seconds = parts[0] * 60 + parts[1];
    }
    chapters.push({ time: timeStr, seconds, title });
  }

  if (chapters.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No chapters found in "${info.title}".\n\nThe video may not have chapter markers in its description.\n\n*Tip: Use get_video_outline to auto-generate an outline from the transcript.*`,
        },
      ],
    };
  }

  let response = `# Chapters: ${info.title}\n\n`;
  response += `**${chapters.length} chapters found**\n\n`;

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const link = `https://youtube.com/watch?v=${videoId}&t=${ch.seconds}`;
    response += `${i + 1}. **[${ch.time}](${link})** ${ch.title}\n`;
  }

  return { content: [{ type: 'text', text: response }] };
});

// ============================================
// deep_analyze_video (COMBO: info + transcript + frames + summary)
// ============================================
handlers.set('deep_analyze_video', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';

  // Gather ALL data about the video
  const info = await ctx.transcriptService.getVideoInfo(videoId);

  let response = `# Deep Analysis: ${info.title}\n\n`;
  response += `**Channel:** ${info.author}\n`;
  response += `**Duration:** ${Math.floor(info.lengthSeconds / 60)}:${(info.lengthSeconds % 60).toString().padStart(2, '0')}\n`;
  response += `**URL:** https://youtube.com/watch?v=${videoId}\n\n`;

  // Section 1: Content Overview
  response += `## 1. Content Overview\n\n`;
  response += `${info.description.substring(0, 500)}${info.description.length > 500 ? '...' : ''}\n\n`;

  if (info.keywords.length > 0) {
    response += `**Topics:** ${info.keywords.slice(0, 10).join(', ')}\n\n`;
  }

  // Section 2: Transcript Analysis
  response += `## 2. Transcript Analysis\n\n`;
  let transcript;
  let hasTranscript = false;
  try {
    transcript = await ctx.transcriptService.getTranscript(videoId, language);
    hasTranscript = true;
    const wordCount = transcript.fullText.split(/\s+/).length;
    const wordsPerMin = Math.round(wordCount / (info.lengthSeconds / 60));

    response += `| Metric | Value |\n`;
    response += `|--------|-------|\n`;
    response += `| Word Count | ${wordCount.toLocaleString()} |\n`;
    response += `| Segments | ${transcript.segments.length} |\n`;
    response += `| Words/Minute | ${wordsPerMin} |\n`;
    response += `| Languages | ${(await ctx.transcriptService.listCaptionLanguages(videoId)).map((l) => l.code).join(', ')} |\n\n`;

    // Key points extraction (simplified)
    const importantPhrases = transcript.segments
      .filter((s) => /important|key|remember|basically|the point is|in summary/i.test(s.text))
      .slice(0, 5);

    if (importantPhrases.length > 0) {
      response += `**Key Moments:**\n`;
      for (const phrase of importantPhrases) {
        response += `• [${formatTime(phrase.start)}] ${phrase.text.substring(0, 100)}...\n`;
      }
      response += '\n';
    }
  } catch {
    response += `*No transcript available for this video.*\n\n`;
  }

  // Section 3: Chapters (from description)
  response += `## 3. Structure\n\n`;
  const chapterRegex = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)(?=\n|$)/g;
  const chapters: { time: string; title: string }[] = [];
  let match;
  while ((match = chapterRegex.exec(info.description)) !== null) {
    chapters.push({ time: match[1], title: match[2].trim() });
  }

  if (chapters.length > 0) {
    response += `**${chapters.length} Chapters Found:**\n`;
    for (const ch of chapters.slice(0, 10)) {
      response += `• [${ch.time}] ${ch.title}\n`;
    }
  } else if (hasTranscript && transcript) {
    // Auto-detect sections from transcript
    response += `*No chapters in description. Auto-detecting sections...*\n`;
    const sectionMarkers = transcript.segments
      .filter((s) => /now let's|next|moving on|first|finally|in conclusion/i.test(s.text))
      .slice(0, 5);
    for (const marker of sectionMarkers) {
      response += `• [${formatTime(marker.start)}] ${marker.text.substring(0, 60)}...\n`;
    }
  }
  response += '\n';

  // Section 4: Links & Resources
  response += `## 4. Resources Mentioned\n\n`;
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = [...new Set(info.description.match(urlRegex) || [])];
  if (urls.length > 0) {
    for (const url of urls.slice(0, 10)) {
      response += `• ${url}\n`;
    }
  } else {
    response += `*No links found in description*\n`;
  }
  response += '\n';

  // Section 5: Visual Sample
  response += `## 5. Visual Sample\n\n`;
  const midpoint = Math.floor(info.lengthSeconds / 2);
  const frame = await ctx.transcriptService.extractFrameImage(videoId, midpoint);

  if (frame) {
    response += `Frame at ${formatTime(midpoint)} (${frame.frameWidth}x${frame.frameHeight}px):\n`;
    return {
      content: [
        { type: 'text', text: truncateResponse(response, 20000) },
        { type: 'image', data: frame.imageBase64, mimeType: frame.mimeType },
      ],
    };
  }

  response += `Thumbnail: https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg\n`;

  return { content: [{ type: 'text', text: truncateResponse(response, 20000) }] };
});

// ============================================
// compare_moments (see same timestamp across multiple videos)
// ============================================
handlers.set('compare_moments', async (args, ctx) => {
  const videoIds = (args?.videoIds as string[]) || [];
  const timestamp = (args?.timestamp as string) || '0:30';

  if (videoIds.length < 2 || videoIds.length > 5) {
    return {
      content: [{ type: 'text', text: 'Please provide 2-5 video IDs to compare.' }],
      isError: true,
    };
  }

  // Parse timestamp
  let seconds = 30;
  if (timestamp.includes(':')) {
    const parts = timestamp.split(':').map(Number);
    seconds =
      parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  } else {
    seconds = parseInt(timestamp, 10);
  }

  let response = `# Moment Comparison at ${timestamp}\n\n`;
  response += `Comparing ${videoIds.length} videos at the same timestamp...\n\n`;

  const contentItems: Array<
    { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }
  > = [];
  let textResponse = response;

  for (let i = 0; i < videoIds.length; i++) {
    const videoId = extractVideoId(videoIds[i]);
    textResponse += `## Video ${i + 1}\n\n`;

    try {
      const info = await ctx.transcriptService.getVideoInfo(videoId);
      textResponse += `**${info.title}**\n`;
      textResponse += `Channel: ${info.author}\n\n`;

      if (seconds > info.lengthSeconds) {
        textResponse += `*Timestamp exceeds video duration (${formatTime(info.lengthSeconds)})*\n\n`;
        continue;
      }

      // Get what's being said
      try {
        const moment = await ctx.transcriptService.getVideoMoment(videoId, seconds);
        if (moment.hasTranscript) {
          textResponse += `**Said at ${timestamp}:**\n> "${moment.transcript.currentText}"\n\n`;
        }
      } catch {
        textResponse += `*No transcript at this moment*\n\n`;
      }

      // Get visual frame
      const frame = await ctx.transcriptService.extractFrameImage(videoId, seconds);
      if (frame) {
        textResponse += `Frame extracted (${frame.frameWidth}x${frame.frameHeight}px)\n\n`;
      }
    } catch (e: any) {
      textResponse += `*Error: ${e.message}*\n\n`;
    }

    textResponse += '---\n\n';
  }

  // Add all frames at the end
  contentItems.push({ type: 'text', text: truncateResponse(textResponse, 15000) });

  for (const rawId of videoIds) {
    const videoId = extractVideoId(rawId);
    try {
      const info = await ctx.transcriptService.getVideoInfo(videoId);
      if (seconds <= info.lengthSeconds) {
        const frame = await ctx.transcriptService.extractFrameImage(videoId, seconds);
        if (frame) {
          contentItems.push({ type: 'image', data: frame.imageBase64, mimeType: frame.mimeType });
        }
      }
    } catch {
      // Skip failed frames
    }
  }

  return { content: contentItems };
});

// ============================================
// video_timeline (full timeline with frames + transcript)
// ============================================
handlers.set('video_timeline', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const intervals = Math.min(Math.max((args?.intervals as number) || 5, 3), 10);

  const info = await ctx.transcriptService.getVideoInfo(videoId);
  const intervalSeconds = Math.floor(info.lengthSeconds / intervals);

  let response = `# Video Timeline: ${info.title}\n\n`;
  response += `**Duration:** ${formatTime(info.lengthSeconds)} | **Intervals:** ${intervals}\n\n`;

  let transcript;
  try {
    transcript = await ctx.transcriptService.getTranscript(videoId);
  } catch {
    // No transcript
  }

  const contentItems: Array<
    { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }
  > = [];

  for (let i = 0; i < intervals; i++) {
    const timestamp = i * intervalSeconds;
    response += `## [${formatTime(timestamp)}](https://youtube.com/watch?v=${videoId}&t=${timestamp})\n\n`;

    // Get transcript at this point
    if (transcript) {
      const segment = transcript.segments.find(
        (s) => s.start >= timestamp && s.start < timestamp + intervalSeconds
      );
      if (segment) {
        response += `> "${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}"\n\n`;
      }
    }
  }

  contentItems.push({ type: 'text', text: response });

  // Extract frames for each interval
  for (let i = 0; i < intervals; i++) {
    const timestamp = i * intervalSeconds;
    const frame = await ctx.transcriptService.extractFrameImage(videoId, timestamp);
    if (frame) {
      contentItems.push({ type: 'image', data: frame.imageBase64, mimeType: frame.mimeType });
    }
  }

  return { content: contentItems };
});

export const enhancedHandlers: HandlerModule = {
  handlers,
  requiresApiKey: false,
};
