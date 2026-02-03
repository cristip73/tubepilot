/**
 * Developer handlers - Tools for extracting code, tech stack, tutorial steps
 * Perfect for developers watching coding tutorials
 * These work WITHOUT an API key
 */
import { HandlerModule, ToolHandler, truncateResponse, formatTime } from '../types.js';
import { extractVideoId } from '../../utils/formatting.js';

const handlers = new Map<string, ToolHandler>();

// ============================================
// extract_code_snippets
// ============================================
handlers.set('extract_code_snippets', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';

  const transcript = await ctx.transcriptService.getTranscript(videoId, language);

  const codePatterns = [
    {
      regex: /\b(npm|yarn|pnpm)\s+(install|i|add|remove|run|start|build|test|init)\b[^\n.]*/gi,
      type: 'Package Manager',
    },
    { regex: /\bpip\s+(install|uninstall|freeze|list)\b[^\n.]*/gi, type: 'Python/pip' },
    { regex: /\bcargo\s+(new|build|run|test|add)\b[^\n.]*/gi, type: 'Rust/Cargo' },
    {
      regex:
        /\bgit\s+(clone|pull|push|commit|checkout|branch|merge|rebase|add|status|init|fetch|remote)\b[^\n.]*/gi,
      type: 'Git',
    },
    { regex: /\bdocker\s+(build|run|push|pull|compose|exec|ps)\b[^\n.]*/gi, type: 'Docker' },
    {
      regex: /\b(npx|node|python|python3|ruby|go|java|dotnet|kubectl|terraform|aws|gcloud)\s+\S+/gi,
      type: 'CLI Command',
    },
    {
      regex: /\b(const|let|var|function|class|import|export|require|async|await)\s+\w+/gi,
      type: 'JavaScript',
    },
    { regex: /\b(def|class|import|from|async|await)\s+\w+/gi, type: 'Python' },
    {
      regex:
        /[./][\w/-]+\.(js|ts|jsx|tsx|py|rb|go|java|cpp|c|h|css|scss|html|json|yaml|yml|md|sh)\b/gi,
      type: 'File Path',
    },
    {
      regex: /https?:\/\/(?:github\.com|gitlab\.com|bitbucket\.org|npmjs\.com)[^\s)"]*/gi,
      type: 'Code URL',
    },
  ];

  const snippets: { timestamp: number; type: string; content: string }[] = [];

  for (const segment of transcript.segments) {
    for (const pattern of codePatterns) {
      const matches = segment.text.match(pattern.regex);
      if (matches) {
        for (const match of matches) {
          if (!snippets.some((s) => s.content === match.trim())) {
            snippets.push({
              timestamp: segment.start,
              type: pattern.type,
              content: match.trim(),
            });
          }
        }
      }
    }
  }

  if (snippets.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No code snippets or commands detected in this video transcript. This may not be a coding tutorial, or the code was shown visually without being spoken.',
        },
      ],
    };
  }

  const byType: Record<string, typeof snippets> = {};
  for (const s of snippets) {
    if (!byType[s.type]) byType[s.type] = [];
    byType[s.type].push(s);
  }

  let response = `**Code Snippets & Commands Detected** (${snippets.length} found)\n\n`;

  for (const [type, items] of Object.entries(byType)) {
    response += `### ${type}\n`;
    for (const item of items.slice(0, 10)) {
      response += `\`[${formatTime(item.timestamp)}]\` \`${item.content}\`\n`;
    }
    if (items.length > 10) {
      response += `...and ${items.length - 10} more\n`;
    }
    response += '\n';
  }

  response += `\n*Tip: Use get_video_moment with a timestamp to see the code visually.*`;

  return { content: [{ type: 'text', text: truncateResponse(response) }] };
});

// ============================================
// get_tutorial_steps
// ============================================
handlers.set('get_tutorial_steps', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';

  const transcript = await ctx.transcriptService.getTranscript(videoId, language);
  const info = await ctx.transcriptService.getVideoInfo(videoId);

  const stepPatterns = [
    /\b(step\s*\d+|first|second|third|fourth|fifth|next|then|finally|lastly)\b[^.!?]*[.!?]/gi,
    /\b(first of all|to start|let's start|let's begin|starting with|begin by|you need to|you'll need to|make sure to|don't forget to)\b[^.!?]*[.!?]/gi,
    /\b(now we|now let's|now I'll|let me show|I'm going to|we're going to|we need to|we'll)\b[^.!?]*[.!?]/gi,
    /\b(go to|click on|open|create|add|install|run|type|enter|copy|paste|save|import|export|configure|set up|set|enable|disable)\b[^.!?]*[.!?]/gi,
  ];

  const steps: { timestamp: number; text: string; confidence: 'high' | 'medium' }[] = [];

  for (const segment of transcript.segments) {
    for (const pattern of stepPatterns) {
      const matches = segment.text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanText = match.trim();
          if (cleanText.length < 15) continue;
          if (
            steps.some((s) =>
              s.text.toLowerCase().includes(cleanText.toLowerCase().substring(0, 20))
            )
          )
            continue;

          const isHighConfidence = /\b(step\s*\d+|first|second|third|next|then|finally)\b/i.test(
            match
          );
          steps.push({
            timestamp: segment.start,
            text: cleanText,
            confidence: isHighConfidence ? 'high' : 'medium',
          });
        }
      }
    }
  }

  if (steps.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No clear step-by-step instructions detected. This video may not be a structured tutorial, or instructions are given in a different format.',
        },
      ],
    };
  }

  steps.sort((a, b) => a.timestamp - b.timestamp);

  const formatted = steps
    .slice(0, 25)
    .map((step, i) => {
      const timeLink = `https://youtube.com/watch?v=${videoId}&t=${Math.floor(step.timestamp)}`;
      return `**${i + 1}.** [${formatTime(step.timestamp)}](${timeLink})\n${step.text}`;
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `**Tutorial Steps: ${info.title}**\n\n${steps.length} instructional steps detected:\n\n${formatted}${steps.length > 25 ? `\n\n...and ${steps.length - 25} more steps` : ''}`,
      },
    ],
  };
});

