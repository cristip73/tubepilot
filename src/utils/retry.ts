/**
 * Retry Utility with Exponential Backoff
 * Handles transient failures gracefully
 */

export interface RetryOptions {
  maxRetries?: number;        // Maximum retry attempts
  initialDelayMs?: number;    // Initial delay before first retry
  maxDelayMs?: number;        // Maximum delay cap
  backoffMultiplier?: number; // Multiplier for exponential backoff
  retryableErrors?: string[]; // Error messages that should trigger retry
  onRetry?: (error: Error, attempt: number) => void; // Callback on retry
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryableErrors'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// Errors that are typically transient and worth retrying
const DEFAULT_RETRYABLE_PATTERNS = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'socket hang up',
  'network',
  'timeout',
  'rate limit',
  '429',
  '503',
  '502',
  'temporarily unavailable',
];

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const retryablePatterns = options.retryableErrors ?? DEFAULT_RETRYABLE_PATTERNS;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is the last attempt
      if (attempt === opts.maxRetries) {
        throw lastError;
      }

      // Check if error is retryable
      const isRetryable = isRetryableError(lastError, retryablePatterns);
      if (!isRetryable) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const baseDelay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt);
      const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
      const delay = Math.min(baseDelay + jitter, opts.maxDelayMs);

      // Call retry callback if provided
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt + 1);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new Error('Retry failed');
}

/**
 * Check if an error is retryable based on patterns
 */
function isRetryableError(error: Error, patterns: string[]): boolean {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  return patterns.some(pattern => {
    const p = pattern.toLowerCase();
    return message.includes(p) || name.includes(p);
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Decorator-style retry wrapper for class methods
 */
export function retryable(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Create a retryable version of any async function
 */
export function makeRetryable<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}
