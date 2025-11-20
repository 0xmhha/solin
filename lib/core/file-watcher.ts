/**
 * File Watcher
 *
 * Monitors files for changes and triggers callbacks for analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/**
 * File change event type
 */
export type FileChangeType = 'add' | 'change' | 'unlink';

/**
 * File change event
 */
export interface FileChangeEvent {
  /**
   * Type of change
   */
  type: FileChangeType;

  /**
   * Absolute file path
   */
  filePath: string;

  /**
   * Timestamp of the event
   */
  timestamp: number;
}

/**
 * File watcher options
 */
export interface FileWatcherOptions {
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceDelay?: number;

  /**
   * Whether to ignore initial scan
   * @default true
   */
  ignoreInitial?: boolean;

  /**
   * File patterns to ignore (glob patterns)
   * @default ['node_modules', '.git']
   */
  ignored?: string[];

  /**
   * Whether to follow symlinks
   * @default false
   */
  followSymlinks?: boolean;

  /**
   * Polling interval in ms (for systems without native file watching)
   * @default 100
   */
  pollInterval?: number;
}

/**
 * Watcher statistics
 */
export interface WatcherStats {
  filesWatched: number;
  changesDetected: number;
  lastChangeTime: number | null;
}

/**
 * File Watcher
 *
 * Watches files and directories for changes, emitting events
 * when files are added, modified, or deleted.
 */
export class FileWatcher extends EventEmitter {
  private readonly options: Required<FileWatcherOptions>;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private pendingChanges: Map<string, FileChangeEvent> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private stats: WatcherStats = {
    filesWatched: 0,
    changesDetected: 0,
    lastChangeTime: null,
  };

  constructor(options: FileWatcherOptions = {}) {
    super();
    this.options = {
      debounceDelay: options.debounceDelay ?? 300,
      ignoreInitial: options.ignoreInitial !== false,
      ignored: options.ignored ?? ['node_modules', '.git'],
      followSymlinks: options.followSymlinks ?? false,
      pollInterval: options.pollInterval ?? 100,
    };
  }

  /**
   * Start watching files
   */
  async watch(patterns: string[]): Promise<void> {
    if (this.isRunning) {
      throw new Error('Watcher is already running');
    }

    this.isRunning = true;

    // Resolve patterns to actual files
    const files = await this.resolvePatterns(patterns);

    // Watch each file
    for (const file of files) {
      this.watchFile(file);
    }

    // Watch directories for new files
    const directories = this.getUniqueDirectories(files);
    for (const dir of directories) {
      this.watchDirectory(dir);
    }

    this.emit('ready', { filesWatched: this.stats.filesWatched });
  }

  /**
   * Stop watching all files
   */
  close(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close all watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();

    this.isRunning = false;
    this.pendingChanges.clear();

    this.emit('close');
  }

  /**
   * Get watcher statistics
   */
  getStats(): WatcherStats {
    return { ...this.stats };
  }

  /**
   * Check if watcher is running
   */
  isWatching(): boolean {
    return this.isRunning;
  }

  /**
   * Add a file to watch
   */
  addFile(filePath: string): void {
    if (!this.isRunning) {
      throw new Error('Watcher is not running');
    }

    this.watchFile(filePath);
  }

