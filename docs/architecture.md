# Solin Architecture Documentation

> **Version**: 1.0.0
> **Last Updated**: 2025-01-07
> **Status**: Design Phase

## Table of Contents

1. [System Overview](#system-overview)
2. [Architectural Principles](#architectural-principles)
3. [High-Level Architecture](#high-level-architecture)
4. [Component Design](#component-design)
5. [Data Flow](#data-flow)
6. [Design Patterns](#design-patterns)
7. [Performance Considerations](#performance-considerations)
8. [Security Architecture](#security-architecture)
9. [Extension Points](#extension-points)
10. [Technology Stack](#technology-stack)

---

## System Overview

### Vision

Solin is a **unified Solidity static analysis platform** that combines comprehensive linting with advanced security detection, designed for high performance and extensibility.

### Core Objectives

1. **Accuracy**: Minimize false positives while catching real issues
2. **Performance**: Analyze large codebases efficiently through parallelization
3. **Extensibility**: Plugin system for custom rules and integrations
4. **Developer Experience**: Clear diagnostics, auto-fix, seamless workflows
5. **Maintainability**: Clean architecture following SOLID principles

### Key Metrics

- **Target**: Analyze 1000+ Solidity files in < 30 seconds
- **Accuracy**: < 5% false positive rate for security detectors
- **Coverage**: 80+ lint rules, 99+ security detectors
- **Extensibility**: Plugin API with < 100 LOC for custom rules

---

## Architectural Principles

### SOLID Principles Application

#### 1. Single Responsibility Principle (SRP)

**Implementation**:
- Each rule focuses on ONE specific pattern or vulnerability
- Engine orchestrates but doesn't implement analysis logic
- Formatters only handle output formatting
- Parser only parses AST, doesn't analyze

**Example**:
```javascript
// ✅ GOOD: Single responsibility
class ReentrancyDetector {
  detect(ast) {
    // Only detects reentrancy
  }
}

// ❌ BAD: Multiple responsibilities
class SecurityChecker {
  detectReentrancy(ast) { }
  detectOverflow(ast) { }
  formatReport(results) { }
}
```

#### 2. Open/Closed Principle (OCP)

**Implementation**:
- Rules are open for extension via inheritance
- Engine is closed for modification but extensible via plugins
- Formatters can be added without modifying core

**Example**:
```javascript
// Base detector - closed for modification
class AbstractDetector {
  constructor(severity, category) {
    this.severity = severity;
    this.category = category;
  }

  detect(ast) {
    throw new Error('Must be implemented by subclass');
  }
}

// Extended detector - open for extension
class CustomReentrancyDetector extends AbstractDetector {
  detect(ast) {
    // Custom implementation
  }
}
```

#### 3. Liskov Substitution Principle (LSP)

**Implementation**:
- All detectors implement the same interface
- Any detector can replace another without breaking the system
- Formatters are interchangeable

**Example**:
```javascript
// All detectors must be substitutable
interface IDetector {
  detect(ast: AST): Issue[];
  getSeverity(): Severity;
  getCategory(): Category;
}

// Engine can use any detector without knowing specifics
class Engine {
  runDetector(detector: IDetector) {
    return detector.detect(this.ast);
  }
}
```

#### 4. Interface Segregation Principle (ISP)

**Implementation**:
- Small, focused interfaces instead of monolithic ones
- Rules don't depend on features they don't use
- Optional interfaces for auto-fix, metadata, etc.

**Example**:
```javascript
// Segregated interfaces
interface IDetector {
  detect(ast: AST): Issue[];
}

interface IFixable {
  fix(issue: Issue): Fix;
}

interface IConfigurable {
  configure(options: Config): void;
}

// Rules implement only what they need
class ReentrancyDetector implements IDetector {
  detect(ast) { /* ... */ }
}

class NamingConventionRule implements IDetector, IFixable {
  detect(ast) { /* ... */ }
  fix(issue) { /* ... */ }
}
```

#### 5. Dependency Inversion Principle (DIP)

**Implementation**:
- High-level modules (Engine) depend on abstractions
- Low-level modules (Rules) depend on abstractions
- No direct dependencies on concrete implementations

**Example**:
```javascript
// High-level module depends on abstraction
class AnalysisEngine {
  constructor(
    private parser: IParser,
    private detectors: IDetector[],
    private formatter: IFormatter
  ) {}
}

// Abstractions
interface IParser {
  parse(source: string): AST;
}

interface IDetector {
  detect(ast: AST): Issue[];
}

interface IFormatter {
  format(issues: Issue[]): string;
}
```

---

## High-Level Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Layer                               │
│  (Commander.js, Argument Parsing, Configuration Loading)   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Orchestration Layer                        │
│     (Engine, WorkerPool, CacheManager, Reporter)           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Analysis Layer                           │
│  (RuleRegistry, DetectorRegistry, AnalysisContext)         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Rule Layer                              │
│  (Lint Rules, Security Detectors, Custom Rules)           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Foundation Layer                          │
│     (Parser, AST Walker, Utility Functions)                │
└─────────────────────────────────────────────────────────────┘
```

### Component Diagram

```
                    ┌─────────────┐
                    │     CLI     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Engine    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐      ┌────▼─────┐      ┌────▼─────┐
   │  Parser  │      │  Rules   │      │Formatter │
   └────┬─────┘      └────┬─────┘      └──────────┘
        │                 │
   ┌────▼─────┐      ┌────▼─────┐
   │   AST    │      │  Issues  │
   └──────────┘      └──────────┘
        │                 │
        │                 │
   ┌────▼─────────────────▼─────┐
   │     Worker Pool             │
   │  (Parallel Processing)      │
   └─────────────────────────────┘
```

---

## Component Design

### 1. CLI Layer

**Responsibility**: Command-line interface and user interaction

**Components**:

```javascript
// cli/index.js
class CLI {
  constructor(private commander: Commander) {}

  run(argv: string[]): Promise<ExitCode> {
    const options = this.parseArguments(argv);
    const config = this.loadConfiguration(options);
    const engine = this.createEngine(config);
    const results = await engine.analyze(options.files);
    return this.outputResults(results, config);
  }
}
```

**Key Classes**:
- `CLI`: Main entry point
- `ArgumentParser`: Parses command-line arguments
- `ConfigLoader`: Loads and merges configuration files
- `ConfigValidator`: Validates configuration against schema

### 2. Orchestration Layer

**Responsibility**: Coordinate analysis workflow and manage resources

#### Engine

```javascript
// core/engine.js
class AnalysisEngine {
  constructor(
    private config: Config,
    private parser: IParser,
    private ruleRegistry: RuleRegistry,
    private workerPool: WorkerPool,
    private cacheManager: CacheManager
  ) {}

  async analyze(files: string[]): Promise<AnalysisResult> {
    // 1. Filter cached files
    const filesToAnalyze = await this.filterCached(files);

    // 2. Parse files in parallel
    const asts = await this.parseFiles(filesToAnalyze);

    // 3. Run analysis
    const issues = await this.runAnalysis(asts);

    // 4. Update cache
    await this.updateCache(files, issues);

    return new AnalysisResult(issues);
  }

  private async runAnalysis(asts: AST[]): Promise<Issue[]> {
    const rules = this.ruleRegistry.getEnabledRules();

    // Use worker pool for parallel processing
    return this.workerPool.process(asts, rules);
  }
}
```

#### Worker Pool

```javascript
// core/worker-pool.js
class WorkerPool {
  constructor(private size: number) {
    this.workers = this.createWorkers(size);
  }

  async process(asts: AST[], rules: Rule[]): Promise<Issue[]> {
    const tasks = this.createTasks(asts, rules);
    return this.distributeWork(tasks);
  }

  private createTasks(asts: AST[], rules: Rule[]): Task[] {
    // Distribute ASTs and rules across workers
    return asts.map(ast => ({
      ast,
      rules: rules.filter(rule => rule.isEnabled())
    }));
  }
}
```

#### Cache Manager

```javascript
// core/cache-manager.js
class CacheManager {
  async shouldAnalyze(file: string, config: Config): Promise<boolean> {
    const cached = await this.load(file);
    if (!cached) return true;

    const fileHash = await this.hashFile(file);
    const configHash = this.hashConfig(config);

    return cached.fileHash !== fileHash ||
           cached.configHash !== configHash;
  }

  async update(file: string, issues: Issue[], config: Config): Promise<void> {
    await this.save(file, {
      fileHash: await this.hashFile(file),
      configHash: this.hashConfig(config),
      issues: issues.length === 0 ? [] : issues,
      timestamp: Date.now()
    });
  }
}
```

### 3. Analysis Layer

#### Rule Registry

```javascript
// rules/rule-registry.js
class RuleRegistry {
  private rules: Map<string, Rule> = new Map();

  register(rule: Rule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule ${rule.id} already registered`);
    }
    this.rules.set(rule.id, rule);
  }

  getEnabledRules(config: Config): Rule[] {
    return Array.from(this.rules.values())
      .filter(rule => this.isEnabled(rule, config));
  }

  private isEnabled(rule: Rule, config: Config): boolean {
    const ruleConfig = config.rules[rule.id];
    return ruleConfig && ruleConfig !== 'off';
  }
}
```

#### Analysis Context

```javascript
// core/analysis-context.js
class AnalysisContext {
  constructor(
    public readonly ast: AST,
    public readonly sourceCode: string,
    public readonly filePath: string,
    public readonly config: Config
  ) {}

  // Helper methods for rule implementations
  getNodeAtPosition(line: number, column: number): ASTNode | null {
    return this.ast.findNode(line, column);
  }

  getSourceRange(node: ASTNode): string {
    return this.sourceCode.slice(node.range[0], node.range[1]);
  }
}
```

### 4. Rule Layer

#### Abstract Rule Base Class

```javascript
// rules/abstract-rule.js
abstract class AbstractRule implements IRule {
  constructor(
    public readonly id: string,
    public readonly category: Category,
    public readonly severity: Severity,
    public readonly metadata: RuleMetadata
  ) {}

  abstract detect(context: AnalysisContext): Issue[];

  protected createIssue(
    node: ASTNode,
    message: string,
    fix?: Fix
  ): Issue {
    return new Issue({
      ruleId: this.id,
      severity: this.severity,
      message,
      location: node.loc,
      fix
    });
  }
}
```

#### Example Rule Implementation

```javascript
// rules/security/reentrancy-detector.js
class ReentrancyDetector extends AbstractRule {
  constructor() {
    super(
      'security/reentrancy',
      Category.SECURITY,
      Severity.HIGH,
      {
        title: 'Reentrancy vulnerability',
        description: 'Detects potential reentrancy vulnerabilities',
        recommendation: 'Use Checks-Effects-Interactions pattern'
      }
    );
  }

  detect(context: AnalysisContext): Issue[] {
    const issues: Issue[] = [];

    // Find all functions
    const functions = context.ast.findAll('FunctionDefinition');

    for (const func of functions) {
      // Check for external calls followed by state changes
      const externalCalls = this.findExternalCalls(func);
      const stateChanges = this.findStateChanges(func);

      if (this.hasReentrancyPattern(externalCalls, stateChanges)) {
        issues.push(this.createIssue(
          func,
          'Potential reentrancy vulnerability detected'
        ));
      }
    }

    return issues;
  }

  private findExternalCalls(func: ASTNode): ASTNode[] {
    // Implementation
  }

  private findStateChanges(func: ASTNode): ASTNode[] {
    // Implementation
  }

  private hasReentrancyPattern(
    calls: ASTNode[],
    changes: ASTNode[]
  ): boolean {
    // Check if state changes occur after external calls
  }
}
```

### 5. Foundation Layer

#### Parser

```javascript
// parser/solidity-parser.js
class SolidityParser implements IParser {
  constructor(private parserLib: any) {}

  parse(source: string, options?: ParseOptions): AST {
    try {
      return this.parserLib.parse(source, {
        loc: true,
        range: true,
        tolerant: options?.tolerant ?? false
      });
    } catch (error) {
      throw new ParseError(`Failed to parse: ${error.message}`);
    }
  }

  parseFile(filePath: string): AST {
    const source = fs.readFileSync(filePath, 'utf-8');
    return this.parse(source);
  }
}
```

#### AST Walker

```javascript
// parser/ast-walker.js
class ASTWalker {
  walk(ast: AST, visitor: Visitor): void {
    this.visitNode(ast, visitor);
  }

  private visitNode(node: ASTNode, visitor: Visitor): void {
    // Call enter callback
    if (visitor[node.type]) {
      visitor[node.type].enter?.(node);
    }

    // Visit children
    for (const child of this.getChildren(node)) {
      this.visitNode(child, visitor);
    }

    // Call exit callback
    if (visitor[node.type]) {
      visitor[node.type].exit?.(node);
    }
  }
}
```

---

## Data Flow

### Analysis Pipeline

```
┌──────────────┐
│  Input Files │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Configuration   │ ←── Load .solinrc.json
│     Loading      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  File Filtering  │ ←── Check cache, apply ignore patterns
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│     Parsing      │ ←── @solidity-parser/parser
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  AST Enrichment  │ ←── Add parent refs, scope info
└──────┬───────────┘
       │
       ▼
┌──────────────────────────────────────┐
│        Parallel Analysis             │
│  ┌─────────┐  ┌─────────┐           │
│  │Worker 1 │  │Worker 2 │  ...      │
│  └─────────┘  └─────────┘           │
│   Rules 1-20   Rules 21-40          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────┐
│  Issue Collection│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Deduplication  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│    Sorting       │ ←── By severity, file, line
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│    Formatting    │ ←── JSON, SARIF, Markdown, etc.
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│     Output       │
└──────────────────┘
```

### State Management

```javascript
// core/analysis-state.js
class AnalysisState {
  private files: Map<string, FileState> = new Map();
  private issues: Issue[] = [];

  addFile(file: string, state: FileState): void {
    this.files.set(file, state);
  }

  addIssues(issues: Issue[]): void {
    this.issues.push(...issues);
  }

  getResults(): AnalysisResult {
    return {
      files: Array.from(this.files.values()),
      issues: this.deduplicateIssues(this.issues),
      summary: this.createSummary()
    };
  }
}
```

---

## Design Patterns

### 1. Strategy Pattern (Rule Selection)

```javascript
class RuleSelectionStrategy {
  selectRules(config: Config): Rule[] {
    // Different strategies: all, recommended, custom
  }
}

class RecommendedRuleStrategy extends RuleSelectionStrategy {
  selectRules(config: Config): Rule[] {
    return rules.filter(r => r.recommended);
  }
}
```

### 2. Visitor Pattern (AST Traversal)

```javascript
interface Visitor {
  FunctionDefinition?: {
    enter?: (node: ASTNode) => void;
    exit?: (node: ASTNode) => void;
  };
  // Other node types...
}

class SecurityVisitor implements Visitor {
  FunctionDefinition = {
    enter: (node) => {
      // Check function security
    }
  };
}
```

### 3. Factory Pattern (Rule Creation)

```javascript
class RuleFactory {
  createRule(id: string, config: RuleConfig): Rule {
    const RuleClass = this.registry.get(id);
    return new RuleClass(config);
  }
}
```

### 4. Observer Pattern (Progress Reporting)

```javascript
class ProgressObserver {
  onFileAnalyzed(file: string): void {
    console.log(`Analyzed: ${file}`);
  }

  onIssueFound(issue: Issue): void {
    console.log(`Issue: ${issue.message}`);
  }
}

class Engine {
  private observers: ProgressObserver[] = [];

  addObserver(observer: ProgressObserver): void {
    this.observers.push(observer);
  }
}
```

### 5. Plugin Pattern (Extensibility)

```javascript
interface IPlugin {
  name: string;
  version: string;
  rules: Rule[];
  initialize(engine: Engine): void;
}

class CustomPlugin implements IPlugin {
  name = 'custom-security';
  version = '1.0.0';
  rules = [new CustomRule1(), new CustomRule2()];

  initialize(engine: Engine): void {
    engine.registerRules(this.rules);
  }
}
```

---

## Performance Considerations

### 1. Parallel Processing

**Implementation**:
```javascript
// Use Worker Threads for CPU-bound tasks
const { Worker } = require('worker_threads');

class WorkerPool {
  async analyze(files: string[]): Promise<Issue[]> {
    const workers = this.createWorkers();
    const chunks = this.chunkFiles(files, workers.length);

    const promises = workers.map((worker, i) =>
      worker.analyze(chunks[i])
    );

    const results = await Promise.all(promises);
    return results.flat();
  }
}
```

**Benefits**:
- 4x-8x speedup on multi-core systems
- Better CPU utilization
- Isolated memory per worker

### 2. Caching Strategy

**Multi-Level Cache**:
```javascript
class CacheManager {
  // L1: Memory cache (fastest)
  private memoryCache: Map<string, CacheEntry> = new Map();

  // L2: Disk cache (persistent)
  private diskCachePath: string = '.solin-cache';

  async get(file: string): Promise<CacheEntry | null> {
    // Check memory first
    let entry = this.memoryCache.get(file);
    if (entry) return entry;

    // Check disk
    entry = await this.loadFromDisk(file);
    if (entry) {
      this.memoryCache.set(file, entry);
    }

    return entry;
  }
}
```

### 3. Incremental Analysis

**Smart File Filtering**:
```javascript
class IncrementalAnalyzer {
  async analyze(files: string[]): Promise<Issue[]> {
    const changed = await this.findChangedFiles(files);
    const affected = await this.findAffectedFiles(changed);

    // Only analyze changed and affected files
    return this.analyzeFiles([...changed, ...affected]);
  }

  private async findChangedFiles(files: string[]): Promise<string[]> {
    // Compare file hashes with cache
  }

  private async findAffectedFiles(changed: string[]): Promise<string[]> {
    // Find files that import changed files
  }
}
```

### 4. AST Reuse

**Memoized Parsing**:
```javascript
class Parser {
  private astCache: Map<string, AST> = new Map();

  parse(source: string, hash: string): AST {
    if (this.astCache.has(hash)) {
      return this.astCache.get(hash);
    }

    const ast = this.doParse(source);
    this.astCache.set(hash, ast);
    return ast;
  }
}
```

---

## Security Architecture

### 1. Input Validation

```javascript
class ConfigValidator {
  validate(config: unknown): Config {
    // Validate against schema
    const schema = this.getSchema();
    const valid = ajv.validate(schema, config);

    if (!valid) {
      throw new ValidationError(ajv.errors);
    }

    // Sanitize paths
    config.excludedFiles = config.excludedFiles.map(
      path => this.sanitizePath(path)
    );

    return config as Config;
  }

  private sanitizePath(path: string): string {
    // Prevent path traversal
    return path.replace(/\.\./g, '');
  }
}
```

### 2. Sandboxed Execution

```javascript
// For custom plugins
class PluginSandbox {
  execute(plugin: IPlugin, timeout: number): void {
    const vm = new VM({
      timeout,
      sandbox: {
        // Limited API surface
        console: safeConsole,
        require: safeRequire
      }
    });

    vm.run(plugin.code);
  }
}
```

---

## Extension Points

### 1. Custom Rules

```javascript
// User's custom rule
class MyCustomRule extends AbstractRule {
  constructor() {
    super(
      'custom/my-rule',
      Category.CUSTOM,
      Severity.WARNING,
      { /* metadata */ }
    );
  }

  detect(context: AnalysisContext): Issue[] {
    // Custom logic
  }
}

// Register
engine.registerRule(new MyCustomRule());
```

### 2. Custom Formatters

```javascript
class CustomFormatter implements IFormatter {
  format(issues: Issue[]): string {
    // Custom output format
  }
}

engine.registerFormatter('custom', new CustomFormatter());
```

### 3. Plugins

```javascript
// Plugin structure
module.exports = {
  name: '@company/solin-plugin',
  version: '1.0.0',
  rules: [
    require('./rules/custom-rule-1'),
    require('./rules/custom-rule-2')
  ]
};
```

---

## Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    "@solidity-parser/parser": "^0.20.0",
    "commander": "^12.0.0",
    "chalk": "^5.0.0",
    "ajv": "^8.0.0",
    "cosmiconfig": "^9.0.0",
    "glob": "^10.0.0",
    "ignore": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Build Tools

- **TypeScript**: Type safety and better tooling
- **ESBuild**: Fast bundling
- **Jest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting

### CI/CD

- **GitHub Actions**: Automated testing and deployment
- **Semantic Release**: Automated versioning
- **Codecov**: Test coverage tracking

---

## Conclusion

This architecture provides:

✅ **Maintainability** through SOLID principles and clean separation of concerns
✅ **Extensibility** via plugin system and well-defined interfaces
✅ **Performance** through parallel processing and intelligent caching
✅ **Reliability** through comprehensive testing and type safety
✅ **Developer Experience** through clear APIs and excellent documentation

The architecture is designed to evolve with the project while maintaining backward compatibility and supporting the growing ecosystem of plugins and integrations.
