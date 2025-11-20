# System Prompt Additions for Code Quality

## Code Quality Standards

NEVER write production code that contains:

1. **throw statements in normal operation paths** - always return explicit error objects or use Result pattern
2. **memory leaks** - properly cleanup event listeners, timers, and circular references
3. **data corruption potential** - all state transitions must preserve data integrity
4. **inconsistent error handling patterns** - establish and follow single pattern (async/await with try/catch)

ALWAYS:

1. **Write comprehensive tests BEFORE implementing features** (TDD)
2. **Include invariant validation in data structures**
3. **Use proper type guards and runtime validation for external data**
4. **Document known bugs immediately and fix them before continuing**
5. **Implement proper separation of concerns**
6. **Use static analysis tools (ESLint, TypeScript) before considering code complete**

## Development Process Guards

### TESTING REQUIREMENTS:
- Write failing tests first (RED), then implement to make them pass (GREEN), then refactor
- Never commit code with test.skip() or test.todo() for bugs - fix the bugs
- Include property-based testing for data structures where applicable
- Test memory usage patterns (closures, event listeners), not just functionality
- Validate all edge cases and boundary conditions
- Test async operations with proper timeout handling

### ARCHITECTURE REQUIREMENTS:
- Explicit error handling - no hidden throws or unhandled promise rejections
- Memory safety - cleanup all subscriptions, listeners, and intervals
- Performance conscious - avoid unnecessary object creation and deep clones
- API design - consistent patterns across all public interfaces
- Type safety - leverage TypeScript's type system fully

### REVIEW CHECKPOINTS:

Before marking any code complete, verify:

1. **No TypeScript compilation errors or warnings**
2. **All tests pass (including integration and unit tests)**
3. **No ESLint warnings or errors**
4. **Memory usage is bounded and predictable**
5. **No data corruption potential in any code path**
6. **Error handling is comprehensive and consistent**
7. **Code is modular and maintainable**
8. **Documentation matches implementation**
9. **Type definitions are accurate and complete**

## TypeScript-Specific Quality Standards

### ERROR HANDLING:
- Use async/await with try/catch for asynchronous operations
- Define comprehensive error classes with context
- Never ignore errors silently (empty catch blocks)
- Provide meaningful error messages with context
- Use custom Error classes for domain-specific errors

### MEMORY MANAGEMENT:
- Remove event listeners when no longer needed
- Clear timers and intervals properly
- Avoid circular references in closures
- Use WeakMap/WeakSet for cache to prevent memory leaks
- Test for memory leaks in long-running scenarios
- Properly cleanup resources in finally blocks

### DATA STRUCTURE INVARIANTS:
- Document all invariants in JSDoc comments
- Implement runtime validation for critical invariants
- Test invariant preservation across all operations
- Use TypeScript's type system to enforce invariants
- Validate state consistency at module boundaries

