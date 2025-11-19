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
