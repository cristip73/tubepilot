/**
 * Tool Handlers - Entry Point
 *
 * This file re-exports the modular handler system.
 * All actual handlers are in the handlers/ directory:
 *
 * - handlers/core-handlers.ts     - Video info, transcripts (free)
 * - handlers/developer-handlers.ts - Code extraction, tech stack (free)
 * - handlers/content-handlers.ts  - Summary, Q&A, outline (free)
 * - handlers/api-handlers.ts      - API key required tools
 *
 * To add new tools:
 * 1. Add to existing handler file, OR
 * 2. Create new handler file and register in handlers/index.ts
 */

export { handleToolCall, getRegisteredTools, toolRequiresApiKey } from './handlers/index.js';
export type { ToolContext, ToolResult } from './types.js';