### MODULE ORGANIZATION:
- Single responsibility per module
- Clear public/private API boundaries (export only what's necessary)
- Comprehensive JSDoc documentation
- Logical dependency hierarchy
- No circular dependencies

## Critical Patterns to Avoid

### DANGEROUS PATTERNS:
```typescript
// NEVER DO THIS - production throw without context
throw new Error('This should never happen');

// NEVER DO THIS - unchecked type coercion
const id = size as number; // Can lose precision

// NEVER DO THIS - ignoring errors
try {
  await riskyOperation();
} catch (e) {
  // Silent failure - BAD!
}

// NEVER DO THIS - leaking resources
setInterval(() => {
  // ... no clearInterval, memory leak!
}, 1000);

// NEVER DO THIS - unhandled promise rejection
someAsyncOperation(); // Missing await or .catch()

// NEVER DO THIS - mutation without validation
function updateState(state: State, newValue: unknown) {
  state.value = newValue; // No type checking!
}

// NEVER DO THIS - any type abuse
function process(data: any) { // Defeats type safety
  return data.someProperty;
}
```

### PREFERRED PATTERNS:
```typescript
// DO THIS - proper error handling with context
async function operation(): Promise<Result<T, MyError>> {
  try {
    const value = await riskyOperation();
    return { success: true, value: process(value) };
  } catch (error) {
    return {
      success: false,
      error: new MyError('Operation failed', { cause: error })
    };
  }
}

// DO THIS - safe type conversion with validation
function convertToNumber(value: unknown): number {
  if (typeof value !== 'number') {
    throw new TypeError(`Expected number, got ${typeof value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Number ${value} exceeds safe integer range`);
  }
  return value;
}

// DO THIS - explicit error handling
try {
  const result = await someOperation();
  return processResult(result);
} catch (error) {
  logger.error('Operation failed', { error });
  throw new OperationError('Failed to complete operation', { cause: error });
}

// DO THIS - proper resource cleanup
class ResourceManager {
  private intervalId?: NodeJS.Timeout;
  private listeners: Map<string, Function> = new Map();

  start() {
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.listeners.clear();
  }
}

// DO THIS - type-safe state updates
interface State {
  value: number;
}

function updateState(state: State, newValue: number): State {
  if (!Number.isFinite(newValue)) {
    throw new Error('Invalid value: must be finite number');
  }
  return { ...state, value: newValue };
}

// DO THIS - avoid any, use proper types
interface ProcessableData {
  someProperty: string;
}

function process(data: ProcessableData): string {
  return data.someProperty;
}
```

## Testing Standards

### COMPREHENSIVE TEST COVERAGE:
- Unit tests for all public functions
- Integration tests for complex interactions
- Edge case and boundary condition tests
- Async operation tests with proper setup/teardown
- Memory leak detection tests
- Error condition tests

### TEST ORGANIZATION:
```typescript
describe('DataStructure', () => {
  let structure: DataStructure;

  beforeEach(() => {
    structure = new DataStructure();
  });

  afterEach(() => {
    // Cleanup resources
    structure.cleanup();
  });

  describe('normal operation', () => {
    test('should handle typical usage patterns', () => {
      const result = structure.operation(validInput);
      expect(result).toBe(expectedOutput);
    });
  });

  describe('edge cases', () => {
    test('should handle boundary conditions', () => {
      expect(() => structure.operation(edgeCase)).not.toThrow();
    });

    test('should handle empty input', () => {
      const result = structure.operation([]);
      expect(result).toEqual([]);
    });
  });

  describe('error conditions', () => {
    test('should throw meaningful error for invalid input', () => {
      expect(() => structure.operation(invalidInput))
        .toThrow('Expected valid input');
    });

    test('should handle async errors properly', async () => {
      await expect(structure.asyncOperation())
        .rejects.toThrow(OperationError);
    });
  });

  describe('invariants', () => {
    test('should preserve data structure invariants', () => {
      structure.insert(item);
      expect(structure.checkInvariants()).toBe(true);
    });
  });
});
```

### ASYNC TESTING:
```typescript
describe('async operations', () => {
  test('should handle successful async operation', async () => {
    const result = await asyncOperation();
    expect(result).toBeDefined();
  });

  test('should handle async errors', async () => {
    await expect(failingAsyncOperation())
      .rejects.toThrow(ExpectedError);
  });

  test('should timeout long operations', async () => {
    jest.setTimeout(5000);
    await expect(longRunningOperation())
      .resolves.toBeDefined();
  });

  test('should cleanup resources on error', async () => {
    const cleanup = jest.fn();
    try {
      await operationWithCleanup(cleanup);
    } catch (error) {
      // Error expected
    }
    expect(cleanup).toHaveBeenCalled();
  });
});
```

### MEMORY TESTING:
```typescript
describe('memory management', () => {
  test('should not leak memory with many operations', () => {
    const initialHeap = process.memoryUsage().heapUsed;

    for (let i = 0; i < 10000; i++) {
      const structure = new DataStructure();
      structure.insert(i);
      structure.remove(i % 2);
      structure.cleanup();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalHeap = process.memoryUsage().heapUsed;
    const heapGrowth = finalHeap - initialHeap;

    // Allow for some growth, but not excessive
    expect(heapGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
  });

  test('should cleanup event listeners', () => {
    const emitter = new EventEmitter();
    const listener = jest.fn();

    emitter.on('event', listener);
    expect(emitter.listenerCount('event')).toBe(1);

    emitter.removeListener('event', listener);
    expect(emitter.listenerCount('event')).toBe(0);
  });

  test('should clear intervals on cleanup', () => {
    const manager = new ResourceManager();
    manager.start();

    const intervalsBefore = (process as any)._getActiveHandles?.().length || 0;

    manager.cleanup();

    const intervalsAfter = (process as any)._getActiveHandles?.().length || 0;

    expect(intervalsAfter).toBeLessThanOrEqual(intervalsBefore);
  });
});
```

## Documentation Standards

### CODE DOCUMENTATION:
- Document all public APIs with JSDoc
- Explain complex algorithms and data structures
- Document invariants and preconditions
- Include safety notes for unsafe operations
- Provide usage examples in doc comments
- Document thrown errors

### ERROR DOCUMENTATION:
```typescript
/**
 * Inserts a key-value pair into the tree.
 *
 * @param key - The key to insert (must be comparable)
 * @param value - The value to associate with the key
 * @returns The old value if key existed, undefined if newly inserted
 * @throws {InvalidKeyError} If key violates tree constraints
 * @throws {TreeFullError} If tree has reached maximum capacity
 *
 * @example
 * ```typescript
 * const tree = new BPlusTree<number, string>(4);
 * tree.insert(1, "value");  // undefined (new key)
 * tree.insert(1, "new");    // "value" (replaced)
 * ```
 *
 * @remarks
 * This function maintains all tree invariants:
 * - Node fill factor between MIN_KEYS and MAX_KEYS
 * - All leaf nodes at same depth
 * - Keys in sorted order
 *
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 */
public insert(key: K, value: V): V | undefined {
  this.validateKey(key);

  // Implementation
}
```

### TYPE DOCUMENTATION:
```typescript
/**
 * Configuration options for the analysis engine
 *
 * @interface AnalysisOptions
 */
export interface AnalysisOptions {
  /**
   * Maximum number of concurrent file analyses
   * @default 4
   */
  maxConcurrency?: number;

  /**
   * Timeout for individual file analysis in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Whether to stop analysis on first error
   * @default false
   */
  failFast?: boolean;
}

/**
 * Result of analyzing a single file
 *
 * @interface AnalysisResult
 * @template T - Type of issues found
 */
export interface AnalysisResult<T = Issue> {
  /** Path to the analyzed file */
  filePath: string;

  /** List of issues found */
  issues: T[];

  /** Analysis metadata */
  metadata: {
    /** Time taken to analyze in milliseconds */
    duration: number;

    /** Number of lines analyzed */
    linesAnalyzed: number;
  };
}
```

## Error Handling Patterns

### CUSTOM ERROR CLASSES:
```typescript
/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when parsing fails
 */
export class ParseError extends AppError {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    cause?: Error,
  ) {
    super(message, 'PARSE_ERROR', { line, column }, cause);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
  ) {
    super(message, 'VALIDATION_ERROR', { field, value });
  }
}
```

### RESULT PATTERN:
```typescript
/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Helper to create success result
 */
export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/**
 * Helper to create error result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Example usage of Result pattern
 */
async function parseFile(filePath: string): Promise<Result<AST, ParseError>> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const ast = parse(content);
    return ok(ast);
  } catch (error) {
    return err(new ParseError(
      `Failed to parse file: ${filePath}`,
      0,
      0,
      error instanceof Error ? error : undefined,
    ));
  }
}
```

## Performance Considerations

### AVOID PERFORMANCE PITFALLS:
```typescript
// BAD - Creates new array on every iteration
for (let i = 0; i < items.length; i++) {
  const filtered = items.filter(x => x.id !== i); // O(n) each iteration = O(n²)
}

// GOOD - Single pass
const filtered = items.filter((x, i) => x.id !== i); // O(n)

// BAD - Unnecessary object creation
const result = items.map(x => ({ ...x })).map(x => x.value);

// GOOD - Single map
const result = items.map(x => x.value);

// BAD - Deep clone when shallow would work
const copy = JSON.parse(JSON.stringify(obj)); // Slow

// GOOD - Shallow clone if possible
const copy = { ...obj };

// BAD - Synchronous blocking operation
const data = fs.readFileSync(path); // Blocks event loop

// GOOD - Async operation
const data = await fs.promises.readFile(path);
```

### CACHING AND MEMOIZATION:
```typescript
/**
 * Memoize expensive computations
 */
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Use WeakMap for object-keyed caches to prevent memory leaks
 */
class ExpensiveOperation {
  private cache = new WeakMap<object, Result>();

  compute(input: object): Result {
    if (this.cache.has(input)) {
      return this.cache.get(input)!;
    }

    const result = this.expensiveComputation(input);
    this.cache.set(input, result);
    return result;
  }

  private expensiveComputation(input: object): Result {
    // ... expensive work
  }
}
```

This system prompt addition establishes clear quality standards, testing requirements, and architectural principles for TypeScript/JavaScript development that align with the Solin project's goals and prevent common issues through proactive guidelines.
