/**
 * Handler Registry - Collects all tool handlers from modular files
 *
 * Adding new tools:
 * 1. Create a new handler file (e.g., my-handlers.ts)
 * 2. Export a HandlerModule with your handlers
 * 3. Import and register it here
 */
import { HandlerModule, ToolHandler, ToolContext, ToolResult } from '../types.js';
import { coreHandlers } from './core-handlers.js';
import { developerHandlers } from './developer-handlers.js';
import { contentHandlers } from './content-handlers.js';
import { apiHandlers } from './api-handlers.js';
import { enhancedHandlers } from './enhanced-handlers.js';
import { getApiKeyInstructions } from '../../auth/index.js';

// Register all handler modules
const handlerModules: HandlerModule[] = [
  coreHandlers,
  developerHandlers,
  contentHandlers,
  apiHandlers,
  enhancedHandlers,
];

// Build unified handler map
const allHandlers = new Map<string, { handler: ToolHandler; requiresApiKey: boolean }>();

for (const module of handlerModules) {
  for (const [name, handler] of module.handlers) {
    allHandlers.set(name, { handler, requiresApiKey: module.requiresApiKey });
  }
}

/**
 * Main entry point for tool execution
 * Routes to appropriate handler based on tool name
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
  ctx: ToolContext
): Promise<ToolResult> {
  const entry = allHandlers.get(name);

  if (!entry) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  // Check API key requirement
  if (entry.requiresApiKey && !ctx.youtubeApi) {
    return {
      content: [{ type: 'text', text: getApiKeyInstructions() }],
      isError: true,
    };
  }

  return entry.handler(args, ctx);
}

/**
 * Get list of all registered tool names
 */
export function getRegisteredTools(): string[] {
  return Array.from(allHandlers.keys());
}

/**
 * Check if a tool requires API key
 */
export function toolRequiresApiKey(name: string): boolean {
  return allHandlers.get(name)?.requiresApiKey ?? false;
}

// Re-export types for convenience
export type { ToolContext, ToolResult } from '../types.js';
