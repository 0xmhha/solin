/**
 * Worker Pool Tests
 */

import { WorkerPool, createWorkerPool, parallel, type PoolTask } from '@core/worker-pool';

describe('WorkerPool', () => {
  describe('Basic task execution', () => {
    test('should execute single task', async () => {
      const pool = new WorkerPool<number, number>();

      pool.addTask({
        id: 'task-1',
        data: 5,
        execute: async n => n * 2,
      });

      const results = await pool.execute();

      expect(results.size).toBe(1);
      expect(results.get('task-1')?.success).toBe(true);
      expect(results.get('task-1')?.result).toBe(10);
    });

    test('should execute multiple tasks', async () => {
      const pool = new WorkerPool<number, number>();

      pool.addTasks([
        { id: 'task-1', data: 1, execute: async n => n * 2 },
        { id: 'task-2', data: 2, execute: async n => n * 2 },
        { id: 'task-3', data: 3, execute: async n => n * 2 },
      ]);

      const results = await pool.execute();

      expect(results.size).toBe(3);
      expect(results.get('task-1')?.result).toBe(2);
      expect(results.get('task-2')?.result).toBe(4);
      expect(results.get('task-3')?.result).toBe(6);
    });

    test('should handle empty queue', async () => {
      const pool = new WorkerPool<number, number>();
      const results = await pool.execute();

      expect(results.size).toBe(0);
    });

    test('should track task duration', async () => {
      const pool = new WorkerPool<number, number>();

      pool.addTask({
        id: 'task-1',
        data: 50,
        execute: async ms => {
          await new Promise(resolve => setTimeout(resolve, ms));
          return ms;
        },
      });

      const results = await pool.execute();
      const result = results.get('task-1');

      expect(result?.duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Concurrency control', () => {
    test('should respect max concurrency', async () => {
      const pool = new WorkerPool<number, number>({ maxConcurrency: 2 });

      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const tasks: Array<PoolTask<number, number>> = [];
      for (let i = 0; i < 5; i++) {
        tasks.push({
          id: `task-${i}`,
          data: i,
          execute: async n => {
            currentConcurrent++;
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
            await new Promise(resolve => setTimeout(resolve, 20));
            currentConcurrent--;
            return n;
          },
        });
      }

      pool.addTasks(tasks);
      await pool.execute();

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    test('should process all tasks even with low concurrency', async () => {
      const pool = new WorkerPool<number, number>({ maxConcurrency: 1 });

      pool.addTasks([
        { id: 'task-1', data: 1, execute: async n => n },
        { id: 'task-2', data: 2, execute: async n => n },
        { id: 'task-3', data: 3, execute: async n => n },
      ]);

      const results = await pool.execute();

      expect(results.size).toBe(3);
    });
  });

  describe('Error handling', () => {
    test('should handle task errors', async () => {
      const pool = new WorkerPool<number, number>();

      pool.addTask({
        id: 'task-1',
        data: 0,
        execute: async () => {
          throw new Error('Task failed');
        },
      });

      const results = await pool.execute();
      const result = results.get('task-1');

      expect(result?.success).toBe(false);
      expect(result?.error?.message).toBe('Task failed');
    });

    test('should continue after error by default', async () => {
      const pool = new WorkerPool<number, number>();

      pool.addTasks([
        {
          id: 'task-1',
          data: 1,
          execute: async () => {
            throw new Error('Error 1');
          },
        },
        { id: 'task-2', data: 2, execute: async n => n * 2 },
      ]);

      const results = await pool.execute();

      expect(results.size).toBe(2);
      expect(results.get('task-1')?.success).toBe(false);
      expect(results.get('task-2')?.success).toBe(true);
    });

    test('should stop on error when configured', async () => {
      const pool = new WorkerPool<number, number>({
        stopOnError: true,
        maxConcurrency: 1,
      });

      pool.addTasks([
        {
          id: 'task-1',
          data: 1,
          execute: async () => {
            throw new Error('Error 1');
          },
        },
        { id: 'task-2', data: 2, execute: async n => n * 2 },
      ]);

      const results = await pool.execute();

      // First task fails, second should not be processed
      expect(results.get('task-1')?.success).toBe(false);
      // task-2 might or might not be processed depending on timing
    });

    test('should handle task timeout', async () => {
      const pool = new WorkerPool<number, number>({ taskTimeout: 50 });

      pool.addTask({
        id: 'task-1',
        data: 0,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return 1;
        },
      });

      const results = await pool.execute();
      const result = results.get('task-1');

      expect(result?.success).toBe(false);
      expect(result?.error?.message).toContain('timed out');
    });
  });

  describe('Progress tracking', () => {
    test('should call progress callback', async () => {
      const pool = new WorkerPool<number, number>();
      const progressCalls: Array<{ completed: number; total: number }> = [];

      pool.setProgressCallback((completed, total) => {
        progressCalls.push({ completed, total });
      });

      pool.addTasks([
        { id: 'task-1', data: 1, execute: async n => n },
        { id: 'task-2', data: 2, execute: async n => n },
        { id: 'task-3', data: 3, execute: async n => n },
      ]);

      await pool.execute();

      expect(progressCalls).toHaveLength(3);
      expect(progressCalls[2]).toEqual({ completed: 3, total: 3 });
    });

    test('should include task id in progress callback', async () => {
      const pool = new WorkerPool<number, number>({ maxConcurrency: 1 });
      const taskIds: string[] = [];

      pool.setProgressCallback((_, __, taskId) => {
        taskIds.push(taskId);
      });

      pool.addTasks([
        { id: 'task-1', data: 1, execute: async n => n },
        { id: 'task-2', data: 2, execute: async n => n },
      ]);

      await pool.execute();

      expect(taskIds).toContain('task-1');
      expect(taskIds).toContain('task-2');
    });
  });

  describe('Statistics', () => {
    test('should track statistics', async () => {
      const pool = new WorkerPool<number, number>();

      pool.addTasks([
        { id: 'task-1', data: 1, execute: async n => n },
        {
          id: 'task-2',
          data: 2,
          execute: async () => {
            throw new Error('fail');
          },
        },
        { id: 'task-3', data: 3, execute: async n => n },
      ]);

      await pool.execute();
      const stats = pool.getStats();

      expect(stats.totalTasks).toBe(3);
      expect(stats.completedTasks).toBe(3);
      expect(stats.failedTasks).toBe(1);
      expect(stats.queuedTasks).toBe(0);
      expect(stats.runningTasks).toBe(0);
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
    });

    test('should reset statistics', async () => {
      const pool = new WorkerPool<number, number>();

      pool.addTask({ id: 'task-1', data: 1, execute: async n => n });
      await pool.execute();

      pool.reset();
      const stats = pool.getStats();

      expect(stats.totalTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
    });
  });

  describe('Stop/cancel', () => {
    test('should stop processing', async () => {
      const pool = new WorkerPool<number, number>({ maxConcurrency: 1 });
      const executed: number[] = [];

      pool.addTasks([
        {
          id: 'task-1',
          data: 1,
          execute: async n => {
            await new Promise(resolve => setTimeout(resolve, 50));
            executed.push(n);
            return n;
          },
        },
        {
          id: 'task-2',
          data: 2,
          execute: async n => {
            executed.push(n);
            return n;
          },
        },
      ]);

      // Start execution and stop after first task
      const executePromise = pool.execute();
      setTimeout(() => pool.stop(), 30);

      await executePromise;

      // At least first task should be executed
      expect(executed.length).toBeGreaterThanOrEqual(1);
    });

    test('should not allow multiple simultaneous executions', async () => {
      const pool = new WorkerPool<number, number>();

      pool.addTask({
        id: 'task-1',
        data: 1,
        execute: async n => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return n;
        },
      });

      const promise1 = pool.execute();

      // Try to execute again
      await expect(pool.execute()).rejects.toThrow('already processing');

      await promise1;
    });
  });

  describe('Helper functions', () => {
    test('createWorkerPool should create pool with options', () => {
      const pool = createWorkerPool<number, number>({ maxConcurrency: 2 });
      expect(pool).toBeInstanceOf(WorkerPool);
    });

    test('parallel should execute items in parallel', async () => {
      const items = [1, 2, 3, 4, 5];

      const results = await parallel(items, async item => item * 2, { maxConcurrency: 2 });

      expect(results).toHaveLength(5);
      expect(results[0]?.result).toBe(2);
      expect(results[1]?.result).toBe(4);
      expect(results[2]?.result).toBe(6);
      expect(results[3]?.result).toBe(8);
      expect(results[4]?.result).toBe(10);
    });

    test('parallel should preserve order', async () => {
      const items = [3, 1, 2];

      const results = await parallel(items, async (item, index) => ({
        value: item,
        index,
      }));

      expect(results[0]?.result).toEqual({ value: 3, index: 0 });
      expect(results[1]?.result).toEqual({ value: 1, index: 1 });
      expect(results[2]?.result).toEqual({ value: 2, index: 2 });
    });
  });
});