// ============================================
// find_tech_stack
// ============================================
handlers.set('find_tech_stack', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';

  const transcript = await ctx.transcriptService.getTranscript(videoId, language);
  const info = await ctx.transcriptService.getVideoInfo(videoId);
  const fullText = transcript.fullText.toLowerCase();

  const techCategories: Record<string, { keywords: string[]; found: Set<string> }> = {
    Languages: {
      keywords: [
        'javascript',
        'typescript',
        'python',
        'java',
        'kotlin',
        'swift',
        'rust',
        'go',
        'golang',
        'c++',
        'c#',
        'ruby',
        'php',
        'scala',
        'elixir',
        'dart',
        'lua',
      ],
      found: new Set(),
    },
    'Frontend Frameworks': {
      keywords: [
        'react',
        'vue',
        'angular',
        'svelte',
        'next.js',
        'nextjs',
        'nuxt',
        'gatsby',
        'remix',
        'solid',
        'qwik',
        'astro',
        'htmx',
      ],
      found: new Set(),
    },
    'Backend Frameworks': {
      keywords: [
        'express',
        'fastify',
        'nest.js',
        'nestjs',
        'django',
        'flask',
        'fastapi',
        'spring',
        'rails',
        'laravel',
        'phoenix',
        'gin',
        'fiber',
        'actix',
      ],
      found: new Set(),
    },
    Databases: {
      keywords: [
        'postgresql',
        'postgres',
        'mysql',
        'mongodb',
        'redis',
        'sqlite',
        'dynamodb',
        'cassandra',
        'neo4j',
        'supabase',
        'prisma',
        'drizzle',
        'firebase',
      ],
      found: new Set(),
    },
    'Cloud & DevOps': {
      keywords: [
        'aws',
        'azure',
        'gcp',
        'google cloud',
        'vercel',
        'netlify',
        'heroku',
        'docker',
        'kubernetes',
        'k8s',
        'terraform',
        'github actions',
        'jenkins',
        'circleci',
      ],
      found: new Set(),
    },
    'Tools & Libraries': {
      keywords: [
        'webpack',
        'vite',
        'esbuild',
        'rollup',
        'babel',
        'eslint',
        'prettier',
        'jest',
        'vitest',
        'cypress',
        'playwright',
        'storybook',
        'tailwind',
        'sass',
        'styled-components',
      ],
      found: new Set(),
    },
    'AI/ML': {
      keywords: [
        'openai',
        'chatgpt',
        'gpt-4',
        'claude',
        'langchain',
        'llama',
        'hugging face',
        'tensorflow',
        'pytorch',
        'scikit-learn',
        'pandas',
        'numpy',
      ],
      found: new Set(),
    },
  };

  const searchText = `${fullText} ${info.description.toLowerCase()} ${info.keywords.join(' ').toLowerCase()}`;

  for (const [, data] of Object.entries(techCategories)) {
    for (const keyword of data.keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(searchText)) {
        data.found.add(keyword);
      }
    }
  }

  let response = `**Tech Stack Analysis: ${info.title}**\n\n`;
  let totalFound = 0;

  for (const [category, data] of Object.entries(techCategories)) {
    if (data.found.size > 0) {
      response += `### ${category}\n`;
      response += Array.from(data.found)
        .map((t) => `• ${t}`)
        .join('\n');
      response += '\n\n';
      totalFound += data.found.size;
    }
  }

  if (totalFound === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No specific technologies detected. This may not be a technical video, or technologies are referenced by different names.',
        },
      ],
    };
  }

  response += `\n**Total: ${totalFound} technologies detected**`;

  return { content: [{ type: 'text', text: response }] };
});

