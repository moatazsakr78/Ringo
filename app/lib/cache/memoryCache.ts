// Optimized memory cache service for POS system
// Provides intelligent caching with TTL and cache invalidation

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  size: number
}

export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  }

  // Default TTL: 5 minutes for products data
  private DEFAULT_TTL = 5 * 60 * 1000 

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL): void {
    // Clean expired items before adding new ones
    this.cleanExpired()

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      key
    }

    this.cache.set(key, item)
    this.stats.sets++
    this.stats.size = this.cache.size
  }

  /**
   * Get data from cache if not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key)
      this.stats.deletes++
      this.stats.misses++
      this.stats.size = this.cache.size
      return null
    }

    this.stats.hits++
    return item.data as T
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key)
      this.stats.deletes++
      this.stats.size = this.cache.size
      return false
    }
    
    return true
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.stats.deletes++
      this.stats.size = this.cache.size
    }
    return deleted
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    }
  }

  /**
   * Clean expired items
   */
  private cleanExpired(): void {
    const now = Date.now()
    const toDelete: string[] = []

    this.cache.forEach((item, key) => {
      if (now > item.timestamp + item.ttl) {
        toDelete.push(key)
      }
    })

    toDelete.forEach(key => {
      this.cache.delete(key)
      this.stats.deletes++
    })

    this.stats.size = this.cache.size
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses
    return total > 0 ? this.stats.hits / total : 0
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): number {
    let deletedCount = 0
    const regex = new RegExp(pattern)

    this.cache.forEach((item, key) => {
      if (regex.test(key)) {
        this.cache.delete(key)
        deletedCount++
        this.stats.deletes++
      }
    })

    this.stats.size = this.cache.size
    return deletedCount
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttlMs: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    this.set(key, data, ttlMs)
    return data
  }
}

// Global cache instance
export const cache = new MemoryCache()

// Cache key generators for consistent naming
export const CacheKeys = {
  products: () => 'products:all',
  productById: (id: string) => `product:${id}`,
  branches: () => 'branches:all',
  categories: () => 'categories:all',
  inventory: (productId: string) => `inventory:${productId}`,
  variants: (productId: string) => `variants:${productId}`,
  productsWithData: () => 'products:enriched',
  // Dashboard cache keys
  dashboardKPIs: () => 'dashboard:kpis',
  dashboardSalesTrend: () => 'dashboard:salesTrend',
  dashboardTopProducts: () => 'dashboard:topProducts',
  dashboardTopCustomers: () => 'dashboard:topCustomers',
  dashboardRecentOrders: () => 'dashboard:recentOrders',
  dashboardLowStock: () => 'dashboard:lowStock',
  dashboardAll: () => 'dashboard:all',
} as const

// Cache TTL constants
export const CacheTTL = {
  products: 5 * 60 * 1000,      // 5 minutes
  branches: 10 * 60 * 1000,     // 10 minutes
  categories: 15 * 60 * 1000,   // 15 minutes
  inventory: 2 * 60 * 1000,     // 2 minutes (more dynamic)
  variants: 3 * 60 * 1000,      // 3 minutes
  // Dashboard TTLs
  dashboardKPIs: 30 * 1000,        // 30 seconds (sensitive data)
  dashboardCharts: 2 * 60 * 1000,  // 2 minutes
  dashboardOrders: 30 * 1000,      // 30 seconds
  dashboardStock: 60 * 1000,       // 1 minute
  dashboardAll: 30 * 1000,         // 30 seconds (main cache)
} as const