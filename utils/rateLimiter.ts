/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Client-side rate limiter to prevent API abuse
 */

import type { RateLimitResult } from '../types'

interface RateLimiterOptions {
  max?: number;
  window?: number;
}

class RateLimiter {
  private max: number;
  private window: number;
  private timestamps: number[];

  constructor(options: RateLimiterOptions = {}) {
    this.max = options.max || 10; // Maximum requests
    this.window = options.window || 60000; // Time window in ms (default 1 minute)
    this.timestamps = [];
  }

  /**
   * Check if a request is allowed
   */
  check(): RateLimitResult {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.timestamps = this.timestamps.filter(
      timestamp => now - timestamp < this.window
    );

    if (this.timestamps.length >= this.max) {
      // Calculate when the oldest request will expire
      const oldestTimestamp = this.timestamps[0];
      const retryAfter = this.window - (now - oldestTimestamp);

      return {
        allowed: false,
        retryAfter: Math.ceil(retryAfter / 1000) // Convert to seconds
      };
    }

    // Record this request
    this.timestamps.push(now);
    return { allowed: true };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.timestamps = [];
  }

  /**
   * Get the number of remaining requests in the current window
   */
  get remaining(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      timestamp => now - timestamp < this.window
    );
    return Math.max(0, this.max - this.timestamps.length);
  }
}

// Create singleton instances for different rate limits
export const searchRateLimiter = new RateLimiter({ max: 10, window: 60000 }); // 10 searches per minute
export const expansionRateLimiter = new RateLimiter({ max: 20, window: 60000 }); // 20 expansions per minute
export const apiRateLimiter = new RateLimiter({ max: 50, window: 60000 }); // 50 API calls per minute

export default RateLimiter;
