/**
 * Cache Manager Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CacheManager,
  createCacheManager,
} from '@core/cache-manager';
import type { FileAnalysisResult } from '@core/types';
import { Severity, Category } from '@core/types';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  const testCacheDir = '/tmp/solin-cache-test';

  // Sample analysis result for testing
  const sampleResult: FileAnalysisResult = {
    filePath: '/test/sample.sol',
    issues: [
      {
        ruleId: 'test/rule',
        severity: Severity.WARNING,
        category: Category.LINT,
        message: 'Test issue',
        filePath: '/test/sample.sol',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 },
        },
      },
    ],
    duration: 100,
  };

  beforeEach(() => {
    cacheManager = new CacheManager({
      cacheDirectory: testCacheDir,
      useFileSystem: false,
    });
  });

  afterEach(async () => {
    // Clean up test cache directory
    try {
      if (fs.existsSync(testCacheDir)) {
        await fs.promises.rm(testCacheDir, { recursive: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic operations', () => {
    test('should set and get cache entry', () => {
      const filePath = '/test/file.sol';
      const content = 'pragma solidity ^0.8.0;';
      const configHash = 'config123';

      cacheManager.set(filePath, content, configHash, sampleResult);
      const result = cacheManager.get(filePath, content, configHash);

      expect(result).toEqual(sampleResult);
    });

    test('should return undefined for non-existent entry', () => {
      const result = cacheManager.get('/nonexistent.sol', 'content', 'config');
      expect(result).toBeUndefined();
    });

    test('should check if entry exists', () => {
      const filePath = '/test/file.sol';
      const content = 'pragma solidity ^0.8.0;';
      const configHash = 'config123';

      expect(cacheManager.has(filePath, content, configHash)).toBe(false);

      cacheManager.set(filePath, content, configHash, sampleResult);

      expect(cacheManager.has(filePath, content, configHash)).toBe(true);
    });

    test('should invalidate specific entry', () => {
      const filePath = '/test/file.sol';
      const content = 'pragma solidity ^0.8.0;';
      const configHash = 'config123';

      cacheManager.set(filePath, content, configHash, sampleResult);
      expect(cacheManager.has(filePath, content, configHash)).toBe(true);

      cacheManager.invalidate(filePath);
      expect(cacheManager.has(filePath, content, configHash)).toBe(false);
    });

    test('should clear all entries', () => {
      cacheManager.set('/file1.sol', 'content1', 'config', sampleResult);
      cacheManager.set('/file2.sol', 'content2', 'config', sampleResult);
      cacheManager.set('/file3.sol', 'content3', 'config', sampleResult);

      expect(cacheManager.getStats().size).toBe(3);

      cacheManager.clear();

      expect(cacheManager.getStats().size).toBe(0);
    });
  });

  describe('Cache validation', () => {
    test('should invalidate when content changes', () => {
      const filePath = '/test/file.sol';
      const originalContent = 'pragma solidity ^0.8.0;';
      const newContent = 'pragma solidity ^0.8.1;';
      const configHash = 'config123';

      cacheManager.set(filePath, originalContent, configHash, sampleResult);

      // Same content should hit
      expect(cacheManager.get(filePath, originalContent, configHash)).toEqual(
        sampleResult,
      );

      // Different content should miss
      expect(cacheManager.get(filePath, newContent, configHash)).toBeUndefined();
    });

    test('should invalidate when config changes', () => {
      const filePath = '/test/file.sol';
      const content = 'pragma solidity ^0.8.0;';
      const originalConfig = 'config123';
      const newConfig = 'config456';

      cacheManager.set(filePath, content, originalConfig, sampleResult);

      // Same config should hit
      expect(cacheManager.get(filePath, content, originalConfig)).toEqual(
        sampleResult,
      );

      // Different config should miss
      expect(cacheManager.get(filePath, content, newConfig)).toBeUndefined();
    });

    test('should normalize file paths', () => {
      const content = 'pragma solidity ^0.8.0;';
      const configHash = 'config123';

      cacheManager.set('/test/file.sol', content, configHash, sampleResult);

      // Should match with normalized path
      const result = cacheManager.get('/test//file.sol', content, configHash);
      expect(result).toEqual(sampleResult);
    });
  });

  describe('TTL expiration', () => {
    test('should expire entries after TTL', () => {
      const shortTtlCache = new CacheManager({
        ttl: 100, // 100ms
        useFileSystem: false,
      });

      const filePath = '/test/file.sol';
      const content = 'pragma solidity ^0.8.0;';
      const configHash = 'config123';

      shortTtlCache.set(filePath, content, configHash, sampleResult);
      expect(shortTtlCache.get(filePath, content, configHash)).toEqual(
        sampleResult,
      );

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortTtlCache.get(filePath, content, configHash)).toBeUndefined();
          resolve();
        }, 150);
      });
    });

    test('should cleanup expired entries', () => {
      const shortTtlCache = new CacheManager({
        ttl: 50, // 50ms
        useFileSystem: false,
      });

      shortTtlCache.set('/file1.sol', 'content1', 'config', sampleResult);
      shortTtlCache.set('/file2.sol', 'content2', 'config', sampleResult);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const removed = shortTtlCache.cleanup();
          expect(removed).toBe(2);
          expect(shortTtlCache.getStats().size).toBe(0);
          resolve();
        }, 100);
      });
    });
  });

  describe('Statistics', () => {
    test('should track hits and misses', () => {
      const filePath = '/test/file.sol';
      const content = 'pragma solidity ^0.8.0;';
      const configHash = 'config123';

      // Miss
      cacheManager.get(filePath, content, configHash);
      expect(cacheManager.getStats().misses).toBe(1);
      expect(cacheManager.getStats().hits).toBe(0);

      // Set
      cacheManager.set(filePath, content, configHash, sampleResult);

      // Hit
      cacheManager.get(filePath, content, configHash);
      expect(cacheManager.getStats().hits).toBe(1);
      expect(cacheManager.getStats().misses).toBe(1);
    });

    test('should calculate hit rate', () => {
      const filePath = '/test/file.sol';
      const content = 'pragma solidity ^0.8.0;';
      const configHash = 'config123';

      // Initial hit rate should be 0
      expect(cacheManager.getHitRate()).toBe(0);

      // 1 miss
      cacheManager.get(filePath, content, configHash);

      // Set
      cacheManager.set(filePath, content, configHash, sampleResult);

      // 1 hit
      cacheManager.get(filePath, content, configHash);

      // Hit rate = 1/2 = 0.5
      expect(cacheManager.getHitRate()).toBe(0.5);
    });

    test('should track cache size', () => {
      expect(cacheManager.getStats().size).toBe(0);

      cacheManager.set('/file1.sol', 'content1', 'config', sampleResult);
      expect(cacheManager.getStats().size).toBe(1);

      cacheManager.set('/file2.sol', 'content2', 'config', sampleResult);
      expect(cacheManager.getStats().size).toBe(2);

      cacheManager.invalidate('/file1.sol');
      expect(cacheManager.getStats().size).toBe(1);
    });
  });

  describe('Eviction', () => {
    test('should evict oldest entries when full', () => {
      const smallCache = new CacheManager({
        maxEntries: 5,
        useFileSystem: false,
      });

      // Add entries
      for (let i = 0; i < 10; i++) {
        smallCache.set(`/file${i}.sol`, `content${i}`, 'config', sampleResult);
      }

      // Should have evicted some entries
      expect(smallCache.getStats().size).toBeLessThanOrEqual(5);
    });
  });

  describe('Content hashing', () => {
    test('should generate consistent hashes', () => {
      const content = 'pragma solidity ^0.8.0;';
      const hash1 = cacheManager.hashContent(content);
      const hash2 = cacheManager.hashContent(content);

      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different content', () => {
      const hash1 = cacheManager.hashContent('content1');
      const hash2 = cacheManager.hashContent('content2');

      expect(hash1).not.toBe(hash2);
    });

    test('should hash config consistently', () => {
      const config = { rule1: true, rule2: false };
      const hash1 = cacheManager.hashConfig(config);
      const hash2 = cacheManager.hashConfig(config);

      expect(hash1).toBe(hash2);
    });
  });

  describe('File system persistence', () => {
    let fsCacheManager: CacheManager;

    beforeEach(() => {
      fsCacheManager = new CacheManager({
        cacheDirectory: testCacheDir,
        useFileSystem: true,
      });
    });

    test('should save and load cache', async () => {
      const filePath = '/test/file.sol';
      const content = 'pragma solidity ^0.8.0;';
      const configHash = 'config123';

      // Set and save
      fsCacheManager.set(filePath, content, configHash, sampleResult);
      await fsCacheManager.save();

      // Create new cache manager and load
      const newCacheManager = new CacheManager({
        cacheDirectory: testCacheDir,
        useFileSystem: true,
      });
      await newCacheManager.load();

      // Should have the cached entry
      const result = newCacheManager.get(filePath, content, configHash);
      expect(result).toEqual(sampleResult);
    });

    test('should create cache directory if not exists', async () => {
      const newDir = path.join(testCacheDir, 'nested', 'dir');
      const nestedCacheManager = new CacheManager({
        cacheDirectory: newDir,
        useFileSystem: true,
      });

      nestedCacheManager.set('/file.sol', 'content', 'config', sampleResult);
      await nestedCacheManager.save();

      expect(fs.existsSync(newDir)).toBe(true);
    });

    test('should delete cache files', async () => {
      fsCacheManager.set('/file.sol', 'content', 'config', sampleResult);
      await fsCacheManager.save();

      // Files should exist
      expect(fs.existsSync(path.join(testCacheDir, 'cache.json'))).toBe(true);
      expect(fs.existsSync(path.join(testCacheDir, 'metadata.json'))).toBe(true);

      await fsCacheManager.deleteCache();

      // Files should be deleted
      expect(fs.existsSync(path.join(testCacheDir, 'cache.json'))).toBe(false);
      expect(fs.existsSync(path.join(testCacheDir, 'metadata.json'))).toBe(false);
    });

    test('should handle missing cache gracefully', async () => {
      const newCacheManager = new CacheManager({
        cacheDirectory: '/tmp/nonexistent-cache-dir',
        useFileSystem: true,
      });

      // Should not throw
      await newCacheManager.load();
      expect(newCacheManager.getStats().size).toBe(0);
    });

    test('should not load expired entries from disk', async () => {
      const shortTtlCache = new CacheManager({
        cacheDirectory: testCacheDir,
        ttl: 50, // 50ms
        useFileSystem: true,
      });

      shortTtlCache.set('/file.sol', 'content', 'config', sampleResult);
      await shortTtlCache.save();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Load into new cache
      const newCacheManager = new CacheManager({
        cacheDirectory: testCacheDir,
        ttl: 50,
        useFileSystem: true,
      });
      await newCacheManager.load();

      // Should not have loaded expired entry
      expect(newCacheManager.getStats().size).toBe(0);
    });
  });

  describe('createCacheManager helper', () => {
    test('should create cache manager with default options', () => {
      const cache = createCacheManager();
      expect(cache).toBeInstanceOf(CacheManager);
    });

    test('should create cache manager with custom options', () => {
      const cache = createCacheManager({
        cacheDirectory: '/custom/cache',
        ttl: 1000,
        maxEntries: 100,
      });
      expect(cache).toBeInstanceOf(CacheManager);
    });
  });
});
