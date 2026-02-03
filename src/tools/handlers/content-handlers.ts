/**
 * Content Analysis handlers - Summary, Q&A, outline, links extraction
 * These work WITHOUT an API key
 */
import { HandlerModule, ToolHandler, truncateResponse, formatTime } from '../types.js';
import { extractVideoId } from '../../utils/formatting.js';

const handlers = new Map<string, ToolHandler>();

// ============================================
// get_video_summary
// ============================================
handlers.set('get_video_summary', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';
  const style = (args?.style as 'brief' | 'detailed' | 'bullet-points') || 'bullet-points';

  const transcript = await ctx.transcriptService.getTranscript(videoId, language);
  const info = await ctx.transcriptService.getVideoInfo(videoId);

  const importantPatterns = [
    /\b(important|key|main|crucial|essential|remember|note that|basically|essentially|in summary|to summarize|the point is|what this means|this is why|the reason|because|therefore|so basically)\b/gi,
    /\b(first|second|third|finally|in conclusion|to conclude|overall|in short)\b/gi,
  ];

  const segments = transcript.segments;
  const keyPoints: { timestamp: number; text: string; score: number }[] = [];

  for (const segment of segments) {
    let score = 0;
    for (const pattern of importantPatterns) {
      if (pattern.test(segment.text)) score += 2;
    }
    if (segment.text.length > 100) score += 1;
    if (segment === segments[0] || segment === segments[segments.length - 1]) score += 1;

    if (score > 0) {
      keyPoints.push({ timestamp: segment.start, text: segment.text, score });
    }
  }

  keyPoints.sort((a, b) => b.score - a.score);
  const topPoints = keyPoints.slice(0, style === 'detailed' ? 15 : style === 'brief' ? 5 : 10);
  topPoints.sort((a, b) => a.timestamp - b.timestamp);

  let summary = `# ${info.title}\n\n`;
  summary += `**Channel:** ${info.author} | **Duration:** ${Math.floor(info.lengthSeconds / 60)} min\n\n`;

  if (style === 'brief') {
    summary += `## Quick Summary\n\n`;
    summary += `${info.description.substring(0, 200)}${info.description.length > 200 ? '...' : ''}\n\n`;
    summary += `**Key Points:**\n`;
    for (const point of topPoints.slice(0, 5)) {
      summary += `• ${point.text.substring(0, 150)}\n`;
    }
  } else if (style === 'bullet-points') {
    summary += `## Key Points\n\n`;
    for (const point of topPoints) {
      summary += `• **[${formatTime(point.timestamp)}]** ${point.text.substring(0, 200)}${point.text.length > 200 ? '...' : ''}\n\n`;
    }
  } else {
    summary += `## Overview\n\n${info.description.substring(0, 500)}${info.description.length > 500 ? '...' : ''}\n\n`;
    summary += `## Detailed Notes\n\n`;
    for (const point of topPoints) {
      summary += `### [${formatTime(point.timestamp)}](https://youtube.com/watch?v=${videoId}&t=${Math.floor(point.timestamp)})\n`;
      summary += `${point.text}\n\n`;
    }
  }

  if (info.keywords.length > 0) {
    summary += `\n**Topics:** ${info.keywords.slice(0, 8).join(', ')}`;
  }

  return { content: [{ type: 'text', text: truncateResponse(summary) }] };
});

