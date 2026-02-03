import { YouTubeAPIService } from '../services/youtube-api.js';
import { TranscriptService } from '../services/transcript.js';
import { CacheService } from '../services/cache.js';

/**
 * Context passed to all tool handlers
 */
export interface ToolContext {
  youtubeApi: YouTubeAPIService | null;
  transcriptService: TranscriptService;
  cache: CacheService;
}

/**
 * Content types supported by MCP
 */
export type TextContent = { type: 'text'; text: string };
export type ImageContent = { type: 'image'; data: string; mimeType: string };
export type ContentItem = TextContent | ImageContent;

/**
 * Standard tool result format
 * Index signature allows MCP SDK compatibility
 */
export interface ToolResult {
  [key: string]: unknown;
  content: ContentItem[];
  isError?: boolean;
}

/**
 * Tool handler function signature
 */
export type ToolHandler = (
  args: Record<string, unknown> | undefined,
  ctx: ToolContext
) => Promise<ToolResult>;

/**
 * Handler module interface - each handler file exports this
 */
export interface HandlerModule {
  /** Map of tool names to their handlers */
  handlers: Map<string, ToolHandler>;
  /** Whether these handlers require API key */
  requiresApiKey: boolean;
}

/**
 * Response formatting constants
 */
export const MAX_RESPONSE_LENGTH = 15000;
export const MAX_TRANSCRIPT_LENGTH = 30000;

/**
 * Truncate response to prevent context overflow
 */
export function truncateResponse(text: string, maxLength: number = MAX_RESPONSE_LENGTH): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint = lastNewline > maxLength * 0.8 ? lastNewline : maxLength;
  return truncated.substring(0, cutPoint) + '\n\n...[Response truncated for context efficiency]';
}

/**
 * Format timestamp seconds to readable string
 */
export function formatTime(secs: number): string {
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${mins}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse timestamp string to seconds
 */
export function parseTimestamp(ts: string): number {
  if (ts.includes(':')) {
    const parts = ts.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  return parseInt(ts, 10);
}
