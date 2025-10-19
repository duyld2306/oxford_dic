/**
 * Cache Utilities
 * In-memory caching with TTL support
 * Can be extended to use Redis in production
 * 
 * Design Pattern: Strategy Pattern
 * Allows switching between in-memory and Redis cache
 */

/**
 * In-Memory Cache Implementation
 */
class InMemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set cache value with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, value, ttl = 3600) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set value
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);

    this.timers.set(key, timer);
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    // Delete from cache
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache size
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all keys
   * @returns {Array<string>}
   */
  keys() {
    return Array.from(this.cache.keys());
  }
}

/**
 * Cache Manager
 * Provides high-level caching operations
 */
class CacheManager {
  constructor(cacheImpl = null) {
    this.cache = cacheImpl || new InMemoryCache();
  }

  /**
   * Get or set cache value
   * @param {string} key - Cache key
   * @param {Function} factory - Factory function to generate value
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<*>} Cached or generated value
   */
  async getOrSet(key, factory, ttl = 3600) {
    // Try to get from cache
    const cached = this.cache.get(key);

    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Cache it
    this.cache.set(key, value, ttl);

    return value;
  }

  /**
   * Invalidate cache by pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   */
  invalidatePattern(pattern) {
    const keys = this.cache.keys();
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Wrap function with caching
   * @param {Function} fn - Function to wrap
   * @param {Object} options - Cache options
   * @returns {Function} Wrapped function
   */
  wrap(fn, options = {}) {
    const { keyGenerator, ttl = 3600 } = options;

    return async (...args) => {
      // Generate cache key
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

      return this.getOrSet(key, () => fn(...args), ttl);
    };
  }

  /**
   * Set cache value
   */
  set(key, value, ttl) {
    return this.cache.set(key, value, ttl);
  }

  /**
   * Get cache value
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    return this.cache.clear();
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.cache.has(key);
  }
}

// Create singleton cache manager
const cacheManager = new CacheManager();

/**
 * Cache decorator for methods
 * @param {Object} options - Cache options
 */
export const cached = (options = {}) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    const { ttl = 3600, keyPrefix = "" } = options;

    descriptor.value = async function (...args) {
      const key = `${keyPrefix}${propertyKey}:${JSON.stringify(args)}`;
      return cacheManager.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
};

export { InMemoryCache, CacheManager };
export default cacheManager;