// ============================================
// answer_from_video
// ============================================
handlers.set('answer_from_video', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const question = args?.question as string;
  const language = (args?.language as string) || 'en';

  const transcript = await ctx.transcriptService.getTranscript(videoId, language);
  const info = await ctx.transcriptService.getVideoInfo(videoId);

  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'when', 'where', 'who', 'how', 'why', 'does', 'do', 'did', 'this', 'that', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'about']);
  const questionWords = question.toLowerCase()
    .replace(/[?.,!]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const relevantSegments: { segment: typeof transcript.segments[0]; score: number; matchedWords: string[] }[] = [];

  for (const segment of transcript.segments) {
    const text = segment.text.toLowerCase();
    let score = 0;
    const matchedWords: string[] = [];

    for (const word of questionWords) {
      if (text.includes(word)) {
        score += 2;
        matchedWords.push(word);
      }
      if (text.split(/\s+/).some((w) => w.startsWith(word) || word.startsWith(w))) {
        score += 1;
      }
    }

    if (score > 0) {
      relevantSegments.push({ segment, score, matchedWords });
    }
  }

  if (relevantSegments.length === 0) {
    return {
      content: [{
        type: 'text',
        text: `**Question:** ${question}\n\n**Answer:** This topic doesn't appear to be discussed in the video "${info.title}". The transcript doesn't contain relevant content matching your question.\n\nTry:\n• Rephrasing your question with different keywords\n• Using find_moment_by_topic to search for specific terms\n• Watching specific sections using get_video_moment`,
      }],
    };
  }

  relevantSegments.sort((a, b) => b.score - a.score);
  const topSegments = relevantSegments.slice(0, 5);

  let response = `**Question:** ${question}\n\n`;
  response += `**Video:** ${info.title}\n\n`;
  response += `**Relevant Sections Found:**\n\n`;

  for (const { segment, matchedWords } of topSegments) {
    const timeLink = `https://youtube.com/watch?v=${videoId}&t=${Math.floor(segment.start)}`;
    response += `📍 **[${formatTime(segment.start)}](${timeLink})** (matched: ${matchedWords.join(', ')})\n`;
    response += `> ${segment.text}\n\n`;
  }

  response += `\n*Use get_video_moment with a timestamp to see visual context.*`;

  return { content: [{ type: 'text', text: response }] };
});

// ============================================
// extract_links_mentions
// ============================================
handlers.set('extract_links_mentions', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';

  const info = await ctx.transcriptService.getVideoInfo(videoId);

  let transcriptText = '';
  try {
    const transcript = await ctx.transcriptService.getTranscript(videoId, language);
    transcriptText = transcript.fullText;
  } catch {
    // No transcript available
  }

  const searchText = `${info.description} ${transcriptText}`;

  const patterns: { type: string; regex: RegExp; items: Set<string> }[] = [
    { type: 'URLs', regex: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, items: new Set() },
    { type: '@Mentions', regex: /@[\w.-]+/gi, items: new Set() },
    { type: 'Email Addresses', regex: /[\w.-]+@[\w.-]+\.\w+/gi, items: new Set() },
    { type: 'Hashtags', regex: /#[\w]+/gi, items: new Set() },
  ];

  const productPatterns = [
    /\b(use|using|recommend|sponsored by|try|check out|get|buy|purchase)\s+(\w+(?:\s+\w+)?)/gi,
    /\b(\w+(?:\s+\w+)?)\s+(affiliate|discount|code|coupon|link)\b/gi,
  ];

  const products = new Set<string>();
  const books = new Set<string>();
  const courses = new Set<string>();

  for (const pattern of patterns) {
    const matches = searchText.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        pattern.items.add(match);
      }
    }
  }

  const bookPatterns = /\b(book|books|read|reading)\b[^.]*?[""]([^""]+)[""]/gi;
  let bookMatch;
  while ((bookMatch = bookPatterns.exec(searchText)) !== null) {
    books.add(bookMatch[2]);
  }

  const coursePatterns = /\b(course|courses|tutorial|bootcamp|program)\b[^.]*?[""]([^""]+)[""]/gi;
  let courseMatch;
  while ((courseMatch = coursePatterns.exec(searchText)) !== null) {
    courses.add(courseMatch[2]);
  }

  for (const pattern of productPatterns) {
    let match;
    while ((match = pattern.exec(searchText)) !== null) {
      const product = match[2]?.trim();
      if (product && product.length > 2 && product.length < 30) {
        products.add(product);
      }
    }
  }

  let response = `**Links & Mentions: ${info.title}**\n\n`;
  let foundAny = false;

  for (const pattern of patterns) {
    if (pattern.items.size > 0) {
      foundAny = true;
      response += `### ${pattern.type}\n`;
      for (const item of Array.from(pattern.items).slice(0, 15)) {
        response += `• ${item}\n`;
      }
      if (pattern.items.size > 15) {
        response += `...and ${pattern.items.size - 15} more\n`;
      }
      response += '\n';
    }
  }

  if (products.size > 0) {
    foundAny = true;
    response += `### Products/Tools Mentioned\n`;
    for (const product of Array.from(products).slice(0, 10)) {
      response += `• ${product}\n`;
    }
    response += '\n';
  }

  if (books.size > 0) {
    foundAny = true;
    response += `### Books Referenced\n`;
    for (const book of books) {
      response += `• "${book}"\n`;
    }
    response += '\n';
  }

  if (courses.size > 0) {
    foundAny = true;
    response += `### Courses/Tutorials\n`;
    for (const course of courses) {
      response += `• "${course}"\n`;
    }
    response += '\n';
  }

  if (!foundAny) {
    return {
      content: [{ type: 'text', text: 'No links, mentions, or product references detected in this video. The creator may not have included external resources.' }],
    };
  }

  return { content: [{ type: 'text', text: truncateResponse(response) }] };
});

