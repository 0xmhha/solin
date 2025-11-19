/**
 * Cache Manager
 *
 * Provides caching for analysis results to improve performance
 * when analyzing the same files repeatedly.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { FileAnalysisResult } from './types';

/**
 * Cache entry for a single file
 */
export interface CacheEntry {
  /**
   * File content hash
   */
  hash: string;

  /**
   * Cached analysis result
   */
  result: FileAnalysisResult;

  /**
   * Timestamp when entry was created
   */
  createdAt: number;

  /**
   * Rule configuration hash (to invalidate when config changes)
   */
  configHash: string;
}

/**
 * Cache metadata
 */
export interface CacheMetadata {
  /**
   * Cache version (for compatibility)
   */
  version: string;

  /**
   * Last cleanup timestamp
   */
  lastCleanup: number;

  /**
   * Total entries in cache
   */
  entryCount: number;
}

/**
 * Cache manager options
 */
export interface CacheManagerOptions {
  /**
   * Directory to store cache files
   * @default '.solin-cache'
   */
  cacheDirectory?: string;

  /**
   * Time-to-live for cache entries in milliseconds
   * @default 7 * 24 * 60 * 60 * 1000 (7 days)
   */
  ttl?: number;

  /**
   * Maximum number of entries in cache
   * @default 10000
   */
  maxEntries?: number;

  /**
   * Whether to use file system cache
   * @default true
   */
  useFileSystem?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

/**
 * Cache Manager
 *
 * Manages caching of analysis results for improved performance.
 */
export class CacheManager {
  private readonly cacheDirectory: string;
  private readonly ttl: number;
  private readonly maxEntries: number;
  private readonly useFileSystem: boolean;

  private memoryCache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };

  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly METADATA_FILE = 'metadata.json';
  private static readonly CACHE_FILE = 'cache.json';

  constructor(options: CacheManagerOptions = {}) {
    this.cacheDirectory = options.cacheDirectory || '.solin-cache';
    this.ttl = options.ttl || 7 * 24 * 60 * 60 * 1000; // 7 days
    this.maxEntries = options.maxEntries || 10000;
    this.useFileSystem = options.useFileSystem !== false;
  }

  /**
   * Get cached result for a file
   */
  get(
    filePath: string,
    content: string,
    configHash: string,
  ): FileAnalysisResult | undefined {
    const key = this.getKey(filePath);
    const contentHash = this.hashContent(content);

    // Try memory cache first
    const entry = this.memoryCache.get(key);

    if (entry) {
      // Validate entry
      if (
        entry.hash === contentHash &&
        entry.configHash === configHash &&
        !this.isExpired(entry)
      ) {
        this.stats.hits++;
        return entry.result;
      } else {
        // Invalid entry, remove it
        this.memoryCache.delete(key);
      }
    }

    this.stats.misses++;
    return undefined;
  }

  /**
   * Set cached result for a file
   */
  set(
    filePath: string,
    content: string,
    configHash: string,
    result: FileAnalysisResult,
  ): void {
    const key = this.getKey(filePath);
    const contentHash = this.hashContent(content);

    const entry: CacheEntry = {
      hash: contentHash,
      result,
      createdAt: Date.now(),
      configHash,
    };

    this.memoryCache.set(key, entry);
    this.stats.size = this.memoryCache.size;

    // Evict if necessary
    if (this.memoryCache.size > this.maxEntries) {
      this.evictOldest();
    }
  }

  /**
   * Check if a file has a valid cache entry
   */
  has(filePath: string, content: string, configHash: string): boolean {
    return this.get(filePath, content, configHash) !== undefined;
  }

