/**
 * Rate limit tracker for Anthropic API
 * Tracks token usage in 5-hour and 7-day rolling windows
 */

interface TokenUsageEntry {
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
}

interface RateLimitWindow {
  durationMs: number;
  maxTokens: number;
  label: string;
}

// Default limits for Claude API (can be configured based on tier)
// These are conservative estimates - actual limits depend on user's tier
const DEFAULT_LIMITS = {
  fiveHour: 400_000, // 400K tokens per 5 hours (tier 1)
  sevenDay: 5_000_000, // 5M tokens per 7 days (tier 1)
};

const WINDOWS: Record<'5h' | '7d', RateLimitWindow> = {
  '5h': {
    durationMs: 5 * 60 * 60 * 1000, // 5 hours
    maxTokens: DEFAULT_LIMITS.fiveHour,
    label: '5h',
  },
  '7d': {
    durationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxTokens: DEFAULT_LIMITS.sevenDay,
    label: '7d',
  },
};

class RateLimitTracker {
  private usageHistory: TokenUsageEntry[] = [];
  private readonly maxHistoryAge = WINDOWS['7d'].durationMs;

  /**
   * Record a new API call with token usage
   */
  recordUsage(inputTokens: number, outputTokens: number): void {
    const now = Date.now();
    this.usageHistory.push({
      timestamp: now,
      inputTokens,
      outputTokens,
    });

    // Clean up old entries beyond 7 days
    this.cleanup(now);
  }

  /**
   * Remove entries older than the longest window (7 days)
   */
  private cleanup(now: number): void {
    const cutoff = now - this.maxHistoryAge;
    this.usageHistory = this.usageHistory.filter(entry => entry.timestamp >= cutoff);
  }

  /**
   * Calculate total tokens used in a specific time window
   */
  private calculateUsageInWindow(windowMs: number, now: number = Date.now()): number {
    const cutoff = now - windowMs;
    return this.usageHistory
      .filter(entry => entry.timestamp >= cutoff)
      .reduce((sum, entry) => sum + entry.inputTokens + entry.outputTokens, 0);
  }

  /**
   * Get usage statistics for the 5-hour window
   */
  get5hUsage(): { used: number; limit: number; resetTime: Date } {
    const now = Date.now();
    const window = WINDOWS['5h'];
    const used = this.calculateUsageInWindow(window.durationMs, now);

    // Find the oldest entry in the window to calculate reset time
    const cutoff = now - window.durationMs;
    const oldestEntry = this.usageHistory.find(entry => entry.timestamp >= cutoff);
    const resetTime = oldestEntry
      ? new Date(oldestEntry.timestamp + window.durationMs)
      : new Date(now + window.durationMs);

    return {
      used,
      limit: window.maxTokens,
      resetTime,
    };
  }

  /**
   * Get usage statistics for the 7-day window
   */
  get7dUsage(): { used: number; limit: number; resetTime: Date } {
    const now = Date.now();
    const window = WINDOWS['7d'];
    const used = this.calculateUsageInWindow(window.durationMs, now);

    // Find the oldest entry in the window to calculate reset time
    const cutoff = now - window.durationMs;
    const oldestEntry = this.usageHistory.find(entry => entry.timestamp >= cutoff);
    const resetTime = oldestEntry
      ? new Date(oldestEntry.timestamp + window.durationMs)
      : new Date(now + window.durationMs);

    return {
      used,
      limit: window.maxTokens,
      resetTime,
    };
  }

  /**
   * Update rate limits based on tier (optional configuration)
   */
  setLimits(fiveHour?: number, sevenDay?: number): void {
    if (fiveHour !== undefined) {
      WINDOWS['5h'].maxTokens = fiveHour;
    }
    if (sevenDay !== undefined) {
      WINDOWS['7d'].maxTokens = sevenDay;
    }
  }

  /**
   * Get current configured limits
   */
  getLimits(): { fiveHour: number; sevenDay: number } {
    return {
      fiveHour: WINDOWS['5h'].maxTokens,
      sevenDay: WINDOWS['7d'].maxTokens,
    };
  }

  /**
   * Clear all history (for testing or reset)
   */
  clear(): void {
    this.usageHistory = [];
  }
}

// Global singleton instance
export const rateLimitTracker = new RateLimitTracker();

/**
 * Format tokens with K/M suffix
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format time remaining until reset
 */
export function formatTimeUntilReset(resetTime: Date): string {
  const now = Date.now();
  const diffMs = resetTime.getTime() - now;

  if (diffMs <= 0) {
    return 'now';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${days}d`;
  }

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  return `${minutes}m`;
}
