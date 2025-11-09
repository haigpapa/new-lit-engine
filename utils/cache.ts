/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Simple LRU (Least Recently Used) Cache implementation
 */

interface CacheOptions {
  max?: number;
  ttl?: number;
}

class LRUCache<T = any> {
  private max: number;
  private ttl: number;
  private cache: Map<string, T>;
  private timestamps: Map<string, number>;

  constructor(options: CacheOptions = {}) {
    this.max = options.max || 100; // Maximum number of items
    this.ttl = options.ttl || 3600000; // Time to live in ms (default 1 hour)
    this.cache = new Map();
    this.timestamps = new Map();
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Check if entry has expired
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value!);
    this.timestamps.set(key, Date.now());

    return value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    // Delete if already exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    if (!this.cache.has(key)) {
      return false;
    }

    // Check expiration
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    // Clean expired entries before returning size
    this.cleanExpired();
    return this.cache.size;
  }

  /**
   * Remove all expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.ttl) {
        this.delete(key);
      }
    }
  }
}

// Create singleton instances for different cache types
export const apiCache = new LRUCache({ max: 100, ttl: 3600000 }); // 1 hour
export const llmCache = new LRUCache({ max: 50, ttl: 7200000 }); // 2 hours
export const imageCache = new LRUCache({ max: 200, ttl: 86400000 }); // 24 hours

export default LRUCache;