// ============================================
// get_video_outline
// ============================================
handlers.set('get_video_outline', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';

  const transcript = await ctx.transcriptService.getTranscript(videoId, language);
  const info = await ctx.transcriptService.getVideoInfo(videoId);

  const topicMarkers = [
    /\b(now let's talk about|next up|moving on to|let's discuss|talking about|introduction to|what is|let's look at|the first|the second|the third|another|finally|in this section|chapter \d+)\b/gi,
    /\b(so now|okay so|alright so|now we're going to|here we have|this is where|let me show you|I want to show|I'll show you)\b/gi,
  ];

  const sections: { timestamp: number; title: string; content: string }[] = [];
  const segments = transcript.segments;

  const chunkSize = Math.max(1, Math.floor(segments.length / 20));

  for (let i = 0; i < segments.length; i += chunkSize) {
    const chunkSegments = segments.slice(i, i + chunkSize);
    const chunkText = chunkSegments.map((s) => s.text).join(' ');
    const startTime = chunkSegments[0].start;

    let isNewSection = false;
    let sectionTitle = '';

    for (const pattern of topicMarkers) {
      const match = chunkText.match(pattern);
      if (match && match[0]) {
        isNewSection = true;
        const matchIndex = chunkText.toLowerCase().indexOf(match[0].toLowerCase());
        const contextEnd = Math.min(matchIndex + 80, chunkText.length);
        sectionTitle = chunkText.substring(matchIndex, contextEnd).replace(/[.!?,]/g, '').trim();
        break;
      }
    }

    if (!isNewSection && (i === 0 || i % (chunkSize * 3) === 0)) {
      isNewSection = true;
      sectionTitle = chunkText.substring(0, 60).replace(/[.!?,]/g, '').trim();
    }

    if (isNewSection && sectionTitle) {
      sections.push({
        timestamp: startTime,
        title: sectionTitle.substring(0, 80),
        content: chunkText.substring(0, 200),
      });
    }
  }

  if (sections.length === 0) {
    const sectionDuration = info.lengthSeconds / 5;
    for (let i = 0; i < 5; i++) {
      const startSec = i * sectionDuration;
      const segmentIdx = segments.findIndex((s) => s.start >= startSec);
      if (segmentIdx >= 0) {
        sections.push({
          timestamp: startSec,
          title: `Section ${i + 1}`,
          content: segments[segmentIdx].text.substring(0, 100),
        });
      }
    }
  }

  let outline = `# Video Outline: ${info.title}\n\n`;
  outline += `**Duration:** ${Math.floor(info.lengthSeconds / 60)} min | **Sections:** ${sections.length}\n\n`;
  outline += `---\n\n`;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const timeLink = `https://youtube.com/watch?v=${videoId}&t=${Math.floor(section.timestamp)}`;
    outline += `## ${i + 1}. [${formatTime(section.timestamp)}](${timeLink})\n`;
    outline += `**${section.title}**\n\n`;
    outline += `> ${section.content}...\n\n`;
  }

  outline += `---\n*Auto-generated outline. Use get_video_moment for detailed analysis of any section.*`;

  return { content: [{ type: 'text', text: truncateResponse(outline) }] };
});

export const contentHandlers: HandlerModule = {
  handlers,
  requiresApiKey: false,
};
