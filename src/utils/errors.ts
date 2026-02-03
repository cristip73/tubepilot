/**
 * Error handling utilities for safe error responses
 * Prevents leaking internal details to clients
 */

// Patterns that might indicate sensitive information
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /password/i,
  /secret/i,
  /credential/i,
  /auth/i,
  /bearer/i,
  /\.env/i,
  /config.*\.json/i,
];

// Known safe error messages that can be passed through
const SAFE_ERROR_PREFIXES = [
  'Video not found',
  'Channel not found',
  'Playlist not found',
  'No captions available',
  'Video not available',
  'Could not extract video ID',
  'Could not fetch transcript',
  'Invalid video ID',
  'Request timed out',
  'Video ID or URL is required',
  'Channel ID or URL is required',
  'Playlist ID or URL is required',
  'Input too long',
];

/**
 * Sanitize an error message before returning to client
 * Removes potentially sensitive information
 */
export function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // Check if this is a known safe error
  for (const prefix of SAFE_ERROR_PREFIXES) {
    if (message.startsWith(prefix)) {
      return message;
    }
  }

  // Check for sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      console.error('[Security] Blocked sensitive error:', message);
      return 'An error occurred while processing your request';
    }
  }

  // Truncate long error messages
  if (message.length > 500) {
    return message.substring(0, 500) + '...';
  }

  // Remove stack traces if present
  const stackIndex = message.indexOf('\n    at ');
  if (stackIndex > 0) {
    return message.substring(0, stackIndex);
  }

  return message;
}

/**
 * Create a user-friendly error response
 */
export function createErrorResponse(error: unknown): {
  content: { type: 'text'; text: string }[];
  isError: true;
} {
  const message = sanitizeErrorMessage(error);

  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * Log an error internally with full details
 * Use this before sanitizing for client response
 */
export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Log to stderr (won't be sent to MCP client)
  console.error(`[${timestamp}] [ERROR] ${context}:`, message);
  if (stack) {
    console.error(stack);
  }
}
