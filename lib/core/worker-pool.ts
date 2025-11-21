/**
 * Worker Pool
 *
 * Manages parallel execution of analysis tasks with controlled concurrency
 */

/**
 * Task to be executed by the worker pool
 */
export interface PoolTask<T, R> {
  /**
   * Task identifier
   */
  id: string;

  /**
   * Task data/input
   */
  data: T;

  /**
   * Task execution function
   */
  execute: (data: T) => Promise<R>;
}

/**
 * Result of a task execution
 */
export interface TaskResult<R> {
  /**
   * Task identifier
   */
  id: string;

  /**
   * Whether task completed successfully
   */
  success: boolean;

  /**
   * Task result (if successful)
   */
  result?: R;

  /**
   * Error (if failed)
   */
  error?: Error;

  /**
   * Execution duration in ms
   */
  duration: number;
}

/**
 * Worker pool options
 */
export interface WorkerPoolOptions {
  /**
   * Maximum number of concurrent tasks
   * @default Number of CPU cores or 4
   */
  maxConcurrency?: number;

  /**
   * Timeout for individual tasks in ms
   * @default 30000 (30 seconds)
   */
  taskTimeout?: number;

  /**
   * Whether to stop on first error
   * @default false
   */
  stopOnError?: boolean;
}

/**
 * Progress callback
 */
export type ProgressCallback = (completed: number, total: number, taskId: string) => void;

/**
 * Pool statistics
 */
export interface PoolStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  queuedTasks: number;
  averageDuration: number;
}

/**
 * Worker Pool
 *
 * Executes tasks in parallel with controlled concurrency.
 * Useful for parallelizing file analysis across multiple files.
 */
export class WorkerPool<T, R> {
  private readonly maxConcurrency: number;
  private readonly taskTimeout: number;
  private readonly stopOnError: boolean;

  private queue: Array<PoolTask<T, R>> = [];
  private running: Map<string, Promise<TaskResult<R>>> = new Map();
  private results: Map<string, TaskResult<R>> = new Map();
  private isProcessing = false;
  private shouldStop = false;
  private onProgress?: ProgressCallback;

  private totalTasks = 0;
  private completedTasks = 0;
  private failedTasks = 0;
  private totalDuration = 0;

  constructor(options: WorkerPoolOptions = {}) {
    // Default to 4 or number of CPUs
    this.maxConcurrency = options.maxConcurrency || 4;
    this.taskTimeout = options.taskTimeout || 30000;
    this.stopOnError = options.stopOnError || false;
  }

  /**
   * Add a task to the queue
   */
  addTask(task: PoolTask<T, R>): void {
    this.queue.push(task);
    this.totalTasks++;
  }

  /**
   * Add multiple tasks to the queue
   */
  addTasks(tasks: Array<PoolTask<T, R>>): void {
    for (const task of tasks) {
      this.addTask(task);
    }
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.onProgress = callback;
  }

  /**
   * Execute all queued tasks
   */
  async execute(): Promise<Map<string, TaskResult<R>>> {
    if (this.isProcessing) {
      throw new Error('Worker pool is already processing');
    }

    this.isProcessing = true;
    this.shouldStop = false;
    this.results.clear();

    try {
      await this.processQueue();
    } finally {
      this.isProcessing = false;
    }

    return this.results;
  }

  /**
   * Stop processing (gracefully waits for running tasks)
   */
  async stop(): Promise<void> {
    this.shouldStop = true;

    // Wait for all running tasks to complete
    if (this.running.size > 0) {
      await Promise.all(this.running.values());
    }
  }

  /**
   * Get current statistics
   */
  getStats(): PoolStats {
    return {
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      runningTasks: this.running.size,
      queuedTasks: this.queue.length,
      averageDuration: this.completedTasks > 0 ? this.totalDuration / this.completedTasks : 0,
    };
  }

  /**
   * Clear the queue and reset state
   */
  reset(): void {
    if (this.isProcessing) {
      throw new Error('Cannot reset while processing');
    }

    this.queue = [];
    this.results.clear();
    this.totalTasks = 0;
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.totalDuration = 0;
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    // Start initial batch of tasks
    while (this.running.size < this.maxConcurrency && this.queue.length > 0 && !this.shouldStop) {
      this.startNextTask();
    }

    // Continue until queue is empty and all tasks complete
    while ((this.queue.length > 0 || this.running.size > 0) && !this.shouldStop) {
      // Wait for any task to complete
      if (this.running.size > 0) {
        await Promise.race(this.running.values());
      }

      // Start more tasks if possible
      while (this.running.size < this.maxConcurrency && this.queue.length > 0 && !this.shouldStop) {
        this.startNextTask();
      }
    }
  }

  /**
   * Start the next task from the queue
   */
  private startNextTask(): void {
    const task = this.queue.shift();
    if (!task) return;

    const taskPromise = this.executeTask(task);
    this.running.set(task.id, taskPromise);

    // Handle task completion
    taskPromise
      .then(result => {
        this.running.delete(task.id);
        this.results.set(task.id, result);
        this.completedTasks++;
        this.totalDuration += result.duration;

        if (!result.success) {
          this.failedTasks++;
          if (this.stopOnError) {
            this.shouldStop = true;
          }
        }

        // Call progress callback
        if (this.onProgress) {
          this.onProgress(this.completedTasks, this.totalTasks, task.id);
        }
      })
      .catch(() => {
        // Error already handled in executeTask
        this.running.delete(task.id);
      });
  }

  /**
   * Execute a single task with timeout
   */
  private async executeTask(task: PoolTask<T, R>): Promise<TaskResult<R>> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Task ${task.id} timed out after ${this.taskTimeout}ms`));
        }, this.taskTimeout);
      });

      // Race between task and timeout
      const result = await Promise.race([task.execute(task.data), timeoutPromise]);

      return {
        id: task.id,
        success: true,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        id: task.id,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  }
}

/**
 * Create a worker pool with default options
 */
export function createWorkerPool<T, R>(options?: WorkerPoolOptions): WorkerPool<T, R> {
  return new WorkerPool<T, R>(options);
}

/**
 * Execute tasks in parallel with controlled concurrency
 */
export async function parallel<T, R>(
  items: T[],
  executor: (item: T, index: number) => Promise<R>,
  options?: WorkerPoolOptions
): Promise<Array<TaskResult<R>>> {
  const pool = new WorkerPool<T, R>(options);

  // Create tasks from items
  const tasks: Array<PoolTask<T, R>> = items.map((item, index) => ({
    id: `task-${index}`,
    data: item,
    execute: (data: T) => executor(data, index),
  }));

  pool.addTasks(tasks);
  const results = await pool.execute();

  // Return results in order
  return tasks.map(task => results.get(task.id)!);
}