  /**
   * Invalidate cache for a specific file
   */
  invalidate(filePath: string): void {
    const key = this.getKey(filePath);
    this.memoryCache.delete(key);
    this.stats.size = this.memoryCache.size;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  /**
   * Save cache to disk
   */
  async save(): Promise<void> {
    if (!this.useFileSystem) {
      return;
    }

    try {
      // Ensure cache directory exists
      await fs.promises.mkdir(this.cacheDirectory, { recursive: true });

      // Prepare cache data
      const cacheData: Record<string, CacheEntry> = {};
      for (const [key, entry] of this.memoryCache) {
        cacheData[key] = entry;
      }

      // Write cache file
      const cacheFilePath = path.join(this.cacheDirectory, CacheManager.CACHE_FILE);
      await fs.promises.writeFile(
        cacheFilePath,
        JSON.stringify(cacheData, null, 2),
        'utf-8',
      );

      // Write metadata
      const metadata: CacheMetadata = {
        version: CacheManager.CACHE_VERSION,
        lastCleanup: Date.now(),
        entryCount: this.memoryCache.size,
      };

      const metadataFilePath = path.join(
        this.cacheDirectory,
        CacheManager.METADATA_FILE,
      );
      await fs.promises.writeFile(
        metadataFilePath,
        JSON.stringify(metadata, null, 2),
        'utf-8',
      );
    } catch (error) {
      // Silently fail - caching is optional
      console.error(
        'Failed to save cache:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Load cache from disk
   */
  async load(): Promise<void> {
    if (!this.useFileSystem) {
      return;
    }

    try {
      const metadataFilePath = path.join(
        this.cacheDirectory,
        CacheManager.METADATA_FILE,
      );

      // Check if cache exists
      if (!fs.existsSync(metadataFilePath)) {
        return;
      }

      // Load metadata
      const metadataContent = await fs.promises.readFile(metadataFilePath, 'utf-8');
      const metadata = JSON.parse(metadataContent) as CacheMetadata;

      // Check version compatibility
      if (metadata.version !== CacheManager.CACHE_VERSION) {
        // Incompatible version, clear cache
        await this.deleteCache();
        return;
      }

      // Load cache data
      const cacheFilePath = path.join(this.cacheDirectory, CacheManager.CACHE_FILE);
      const cacheContent = await fs.promises.readFile(cacheFilePath, 'utf-8');
      const cacheData = JSON.parse(cacheContent) as Record<string, CacheEntry>;

      // Load entries into memory, filtering expired ones
      for (const [key, entry] of Object.entries(cacheData)) {
        if (!this.isExpired(entry)) {
          this.memoryCache.set(key, entry);
        }
      }

      this.stats.size = this.memoryCache.size;
    } catch (error) {
      // Silently fail - start with empty cache
      console.error(
        'Failed to load cache:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Delete cache from disk
   */
  async deleteCache(): Promise<void> {
    if (!this.useFileSystem) {
      return;
    }

    try {
      const cacheFilePath = path.join(this.cacheDirectory, CacheManager.CACHE_FILE);
      const metadataFilePath = path.join(
        this.cacheDirectory,
        CacheManager.METADATA_FILE,
      );

      if (fs.existsSync(cacheFilePath)) {
        await fs.promises.unlink(cacheFilePath);
      }

      if (fs.existsSync(metadataFilePath)) {
        await fs.promises.unlink(metadataFilePath);
      }
    } catch (error) {
      // Silently fail
      console.error(
        'Failed to delete cache:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removed = 0;

    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    this.stats.size = this.memoryCache.size;
    return removed;
  }

  /**
   * Hash content to create a unique identifier
   */
  hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Hash configuration to detect config changes
   */
  hashConfig(config: unknown): string {
    const configString = JSON.stringify(config, Object.keys(config as object).sort());
    return crypto.createHash('md5').update(configString).digest('hex');
  }

  /**
   * Get cache key for a file path
   */
  private getKey(filePath: string): string {
    // Normalize path for consistent keys
    return path.normalize(filePath).toLowerCase();
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > this.ttl;
  }

  /**
   * Evict the oldest entries when cache is full
   */
  private evictOldest(): void {
    // Find oldest entries
    const entries = Array.from(this.memoryCache.entries()).sort(
      (a, b) => a[1].createdAt - b[1].createdAt,
    );

    // Remove 10% of oldest entries
    const toRemove = Math.ceil(this.maxEntries * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        this.memoryCache.delete(entry[0]);
      }
    }

    this.stats.size = this.memoryCache.size;
  }
}

/**
 * Create a cache manager with default options
 */
export function createCacheManager(
  options?: CacheManagerOptions,
): CacheManager {
  return new CacheManager(options);
}
