import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { getConfig } from './config.js';
import { hasApiKey } from './auth/index.js';
import { YouTubeAPIService } from './services/youtube-api.js';
import { TranscriptService } from './services/transcript.js';
import { CacheService } from './services/cache.js';
import { getAllTools, handleToolCall } from './tools/index.js';
import { sanitizeErrorMessage, logError } from './utils/errors.js';

export async function createServer() {
  const config = getConfig();
  const hasKey = hasApiKey();

  // YouTube API service - only create if we have an API key
  const youtubeApi =
    hasKey && config.youtubeApiKey ? new YouTubeAPIService(config.youtubeApiKey) : null;

  const transcriptService = new TranscriptService();
  const cache = new CacheService(config.cacheTtl);

  // Get available tools based on API key availability
  const availableTools = getAllTools(hasKey);

  const server = new Server(
    {
      name: 'tubepilot',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: availableTools,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      return await handleToolCall(name, args, {
        youtubeApi,
        transcriptService,
        cache,
      });
    } catch (error) {
      logError(`Tool ${name}`, error);
      const message = sanitizeErrorMessage(error);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  return server;
}

export async function runServer() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const mode = hasApiKey() ? 'full mode' : 'transcript-only mode (no API key)';
  console.error(`TubePilot MCP server running in ${mode}`);
}
