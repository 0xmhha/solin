# Development Guide - TDD & DDD Practices


## Table of Contents

1. [Development Philosophy](#development-philosophy)
2. [Test-Driven Development (TDD)](#test-driven-development-tdd)
3. [Domain-Driven Design (DDD)](#domain-driven-design-ddd)
4. [Development Workflow](#development-workflow)
5. [Code Review Guidelines](#code-review-guidelines)
6. [Git Workflow](#git-workflow)
7. [Continuous Integration](#continuous-integration)
8. [Troubleshooting](#troubleshooting)

---

## Development Philosophy

### Core Values

1. **Quality First**: Write tests before code
2. **Simplicity**: Start with the simplest solution
3. **Refactor Continuously**: Improve design incrementally
4. **Collaborate**: Review code, share knowledge
5. **Learn**: Retrospectives and continuous improvement

### Development Cycle

```
Requirements → Design → Test → Code → Refactor → Review → Deploy
      ↑                                                        ↓
      └────────────────── Feedback Loop ──────────────────────┘
```

---

## Test-Driven Development (TDD)

### The TDD Cycle (Red-Green-Refactor)

```
┌──────────────┐
│   1. RED     │  Write a failing test
│              │  Test describes desired behavior
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  2. GREEN    │  Write minimal code to pass
│              │  Just enough to make test pass
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ 3. REFACTOR  │  Improve code quality
│              │  Keep tests passing
└──────┬───────┘
       │
       ↓
```

### Example TDD Workflow

#### Step 1: Write a Failing Test (RED)

```typescript
// test/rules/security/reentrancy-detector.test.ts
describe('ReentrancyDetector', () => {
  let detector: ReentrancyDetector;
  let context: AnalysisContext;

  beforeEach(() => {
    detector = new ReentrancyDetector();
  });

  test('should detect reentrancy when state change after external call', () => {
    // Arrange
    const code = `
      contract Vulnerable {
        function withdraw() public {
          msg.sender.call{value: balance}("");
          balance = 0;  // State change after external call
        }
      }
    `;
    context = createContext(code);

    // Act
    const issues = detector.detect(context);

    // Assert
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('security/reentrancy');
    expect(issues[0].severity).toBe(Severity.HIGH);
    expect(issues[0].message).toContain('state change after external call');
  });
});

// Run test - it should FAIL (RED)
// $ npm test -- reentrancy-detector.test.ts
```

#### Step 2: Write Minimal Code to Pass (GREEN)

```typescript
// lib/rules/security/reentrancy-detector.ts
export class ReentrancyDetector extends AbstractRule {
  constructor() {
    super('security/reentrancy', RuleCategory.SECURITY, RuleSeverity.HIGH, {
      title: 'Reentrancy vulnerability',
    });
  }

  detect(context: AnalysisContext): Issue[] {
    const issues: Issue[] = [];

    // Find all functions
    const functions = context.ast.findAll('FunctionDefinition');

    for (const func of functions) {
      // Find external calls
      const externalCalls = this.findExternalCalls(func);

      // Find state changes
      const stateChanges = this.findStateChanges(func);

      // Check if state change comes after external call
      for (const call of externalCalls) {
        const changesAfter = stateChanges.filter(change => change.range[0] > call.range[1]);

        if (changesAfter.length > 0) {
          issues.push(
            this.createIssue(call, 'Potential reentrancy: state change after external call')
          );
        }
      }
    }

    return issues;
  }

  private findExternalCalls(func: ASTNode): ASTNode[] {
    // Minimal implementation to pass test
    const calls: ASTNode[] = [];
    // ... find .call(), .send(), .transfer()
    return calls;
  }

  private findStateChanges(func: ASTNode): ASTNode[] {
    // Minimal implementation to pass test
    const changes: ASTNode[] = [];
    // ... find assignments to state variables
    return changes;
  }
}

// Run test - it should PASS (GREEN)
```

#### Step 3: Refactor (REFACTOR)

```typescript
// Improve code quality while keeping tests green
export class ReentrancyDetector extends AbstractRule {
  // ... constructor

  detect(context: AnalysisContext): Issue[] {
    const functions = context.ast.findAll('FunctionDefinition');

    return functions.flatMap(func => this.analyzeFunctionForReentrancy(func));
  }

  private analyzeFunctionForReentrancy(func: ASTNode): Issue[] {
    const issues: Issue[] = [];

    const externalCalls = this.findExternalCalls(func);
    const stateChanges = this.findStateChanges(func);

    for (const call of externalCalls) {
      const vulnerableChanges = this.findStateChangesAfter(call, stateChanges);

      if (vulnerableChanges.length > 0) {
        issues.push(this.createReentrancyIssue(call, vulnerableChanges));
      }
    }

    return issues;
  }

  private findStateChangesAfter(call: ASTNode, changes: ASTNode[]): ASTNode[] {
    return changes.filter(change => this.isAfter(change, call));
  }

  private createReentrancyIssue(call: ASTNode, changes: ASTNode[]): Issue {
    return this.createIssue(call, 'Potential reentrancy: state change after external call', {
      affectedVariables: changes.map(c => c.name),
    });
  }

  // ... helper methods
}

// Run test - should still PASS
// Code is now cleaner and more maintainable
```

### TDD Best Practices

#### 1. Write Tests First

```typescript
// DO: Write test before implementation
test('should validate contract name is PascalCase', () => {
  const rule = new ContractNameRule();
  const issues = rule.detect(context('contract myContract {}'));
  expect(issues).toHaveLength(1);
});

// Then implement the rule

// ❌ DON'T: Write implementation first
class ContractNameRule {
  detect(context: AnalysisContext): Issue[] {
    // Implemented without tests
  }
}
```

#### 2. One Test at a Time

```typescript
// DO: Focus on one behavior
describe('ReentrancyDetector', () => {
  test('detects reentrancy in simple case', () => {});
  test('ignores view functions', () => {});
  test('handles multiple state changes', () => {});
});

// ❌ DON'T: Test everything at once
test('tests all reentrancy scenarios', () => {
  // 100 lines testing many different things
});
```

#### 3. Keep Tests Independent

```typescript
// DO: Each test can run alone
describe('Parser', () => {
  test('parses contract', () => {
    const parser = new Parser();
    const ast = parser.parse('contract Foo {}');
    expect(ast).toBeDefined();
  });

  test('handles syntax error', () => {
    const parser = new Parser();
    expect(() => parser.parse('contract {')).toThrow();
  });
});

// ❌ DON'T: Tests depend on each other
describe('Parser', () => {
  let parser: Parser;
  let ast: AST;

  test('parses contract', () => {
    parser = new Parser();
    ast = parser.parse('contract Foo {}'); // Stored for next test
  });

  test('can walk AST', () => {
    walk(ast, visitor); // Depends on previous test
  });
});
```

#### 4. Test Behavior, Not Implementation

```typescript
// DO: Test behavior
test('should detect unused variables', () => {
  const detector = new UnusedVariableDetector();
  const issues = detector.detect(context);
  expect(issues).toHaveLength(1);
  expect(issues[0].message).toContain('unused');
});

// ❌ DON'T: Test implementation details
test('should call findVariables and checkUsage', () => {
  const detector = new UnusedVariableDetector();
  const spy1 = jest.spyOn(detector, 'findVariables');
  const spy2 = jest.spyOn(detector, 'checkUsage');

  detector.detect(context);

  expect(spy1).toHaveBeenCalled();
  expect(spy2).toHaveBeenCalled();
});
```

### Test Structure (AAA Pattern)

```typescript
test('description of behavior', () => {
  // ARRANGE: Set up test data and conditions
  const detector = new ReentrancyDetector();
  const code = 'contract Foo { ... }';
  const context = createContext(code);

  // ACT: Execute the behavior being tested
  const issues = detector.detect(context);

  // ASSERT: Verify the outcome
  expect(issues).toHaveLength(1);
  expect(issues[0].severity).toBe(Severity.HIGH);
});
```

### Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: Cover main workflows
- **E2E Tests**: Cover critical user paths

```bash
# Run tests with coverage
npm test -- --coverage

# Coverage should meet these thresholds:
# Branches: 80%
# Functions: 90%
# Lines: 90%
# Statements: 90%
```

---

## Domain-Driven Design (DDD)

### Domain Model

Solin's domain consists of several bounded contexts:

```
┌─────────────────────────────────────────────────────────┐
│                    Solin Domain                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │  Analysis        │      │  Configuration   │       │
│  │  Context         │      │  Context         │       │
│  │                  │      │                  │       │
│  │ - AST            │      │ - Config         │       │
│  │ - Issues         │      │ - Rules          │       │
│  │ - Rules          │      │ - Presets        │       │
│  └──────────────────┘      └──────────────────┘       │
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │  Rule            │      │  Output          │       │
│  │  Context         │      │  Context         │       │
│  │                  │      │                  │       │
│  │ - Detectors      │      │ - Formatters     │       │
│  │ - Validators     │      │ - Reports        │       │
│  └──────────────────┘      └──────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Ubiquitous Language

Use consistent terminology throughout code, tests, and documentation:

| Domain Term   | Definition                            | Example                      |
| ------------- | ------------------------------------- | ---------------------------- |
| **Rule**      | A check that can be applied to code   | `ReentrancyDetector`         |
| **Detector**  | A rule that finds security issues     | `UninitialisedStateDetector` |
| **Validator** | A rule that checks code style         | `NamingConventionRule`       |
| **Issue**     | A problem found by a rule             | `Issue` class                |
| **Severity**  | Importance level of an issue          | `HIGH`, `MEDIUM`, `LOW`      |
| **Fix**       | Automatic correction for an issue     | `Fix` class                  |
| **Context**   | Information available during analysis | `AnalysisContext`            |
| **AST**       | Abstract Syntax Tree                  | `AST` interface              |
| **Visitor**   | Pattern for traversing AST            | `Visitor` interface          |

### Value Objects

```typescript
// Value objects are immutable and defined by their attributes

// DO: Use value objects for domain concepts
class Severity {
  private constructor(private readonly level: number) {}

  static readonly HIGH = new Severity(2);
  static readonly MEDIUM = new Severity(1);
  static readonly LOW = new Severity(0);

  isHigherThan(other: Severity): boolean {
    return this.level > other.level;
  }
}

class Location {
  constructor(
    public readonly file: string,
    public readonly start: Position,
    public readonly end: Position
  ) {}

  contains(other: Location): boolean {
    return this.start.isBefore(other.start) && this.end.isAfter(other.end);
  }
}

// ❌ DON'T: Use primitives for domain concepts
type Severity = string; // 'high' | 'medium' | 'low'
type Location = [string, number, number, number, number];
```

### Entities

```typescript
// Entities have identity and lifecycle

// DO: Use entities for things with identity
class AnalysisSession {
  constructor(
    public readonly id: string,
    private readonly startTime: Date,
    private issues: Issue[] = []
  ) {}

  addIssue(issue: Issue): void {
    this.issues.push(issue);
  }

  getIssues(): ReadonlyArray<Issue> {
    return this.issues;
  }

  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }
}
```

### Aggregates

```typescript
// Aggregates enforce invariants and manage consistency

// DO: Use aggregates for complex domain objects
class AnalysisResult {
  private constructor(
    private readonly issues: Issue[],
    private readonly metadata: Metadata
  ) {
    this.validateInvariants();
  }

  static create(issues: Issue[], metadata: Metadata): AnalysisResult {
    return new AnalysisResult(issues, metadata);
  }

  private validateInvariants(): void {
    // Ensure issues are sorted
    this.issues.sort(Issue.compareBy Severity);

    // Ensure no duplicates
    const seen = new Set<string>();
    for (const issue of this.issues) {
      const key = issue.getKey();
      if (seen.has(key)) {
        throw new Error('Duplicate issue');
      }
      seen.add(key);
    }
  }

  // Public interface maintains invariants
  filterBySeverity(severity: Severity): AnalysisResult {
    const filtered = this.issues.filter(i =>
      i.severity.equals(severity)
    );
    return AnalysisResult.create(filtered, this.metadata);
  }
}
```

### Domain Services

```typescript
// Domain services for operations that don't belong to any entity

// DO: Use domain services for complex operations
class ReentrancyAnalysisService {
  constructor(
    private readonly cfgBuilder: ControlFlowGraphBuilder,
    private readonly dataFlowAnalyzer: DataFlowAnalyzer
  ) {}

  analyzeFunction(func: FunctionNode): ReentrancyReport {
    // Build control flow graph
    const cfg = this.cfgBuilder.build(func);

    // Analyze data flow
    const dataFlow = this.dataFlowAnalyzer.analyze(cfg);

    // Find reentrancy patterns
    return this.findReentrancyPatterns(cfg, dataFlow);
  }

  private findReentrancyPatterns(cfg: ControlFlowGraph, dataFlow: DataFlowGraph): ReentrancyReport {
    // Complex domain logic
  }
}
```

### Repository Pattern

```typescript
// Repositories manage persistence of aggregates

// DO: Use repositories for data access
interface IAnalysisResultRepository {
  save(result: AnalysisResult): Promise<void>;
  findById(id: string): Promise<AnalysisResult | null>;
  findAll(): Promise<AnalysisResult[]>;
}

class FileSystemAnalysisResultRepository implements IAnalysisResultRepository {
  constructor(private readonly basePath: string) {}

  async save(result: AnalysisResult): Promise<void> {
    const path = this.getPath(result.id);
    await fs.writeFile(path, JSON.stringify(result));
  }

  async findById(id: string): Promise<AnalysisResult | null> {
    const path = this.getPath(id);
    if (!fs.existsSync(path)) return null;

    const data = await fs.readFile(path, 'utf-8');
    return AnalysisResult.fromJSON(JSON.parse(data));
  }
}
```

---

## Development Workflow

### Setting Up Development Environment

```bash
# 1. Clone repository
git clone https://github.com/yourusername/solin.git
cd solin

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Run tests
npm test

# 5. Start development mode
npm run dev
```

### Daily Development Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Start test watcher
npm run test:watch

# 4. TDD cycle
# - Write failing test
# - Write minimal code
# - Refactor
# - Commit

# 5. Push and create PR
git push origin feature/my-feature
```

### Feature Development Example

Let's implement a new rule using TDD:

```bash
# 1. Create test file first
touch test/rules/lint/no-console.test.ts

# 2. Write failing test
# test/rules/lint/no-console.test.ts
describe('NoConsoleRule', () => {
  test('should detect console.log', () => {
    const rule = new NoConsoleRule();
    const code = 'contract Foo { function bar() { console.log("test"); } }';
    const context = createContext(code);

    const issues = rule.detect(context);

    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('console');
  });
});

# 3. Run test (RED)
npm test -- no-console.test.ts
# Test fails ✗

# 4. Create implementation file
touch lib/rules/lint/no-console.ts

# 5. Write minimal code (GREEN)
export class NoConsoleRule extends AbstractRule {
  // Minimal implementation
}

# Run test
npm test -- no-console.test.ts
# Test passes ✓

# 6. Refactor
# Improve code quality while keeping tests green

# 7. Add more test cases
test('should detect console.error', () => { });
test('should ignore non-console calls', () => { });
test('should provide fix', () => { });

# 8. Implement each case
# Repeat RED-GREEN-REFACTOR cycle

# 9. Commit
git add .
git commit -m "feat: add no-console rule"

# 10. Push
git push origin feature/no-console-rule
```

---

## Code Review Guidelines

### As a Reviewer

#### Checklist

- [ ] **Functionality**: Does it work as intended?
- [ ] **Tests**: Are there tests? Do they pass?
- [ ] **Coverage**: Is coverage sufficient (>80%)?
- [ ] **Design**: Follows SOLID principles?
- [ ] **Clean Code**: Readable and maintainable?
- [ ] **Documentation**: Is code self-documenting? JSDoc added?
- [ ] **Performance**: Any obvious performance issues?
- [ ] **Security**: Any security concerns?
- [ ] **Breaking Changes**: Any breaking API changes?

#### Review Comments

```typescript
// GOOD: Constructive feedback
// Consider extracting this logic into a separate method
// for better testability and reusability.
function processData(data: any): any {
  // 50 lines of complex logic
}

// ❌ BAD: Non-constructive
// This is bad.
```

### As an Author

#### Before Requesting Review

- [ ] All tests pass locally
- [ ] Code is formatted (`npm run format`)
- [ ] No linting errors (`npm run lint`)
- [ ] Coverage meets threshold
- [ ] Documentation updated
- [ ] Self-review completed

#### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made

- Added X
- Modified Y
- Removed Z

## Testing

- Added unit tests for X
- Added integration tests for Y
- Manual testing performed: Z

## Checklist

- [ ] Tests pass
- [ ] Coverage > 80%
- [ ] Documentation updated
- [ ] Breaking changes documented
```

---

## Git Workflow

### Branch Naming

```
feature/add-reentrancy-detector
bugfix/fix-parser-crash
refactor/improve-performance
docs/update-readme
chore/update-dependencies
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples**:

```
feat(security): add reentrancy detector

Implements reentrancy detection using control flow analysis.
Detects state changes after external calls.

Closes #123
```

```
fix(parser): handle malformed input gracefully

Parser was crashing on files with syntax errors.
Now returns error information instead of throwing.

Fixes #456
```

### Pull Request Process

1. **Create Branch**: From `main`
2. **Develop**: Using TDD
3. **Self-Review**: Check code quality
4. **Push**: Push to remote
5. **Create PR**: With description
6. **CI Checks**: Wait for CI to pass
7. **Review**: Address feedback
8. **Merge**: Squash and merge

---

## Continuous Integration

### CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run lint
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write", "npm test -- --findRelatedTests"]
  }
}
```

---

## Troubleshooting

### Common Issues

#### Tests Not Running

```bash
# Clear Jest cache
npm test -- --clearCache

# Run with verbose output
npm test -- --verbose
```

#### Build Failures

```bash
# Clean build
rm -rf dist
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

#### Import Errors

```bash
# Check tsconfig.json paths
# Verify alias configuration matches
```

### Debugging

```typescript
// Use debugger in tests
test('debug test', () => {
  const result = detector.detect(context);
  debugger;  // Breakpoint
  expect(result).toHaveLength(1);
});

// Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

// In Chrome: chrome://inspect
```

---

## Best Practices Summary

### DO's

Write tests first (TDD)
Keep tests independent
Use domain language consistently
Follow SOLID principles
Refactor continuously
Review code thoroughly
Document complex logic
Commit often with clear messages

### DON'Ts

❌ Skip writing tests
❌ Test implementation details
❌ Mix concerns in classes
❌ Duplicate code
❌ Ignore code review feedback
❌ Commit broken code
❌ Push without running tests

---

## Resources

### Books

- "Test Driven Development" by Kent Beck
- "Domain-Driven Design" by Eric Evans
- "Clean Code" by Robert C. Martin
- "Refactoring" by Martin Fowler

### Tools

- [Jest](https://jestjs.io/) - Testing framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [ESLint](https://eslint.org/) - Code linting
- [Prettier](https://prettier.io/) - Code formatting

---

## Questions?

If you have questions about development practices:

1. Check existing issues and PRs
2. Ask in GitHub Discussions
3. Reach out to maintainers

Happy coding! 🚀
