/**
 * Core Module
 *
 * Exports core analysis types and classes
 */

export * from './types';
export { AnalysisContext } from './analysis-context';
export { RuleRegistry } from './rule-registry';
export { AnalysisEngine } from './analysis-engine';
export {
  CacheManager,
  createCacheManager,
  type CacheEntry,
  type CacheMetadata,
  type CacheManagerOptions,
  type CacheStats,
} from './cache-manager';

export {
  WorkerPool,
  createWorkerPool,
  parallel,
  type PoolTask,
  type TaskResult,
  type WorkerPoolOptions,
  type ProgressCallback,
  type PoolStats,
} from './worker-pool';

export {
  FileWatcher,
  createFileWatcher,
  watchMode,
  type FileChangeType,
  type FileChangeEvent,
  type FileWatcherOptions,
  type WatcherStats,
  type WatchModeOptions,
} from './file-watcher';
