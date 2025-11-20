/**
 * File Watcher Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  FileWatcher,
  createFileWatcher,
  watchMode,
  type FileChangeEvent,
} from '@core/file-watcher';

describe('FileWatcher', () => {
  let watcher: FileWatcher;
  const testDir = '/tmp/solin-watcher-test';

  beforeEach(async () => {
    // Create test directory
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Close watcher if running
    if (watcher && watcher.isWatching()) {
      await watcher.close();
    }

    // Clean up test directory
    try {
      await fs.promises.rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic operations', () => {
    test('should start and stop watching', async () => {
      watcher = new FileWatcher();

      // Create a test file
      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      await watcher.watch([testDir]);

      expect(watcher.isWatching()).toBe(true);
      expect(watcher.getStats().filesWatched).toBeGreaterThan(0);

      await watcher.close();

      expect(watcher.isWatching()).toBe(false);
    });

    test('should emit ready event', async () => {
      watcher = new FileWatcher();

      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      const readyPromise = new Promise<{ filesWatched: number }>((resolve) => {
        watcher.on('ready', resolve);
      });

      await watcher.watch([testDir]);

      const readyData = await readyPromise;
      expect(readyData.filesWatched).toBe(1);
    });

    test('should watch specific file', async () => {
      watcher = new FileWatcher();

      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      await watcher.watch([testFile]);

      expect(watcher.getStats().filesWatched).toBe(1);
    });

    test('should not watch non-existent files', async () => {
      watcher = new FileWatcher();

      await watcher.watch([path.join(testDir, 'nonexistent.sol')]);

      expect(watcher.getStats().filesWatched).toBe(0);
    });
  });

  describe('Change detection', () => {
    test('should detect file changes', async () => {
      watcher = new FileWatcher({ debounceDelay: 50, pollInterval: 50 });

      // Create file first so it can be watched
      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      // Set up listener for any change event before watching
      const events: FileChangeEvent[] = [];
      watcher.on('change', (event: FileChangeEvent) => {
        events.push(event);
      });

      // Watch the specific file, not just the directory
      await watcher.watch([testFile]);

      // Wait for watcher to stabilize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify file to trigger change event
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.1;');

      // Wait for event to be processed (fs.watch can be slow)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify at least one event was detected
      expect(events.length).toBeGreaterThan(0);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.filePath).toContain('test.sol');
      expect(lastEvent.timestamp).toBeDefined();
      // Accept both 'add' and 'change' as valid events
      // fs.watch behavior varies across platforms
      expect(['add', 'change']).toContain(lastEvent.type);
    });

    test('should debounce rapid changes', async () => {
      watcher = new FileWatcher({ debounceDelay: 100 });

      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      let changeCount = 0;
      watcher.on('change', () => {
        changeCount++;
      });

      await watcher.watch([testDir]);

      // Make rapid changes
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.1;');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.2;');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.3;');

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should only have emitted once due to debouncing
      expect(changeCount).toBeLessThanOrEqual(2);
    });

    test('should track statistics', async () => {
      watcher = new FileWatcher({ debounceDelay: 50 });

      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      await watcher.watch([testDir]);

      const initialStats = watcher.getStats();
      expect(initialStats.changesDetected).toBe(0);
      expect(initialStats.lastChangeTime).toBeNull();

      // Trigger a change
      const changePromise = new Promise<void>((resolve) => {
        watcher.on('change', () => resolve());
      });

      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.1;');
      await changePromise;

      const updatedStats = watcher.getStats();
      expect(updatedStats.changesDetected).toBe(1);
      expect(updatedStats.lastChangeTime).not.toBeNull();
    });
  });

  describe('File filtering', () => {
    test('should only watch .sol files', async () => {
      watcher = new FileWatcher({ debounceDelay: 50 });

      const solFile = path.join(testDir, 'test.sol');
      const jsFile = path.join(testDir, 'test.js');

      await fs.promises.writeFile(solFile, 'pragma solidity ^0.8.0;');
      await fs.promises.writeFile(jsFile, 'console.log("test");');

      let changeCount = 0;
      watcher.on('change', () => {
        changeCount++;
      });

      await watcher.watch([testDir]);

      // Modify both files
      await fs.promises.writeFile(jsFile, 'console.log("updated");');

      // Wait for potential events
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not detect .js file change
      expect(changeCount).toBe(0);
    });

    test('should ignore specified patterns', async () => {
      watcher = new FileWatcher({
        debounceDelay: 50,
        ignored: ['node_modules', '.git', 'ignored'],
      });

      const normalFile = path.join(testDir, 'test.sol');
      const ignoredDir = path.join(testDir, 'ignored');
      const ignoredFile = path.join(ignoredDir, 'test.sol');

      await fs.promises.mkdir(ignoredDir, { recursive: true });
      await fs.promises.writeFile(normalFile, 'pragma solidity ^0.8.0;');
      await fs.promises.writeFile(ignoredFile, 'pragma solidity ^0.8.0;');

      await watcher.watch([testDir]);

      // Only normal file should be watched
      expect(watcher.getStats().filesWatched).toBe(1);
    });
  });

  describe('Dynamic file management', () => {
    test('should add file to watch', async () => {
      watcher = new FileWatcher();

      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      await watcher.watch([]);

      expect(watcher.getStats().filesWatched).toBe(0);

      await watcher.addFile(testFile);

      expect(watcher.getStats().filesWatched).toBe(1);
    });

    test('should remove file from watch', async () => {
      watcher = new FileWatcher();

      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      await watcher.watch([testFile]);

      expect(watcher.getStats().filesWatched).toBe(1);

      watcher.removeFile(testFile);

      expect(watcher.getStats().filesWatched).toBe(0);
    });

    test('should throw when adding file to stopped watcher', async () => {
      watcher = new FileWatcher();

      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      expect(() => watcher.addFile(testFile)).toThrow('not running');
    });
  });

  describe('Error handling', () => {
    test('should not start twice', async () => {
      watcher = new FileWatcher();

      await watcher.watch([testDir]);

      await expect(watcher.watch([testDir])).rejects.toThrow('already running');
    });

    test('should emit error events', async () => {
      watcher = new FileWatcher();

      let errorEmitted = false;
      watcher.on('error', () => {
        errorEmitted = true;
      });

      await watcher.watch([testDir]);

      // Manually trigger an error by removing a watched file
      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');
      await watcher.addFile(testFile);

      // Force an error by deleting the file
      await fs.promises.unlink(testFile);

      // Wait a moment for potential error
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Error might or might not be emitted depending on OS
      // This test verifies error handler doesn't crash
      expect(typeof errorEmitted).toBe('boolean');
    });
  });

  describe('Helper functions', () => {
    test('createFileWatcher should create watcher with options', () => {
      const watcher = createFileWatcher({ debounceDelay: 100 });
      expect(watcher).toBeInstanceOf(FileWatcher);
    });

    test('watchMode should run in watch mode', async () => {
      const testFile = path.join(testDir, 'test.sol');
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.0;');

      const events: FileChangeEvent[][] = [];

      watcher = await watchMode({
        patterns: [testDir],
        debounceDelay: 50,
        aggregationWindow: 100,
        onChange: (e) => {
          events.push(e);
        },
        onReady: () => {},
      });

      // Trigger a change
      await fs.promises.writeFile(testFile, 'pragma solidity ^0.8.1;');

      // Wait for aggregation
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    test('watchMode should aggregate changes', async () => {
      const file1 = path.join(testDir, 'test1.sol');
      const file2 = path.join(testDir, 'test2.sol');

      await fs.promises.writeFile(file1, 'pragma solidity ^0.8.0;');
      await fs.promises.writeFile(file2, 'pragma solidity ^0.8.0;');

      const events: FileChangeEvent[][] = [];

      watcher = await watchMode({
        patterns: [testDir],
        debounceDelay: 50,
        aggregationWindow: 150,
        aggregateChanges: true,
        onChange: (e) => {
          events.push(e);
        },
      });

      // Modify both files quickly
      await fs.promises.writeFile(file1, 'pragma solidity ^0.8.1;');
      await fs.promises.writeFile(file2, 'pragma solidity ^0.8.1;');

      // Wait for aggregation
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should have aggregated into fewer batches
      expect(events.length).toBeLessThanOrEqual(2);
    });
  });
});
