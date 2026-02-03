/**
 * Rate Limiter Service
 * Prevents API quota exhaustion with token bucket algorithm
 */

interface RateLimitConfig {
  maxRequests: number; // Max requests in window
  windowMs: number; // Time window in milliseconds
  retryAfterMs?: number; // Default retry delay
}

interface RateLimitState {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private state: Map<string, RateLimitState> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests ?? 100, // 100 requests
      windowMs: config.windowMs ?? 60000, // per minute
      retryAfterMs: config.retryAfterMs ?? 1000, // 1 second default retry
    };
  }

  /**
   * Check if request is allowed under rate limit
   * @param key - Identifier for rate limit bucket (e.g., 'youtube-api', 'transcript')
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string = 'default'): boolean {
    this.refillTokens(key);
    const state = this.getState(key);

    if (state.tokens > 0) {
      state.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Wait until request is allowed (blocking)
   * @param key - Identifier for rate limit bucket
   * @param maxWaitMs - Maximum time to wait (default 30s)
   */
  async waitForAllowance(key: string = 'default', maxWaitMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (!this.isAllowed(key)) {
      if (Date.now() - startTime > maxWaitMs) {
        throw new Error('Rate limit exceeded - max wait time reached');
      }

      // Wait before retry
      await this.sleep(this.config.retryAfterMs || 1000);
    }
  }

  /**
   * Get time until next token is available
   */
  getRetryAfterMs(key: string = 'default'): number {
    const state = this.getState(key);
    const timeSinceLastRefill = Date.now() - state.lastRefill;
    const msPerToken = this.config.windowMs / this.config.maxRequests;

    if (state.tokens > 0) return 0;

    return Math.max(0, msPerToken - timeSinceLastRefill);
  }

  /**
   * Get current rate limit status
   */
  getStatus(key: string = 'default'): {
    remaining: number;
    limit: number;
    resetMs: number;
  } {
    this.refillTokens(key);
    const state = this.getState(key);

    return {
      remaining: Math.floor(state.tokens),
      limit: this.config.maxRequests,
      resetMs: this.config.windowMs - (Date.now() - state.lastRefill),
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string = 'default'): void {
    this.state.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.state.clear();
  }

  private getState(key: string): RateLimitState {
    if (!this.state.has(key)) {
      this.state.set(key, {
        tokens: this.config.maxRequests,
        lastRefill: Date.now(),
      });
    }
    return this.state.get(key)!;
  }

  private refillTokens(key: string): void {
    const state = this.getState(key);
    const now = Date.now();
    const timePassed = now - state.lastRefill;

    // Calculate tokens to add based on time passed
    const tokensToAdd = (timePassed / this.config.windowMs) * this.config.maxRequests;

    if (tokensToAdd > 0) {
      state.tokens = Math.min(this.config.maxRequests, state.tokens + tokensToAdd);
      state.lastRefill = now;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Pre-configured rate limiters for different APIs
export const youtubeApiLimiter = new RateLimiter({
  maxRequests: 100, // YouTube API quota is complex, this is conservative
  windowMs: 60000, // Per minute
});

export const transcriptLimiter = new RateLimiter({
  maxRequests: 30, // Transcript fetching (no official API)
  windowMs: 60000,
});