// ============================================
// convert_to_notes
// ============================================
handlers.set('convert_to_notes', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);
  const language = (args?.language as string) || 'en';
  const includeTimestamps = (args?.includeTimestamps as boolean) !== false;

  const transcript = await ctx.transcriptService.getTranscript(videoId, language);
  const info = await ctx.transcriptService.getVideoInfo(videoId);

  let notes = `# ${info.title}\n\n`;
  notes += `**Channel:** ${info.author}\n`;
  notes += `**URL:** https://youtube.com/watch?v=${videoId}\n`;
  notes += `**Duration:** ${Math.floor(info.lengthSeconds / 60)} minutes\n\n`;
  notes += `---\n\n`;
  notes += `## Summary\n\n`;
  notes += `> ${info.description.substring(0, 300)}${info.description.length > 300 ? '...' : ''}\n\n`;
  notes += `## Notes\n\n`;

  const chunkDuration = 120;
  let currentChunk = 0;
  let chunkText = '';

  for (const segment of transcript.segments) {
    const segmentChunk = Math.floor(segment.start / chunkDuration);

    if (segmentChunk > currentChunk && chunkText.length > 50) {
      const chunkStart = currentChunk * chunkDuration;
      if (includeTimestamps) {
        notes += `### [${formatTime(chunkStart)}](https://youtube.com/watch?v=${videoId}&t=${chunkStart})\n\n`;
      }
      const cleanChunk = chunkText.trim().replace(/\s+/g, ' ');
      notes += `${cleanChunk.substring(0, 300)}${cleanChunk.length > 300 ? '...' : ''}\n\n`;

      chunkText = '';
      currentChunk = segmentChunk;
    }

    chunkText += segment.text + ' ';
  }

  if (chunkText.length > 50) {
    const chunkStart = currentChunk * chunkDuration;
    if (includeTimestamps) {
      notes += `### [${formatTime(chunkStart)}](https://youtube.com/watch?v=${videoId}&t=${chunkStart})\n\n`;
    }
    const cleanChunk = chunkText.trim().replace(/\s+/g, ' ');
    notes += `${cleanChunk.substring(0, 300)}${cleanChunk.length > 300 ? '...' : ''}\n\n`;
  }

  if (info.keywords.length > 0) {
    notes += `---\n\n`;
    notes += `**Tags:** ${info.keywords
      .slice(0, 10)
      .map((k) => `\`${k}\``)
      .join(', ')}\n`;
  }

  return { content: [{ type: 'text', text: truncateResponse(notes, 30000) }] };
});

// ============================================
// find_github_links
// ============================================
handlers.set('find_github_links', async (args, ctx) => {
  const videoId = extractVideoId(args?.videoId as string);

  const info = await ctx.transcriptService.getVideoInfo(videoId);

  let transcriptText = '';
  try {
    const transcript = await ctx.transcriptService.getTranscript(videoId);
    transcriptText = transcript.fullText;
  } catch {
    // No transcript available
  }

  const searchText = `${info.description} ${transcriptText}`;

  const linkPatterns = [
    { regex: /https?:\/\/github\.com\/[\w-]+\/[\w.-]+/gi, type: 'GitHub Repo' },
    { regex: /https?:\/\/gist\.github\.com\/[\w-]+\/[\w]+/gi, type: 'GitHub Gist' },
    { regex: /https?:\/\/gitlab\.com\/[\w-]+\/[\w.-]+/gi, type: 'GitLab Repo' },
    { regex: /https?:\/\/bitbucket\.org\/[\w-]+\/[\w.-]+/gi, type: 'Bitbucket Repo' },
    { regex: /https?:\/\/codesandbox\.io\/s\/[\w-]+/gi, type: 'CodeSandbox' },
    { regex: /https?:\/\/stackblitz\.com\/[\w/@-]+/gi, type: 'StackBlitz' },
    { regex: /https?:\/\/codepen\.io\/[\w-]+\/pen\/[\w]+/gi, type: 'CodePen' },
    { regex: /https?:\/\/replit\.com\/@[\w-]+\/[\w-]+/gi, type: 'Replit' },
    { regex: /https?:\/\/npmjs\.com\/package\/[\w@/-]+/gi, type: 'npm Package' },
    { regex: /https?:\/\/pypi\.org\/project\/[\w-]+/gi, type: 'PyPI Package' },
  ];

  const links: { url: string; type: string }[] = [];

  for (const pattern of linkPatterns) {
    const matches = searchText.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        if (!links.some((l) => l.url === match)) {
          links.push({ url: match, type: pattern.type });
        }
      }
    }
  }

  if (links.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: "No GitHub or code repository links found in this video's description or transcript. The creator may not have shared code resources, or they're shared verbally (check pinned comments or community tab).",
        },
      ],
    };
  }

  const byType: Record<string, string[]> = {};
  for (const link of links) {
    if (!byType[link.type]) byType[link.type] = [];
    byType[link.type].push(link.url);
  }

  let response = `**Code Resources Found** (${links.length} links)\n\n`;

  for (const [type, urls] of Object.entries(byType)) {
    response += `### ${type}\n`;
    for (const url of urls) {
      response += `• ${url}\n`;
    }
    response += '\n';
  }

  response += `\n*These links were extracted from the video description and transcript.*`;

  return { content: [{ type: 'text', text: response }] };
});

export const developerHandlers: HandlerModule = {
  handlers,
  requiresApiKey: false,
};