  /**
   * Remove a file from watching
   */
  removeFile(filePath: string): void {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
      this.stats.filesWatched--;
    }
  }

  /**
   * Watch a single file
   */
  private watchFile(filePath: string): void {
    // Skip if already watching
    if (this.watchers.has(filePath)) {
      return;
    }

    // Skip if file should be ignored
    if (this.shouldIgnore(filePath)) {
      return;
    }

    try {
      const watcher = fs.watch(filePath, (eventType) => {
        this.handleFileChange(filePath, eventType === 'rename' ? 'unlink' : 'change');
      });

      watcher.on('error', (error) => {
        this.emit('error', error);
        this.removeFile(filePath);
      });

      this.watchers.set(filePath, watcher);
      this.stats.filesWatched++;
    } catch (error) {
      // File might not exist yet
      this.emit('error', error);
    }
  }

  /**
   * Watch a directory for new files
   */
  private watchDirectory(dirPath: string): void {
    // Skip if already watching
    if (this.watchers.has(dirPath)) {
      return;
    }

    // Skip if directory should be ignored
    if (this.shouldIgnore(dirPath)) {
      return;
    }

    try {
      const watcher = fs.watch(dirPath, (eventType, filename) => {
        if (filename && eventType === 'rename') {
          const filePath = path.join(dirPath, filename);

          // Check if file was added or removed
          fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
              // File was removed
              this.handleFileChange(filePath, 'unlink');
            } else {
              // File was added
              this.handleFileChange(filePath, 'add');
              // Start watching the new file
              this.watchFile(filePath);
            }
          });
        }
      });

      watcher.on('error', (error) => {
        this.emit('error', error);
      });

      this.watchers.set(dirPath, watcher);
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Handle a file change event
   */
  private handleFileChange(filePath: string, type: FileChangeType): void {
    // Skip non-Solidity files
    if (!filePath.endsWith('.sol')) {
      return;
    }

    // Skip ignored files
    if (this.shouldIgnore(filePath)) {
      return;
    }

    const event: FileChangeEvent = {
      type,
      filePath: path.resolve(filePath),
      timestamp: Date.now(),
    };

    // Store pending change
    this.pendingChanges.set(filePath, event);

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.emitChange(filePath);
    }, this.options.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Emit the change event after debounce
   */
  private emitChange(filePath: string): void {
    const event = this.pendingChanges.get(filePath);
    if (!event) return;

    this.pendingChanges.delete(filePath);
    this.debounceTimers.delete(filePath);

    this.stats.changesDetected++;
    this.stats.lastChangeTime = event.timestamp;

    this.emit('change', event);
  }

  /**
   * Resolve patterns to actual file paths
   */
  private async resolvePatterns(patterns: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of patterns) {
      const resolved = path.resolve(pattern);

      try {
        const stat = await fs.promises.stat(resolved);

        if (stat.isDirectory()) {
          // Recursively find all .sol files
          const solFiles = await this.findSolidityFiles(resolved);
          files.push(...solFiles);
        } else if (stat.isFile() && resolved.endsWith('.sol')) {
          files.push(resolved);
        }
      } catch {
        // Pattern might be a glob, handle later
        // For now, skip invalid paths
      }
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Find all Solidity files in a directory
   */
  private async findSolidityFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (this.shouldIgnore(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          const subFiles = await this.findSolidityFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.sol')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory might not be accessible
    }

    return files;
  }

  /**
   * Get unique parent directories
   */
  private getUniqueDirectories(files: string[]): string[] {
    const dirs = new Set<string>();
    for (const file of files) {
      dirs.add(path.dirname(file));
    }
    return [...dirs];
  }

  /**
   * Check if a path should be ignored
   */
  private shouldIgnore(filePath: string): boolean {
    const normalized = path.normalize(filePath);

    for (const pattern of this.options.ignored) {
      if (normalized.includes(pattern)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Create a file watcher with default options
 */
export function createFileWatcher(options?: FileWatcherOptions): FileWatcher {
  return new FileWatcher(options);
}

/**
 * Watch mode runner
 *
 * Convenience function for running analysis in watch mode
 */
export interface WatchModeOptions extends FileWatcherOptions {
  /**
   * Patterns to watch
   */
  patterns: string[];

  /**
   * Callback when files change
   */
  onChange: (events: FileChangeEvent[]) => void | Promise<void>;

  /**
   * Callback when watcher is ready
   */
  onReady?: (stats: { filesWatched: number }) => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;

  /**
   * Aggregate multiple changes before callback
   * @default true
   */
  aggregateChanges?: boolean;

  /**
   * Aggregation window in ms
   * @default 500
   */
  aggregationWindow?: number;
}

/**
 * Run analysis in watch mode
 */
export async function watchMode(options: WatchModeOptions): Promise<FileWatcher> {
  const watcher = new FileWatcher(options);

  const aggregateChanges = options.aggregateChanges !== false;
  const aggregationWindow = options.aggregationWindow ?? 500;

  let pendingEvents: FileChangeEvent[] = [];
  let aggregationTimer: NodeJS.Timeout | null = null;

  const processEvents = async (): Promise<void> => {
    if (pendingEvents.length === 0) return;

    const events = [...pendingEvents];
    pendingEvents = [];

    try {
      await options.onChange(events);
    } catch (error) {
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  watcher.on('change', (event: FileChangeEvent) => {
    if (aggregateChanges) {
      pendingEvents.push(event);

      if (aggregationTimer) {
        clearTimeout(aggregationTimer);
      }

      aggregationTimer = setTimeout(() => {
        aggregationTimer = null;
        void processEvents();
      }, aggregationWindow);
    } else {
      void options.onChange([event]);
    }
  });

  if (options.onReady) {
    watcher.on('ready', options.onReady);
  }

  if (options.onError) {
    watcher.on('error', options.onError);
  }

  await watcher.watch(options.patterns);

  return watcher;
}
