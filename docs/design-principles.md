# Design Principles & Best Practices

> **Applies To**: All Solin contributors and maintainers

## Table of Contents

1. [SOLID Principles](#solid-principles)
2. [Clean Code Principles](#clean-code-principles)
3. [Design Patterns Catalog](#design-patterns-catalog)
4. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
5. [Code Organization](#code-organization)
6. [Error Handling Strategy](#error-handling-strategy)
7. [Performance Guidelines](#performance-guidelines)
8. [Security Practices](#security-practices)

---

## SOLID Principles

### Single Responsibility Principle (SRP)

**Definition**: A class should have only one reason to change.

#### Application in Solin

```typescript
// GOOD: Each class has single responsibility
class SolidityParser {
  parse(source: string): AST {
    // Only responsible for parsing
  }
}

class ASTEnhancer {
  enhance(ast: AST): EnhancedAST {
    // Only responsible for enriching AST
  }
}

class ReentrancyDetector {
  detect(ast: AST): Issue[] {
    // Only responsible for reentrancy detection
  }
}

// ❌ BAD: Multiple responsibilities
class AnalyzerGod {
  parse(source: string): AST {}
  enhance(ast: AST): EnhancedAST {}
  detectReentrancy(ast: AST): Issue[] {}
  formatOutput(issues: Issue[]): string {}
}
```

#### Guidelines

1. **One Purpose Per Class**: Each class should do one thing well
2. **Single Reason to Change**: If you can describe a class in 25 words with "and", it's doing too much
3. **Naming Convention**: Class names should clearly indicate their single purpose
4. **Function Length**: Functions should be 20-50 lines, focused on one task

---

### Open/Closed Principle (OCP)

**Definition**: Software entities should be open for extension but closed for modification.

#### Application in Solin

```typescript
// GOOD: Open for extension via inheritance
abstract class AbstractDetector {
  abstract detect(context: AnalysisContext): Issue[];

  protected createIssue(node: ASTNode, message: string): Issue {
    // Reusable logic for all detectors
  }
}

// Extend without modifying base
class CustomReentrancyDetector extends AbstractDetector {
  detect(context: AnalysisContext): Issue[] {
    // Custom implementation
  }
}

// ❌ BAD: Requires modification for each new detector
class DetectorEngine {
  runDetectors(ast: AST): Issue[] {
    const issues = [];
    issues.push(...this.detectReentrancy(ast));
    issues.push(...this.detectOverflow(ast));
    // Need to modify this method for each new detector
    return issues;
  }
}
```

#### Implementation Patterns

1. **Abstract Base Classes**: Define interfaces through abstract classes
2. **Strategy Pattern**: Allow algorithm selection at runtime
3. **Plugin Architecture**: Support plugins without core modification
4. **Template Method**: Define skeleton in base, specifics in subclasses

---

### Liskov Substitution Principle (LSP)

**Definition**: Subtypes must be substitutable for their base types.

#### Application in Solin

```typescript
// GOOD: All detectors can be used interchangeably
interface IDetector {
  detect(context: AnalysisContext): Issue[];
  getSeverity(): Severity;
}

class ReentrancyDetector implements IDetector {
  detect(context: AnalysisContext): Issue[] {
    // Returns Issue[]
  }
  getSeverity(): Severity {
    return Severity.HIGH;
  }
}

class NamingDetector implements IDetector {
  detect(context: AnalysisContext): Issue[] {
    // Returns Issue[]
  }
  getSeverity(): Severity {
    return Severity.WARNING;
  }
}

// Engine can use any detector
class Engine {
  run(detectors: IDetector[]): Issue[] {
    return detectors.flatMap(d => d.detect(this.context));
  }
}

// ❌ BAD: Subtype changes behavior unexpectedly
class BrokenDetector implements IDetector {
  detect(context: AnalysisContext): Issue[] {
    // Returns null instead of array!
    return null;
  }
  getSeverity(): Severity {
    throw new Error('Not implemented');
  }
}
```

#### Guidelines

1. **Consistent Return Types**: Don't change expected return types
2. **No Stronger Preconditions**: Don't require more than base class
3. **No Weaker Postconditions**: Deliver at least what base class promises
4. **Exception Consistency**: Don't throw new unchecked exceptions

---

### Interface Segregation Principle (ISP)

**Definition**: Clients shouldn't depend on interfaces they don't use.

#### Application in Solin

```typescript
// GOOD: Segregated interfaces
interface IDetector {
  detect(context: AnalysisContext): Issue[];
}

interface IFixable {
  fix(issue: Issue): Fix;
}

interface IConfigurable {
  configure(options: any): void;
}

interface IDocumented {
  getDocumentation(): Documentation;
}

// Rules implement only what they need
class SimpleDetector implements IDetector {
  detect(context: AnalysisContext): Issue[] {}
}

class FixableDetector implements IDetector, IFixable {
  detect(context: AnalysisContext): Issue[] {}
  fix(issue: Issue): Fix {}
}

// ❌ BAD: Fat interface
interface IDetectorFat {
  detect(context: AnalysisContext): Issue[];
  fix(issue: Issue): Fix; // Not all detectors can fix
  configure(options: any): void; // Not all need config
  benchmark(): Metrics; // Not all need benchmarking
  visualize(): Graph; // Not all need visualization
}
```

#### Benefits

1. **Reduced Coupling**: Classes depend only on methods they use
2. **Easier Testing**: Mock only relevant methods
3. **Clear Contracts**: Each interface has a clear purpose
4. **Flexible Implementation**: Mix and match interfaces as needed

---

### Dependency Inversion Principle (DIP)

**Definition**: High-level modules shouldn't depend on low-level modules. Both should depend on abstractions.

#### Application in Solin

```typescript
// GOOD: Depend on abstractions
class AnalysisEngine {
  constructor(
    private parser: IParser, // Abstract interface
    private detectors: IDetector[], // Abstract interface
    private formatter: IFormatter // Abstract interface
  ) {}

  async analyze(files: string[]): Promise<Report> {
    const asts = await Promise.all(files.map(f => this.parser.parse(f)));

    const issues = asts.flatMap(ast => this.detectors.flatMap(d => d.detect(ast)));

    return this.formatter.format(issues);
  }
}

// Concrete implementations
class SolidityParser implements IParser {
  parse(source: string): AST {}
}

// ❌ BAD: Depend on concrete classes
class AnalysisEngineBad {
  private parser = new SolidityParser(); // Tight coupling
  private detector = new ReentrancyDetector(); // Can't swap
  private formatter = new JSONFormatter(); // Hard to test
}
```

#### Implementation

1. **Constructor Injection**: Pass dependencies through constructor
2. **Factory Pattern**: Use factories to create concrete instances
3. **Dependency Injection Container**: Use DI container for complex apps
4. **Interface First**: Define interfaces before implementations

---

## Clean Code Principles

### Meaningful Names

```typescript
// GOOD: Clear, descriptive names
class UserAuthenticationService {
  authenticateUser(credentials: UserCredentials): AuthenticationResult {}
}

function calculateMonthlyInterestRate(annualRate: number): number {
  return annualRate / 12;
}

const MAX_RETRY_ATTEMPTS = 3;

// ❌ BAD: Unclear names
class UAS {
  auth(c: any): any {}
}

function calc(r: number): number {
  return r / 12;
}

const m = 3;
```

#### Naming Guidelines

1. **Classes**: Nouns or noun phrases (e.g., `Customer`, `WikiPage`)
2. **Methods**: Verbs or verb phrases (e.g., `postPayment`, `deletePage`)
3. **Booleans**: Predicates (e.g., `isValid`, `hasPermission`, `canProcess`)
4. **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_CONNECTIONS`)
5. **Variables**: Descriptive, pronounceable (e.g., `generationTimestamp` not `genymdhms`)

---

### Functions

#### Small Functions

```typescript
// GOOD: Small, focused function
function validateUserAge(user: User): ValidationResult {
  if (user.age < 18) {
    return ValidationResult.invalid('User must be 18 or older');
  }
  return ValidationResult.valid();
}

// ❌ BAD: Large, unfocused function
function processUser(user: User): void {
  // Validation
  if (user.age < 18) throw new Error('Too young');
  if (!user.email) throw new Error('No email');
  if (user.name.length < 2) throw new Error('Name too short');

  // Database save
  const db = new Database();
  db.connect();
  db.save(user);
  db.close();

  // Send email
  const emailService = new EmailService();
  emailService.sendWelcomeEmail(user.email);

  // Log activity
  const logger = new Logger();
  logger.log(`User ${user.id} processed`);
}
```

#### Single Level of Abstraction

```typescript
// GOOD: Consistent abstraction level
function analyzeContract(filePath: string): AnalysisResult {
  const source = readFile(filePath);
  const ast = parseSource(source);
  const issues = detectIssues(ast);
  return formatResult(issues);
}

function detectIssues(ast: AST): Issue[] {
  const securityIssues = runSecurityDetectors(ast);
  const lintIssues = runLintRules(ast);
  return [...securityIssues, ...lintIssues];
}

// ❌ BAD: Mixed abstraction levels
function analyzeContractBad(filePath: string): AnalysisResult {
  const source = fs.readFileSync(filePath, 'utf-8'); // Low level
  const ast = parseSource(source); // High level

  // Very low level
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === 'FunctionDefinition') {
      // ...
    }
  }

  const issues = detectIssues(ast); // High level
  return formatResult(issues);
}
```

#### Function Arguments

```typescript
// GOOD: 0-2 arguments
function createUser(name: string, email: string): User {
  return new User(name, email);
}

function validateInput(input: ValidationInput): ValidationResult {
  // Use object for multiple related params
}

// ❌ BAD: Too many arguments
function createUserBad(
  name: string,
  email: string,
  age: number,
  address: string,
  phone: string,
  role: string,
  active: boolean
): User {
  // Hard to remember order, hard to test
}
```

---

### Comments

```typescript
// GOOD: Code is self-explanatory
function isEligibleForDiscount(user: User): boolean {
  const hasBeenMemberForOverYear = user.memberSince < Date.now() - YEAR_IN_MS;

  const hasMadeMultiplePurchases = user.purchaseCount > 5;

  return hasBeenMemberForOverYear && hasMadeMultiplePurchases;
}

// GOOD: Explains WHY, not WHAT
function calculateTax(amount: number): number {
  // Tax rate set to match federal guidelines as of 2025
  const TAX_RATE = 0.2;
  return amount * TAX_RATE;
}

// ❌ BAD: Redundant comments
function addNumbers(a: number, b: number): number {
  // Add a and b
  return a + b; // Return the sum
}

// ❌ BAD: Commented-out code
function process(data: any): void {
  // const oldWay = processOldWay(data);
  // if (oldWay.isValid) {
  //   return oldWay.result;
  // }

  return processNewWay(data);
}
```

#### When to Comment

1. **Legal/License Information**: At file top
2. **Intent/Rationale**: Why certain decisions were made
3. **Clarification**: When code can't be made clearer
4. **Warning**: Of consequences (e.g., "This operation is slow")
5. **TODO**: Planned improvements (with ticket number)
6. **API Documentation**: JSDoc for public APIs

#### When NOT to Comment

1. **Redundant Information**: Don't repeat what code says
2. **Mandated Comments**: Don't force comments everywhere
3. **Journal Comments**: Version control handles history
4. **Position Markers**: Use functions/classes to organize
5. **Closing Brace Comments**: Use small functions instead

---

### Error Handling

```typescript
// GOOD: Use exceptions, not error codes
function parseFile(path: string): AST {
  if (!fs.existsSync(path)) {
    throw new FileNotFoundError(`File not found: ${path}`);
  }

  try {
    const content = fs.readFileSync(path, 'utf-8');
    return parser.parse(content);
  } catch (error) {
    throw new ParseError(`Failed to parse ${path}`, error);
  }
}

// GOOD: Provide context with exceptions
class ParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

// ❌ BAD: Error codes
function parseFileBad(path: string): [AST | null, number] {
  if (!fs.existsSync(path)) {
    return [null, ERROR_FILE_NOT_FOUND];
  }

  try {
    const content = fs.readFileSync(path, 'utf-8');
    return [parser.parse(content), ERROR_NONE];
  } catch (error) {
    return [null, ERROR_PARSE_FAILED];
  }
}
```

#### Error Handling Guidelines

1. **Use Exceptions**: For exceptional conditions
2. **Specific Exceptions**: Create custom error classes
3. **Context in Errors**: Include relevant information
4. **Don't Return Null**: Use exceptions or Optional
5. **Don't Pass Null**: Validate inputs at boundaries
6. **Fail Fast**: Detect errors as early as possible

---

## Design Patterns Catalog

### Creational Patterns

#### Factory Pattern

```typescript
// Use for creating different rule instances
class RuleFactory {
  createRule(type: string, config: RuleConfig): IRule {
    switch (type) {
      case 'security/reentrancy':
        return new ReentrancyDetector(config);
      case 'lint/naming':
        return new NamingRule(config);
      default:
        throw new Error(`Unknown rule type: ${type}`);
    }
  }
}
```

#### Builder Pattern

```typescript
// Use for complex object construction
class AnalysisResultBuilder {
  private issues: Issue[] = [];
  private metadata: Metadata = {};

  withIssues(issues: Issue[]): this {
    this.issues = issues;
    return this;
  }

  withMetadata(metadata: Metadata): this {
    this.metadata = metadata;
    return this;
  }

  build(): AnalysisResult {
    return new AnalysisResult(this.issues, this.metadata);
  }
}

// Usage
const result = new AnalysisResultBuilder()
  .withIssues(issues)
  .withMetadata({ duration: 1000 })
  .build();
```

### Structural Patterns

#### Adapter Pattern

```typescript
// Adapt external parser to our interface
class SolidityParserAdapter implements IParser {
  constructor(private externalParser: any) {}

  parse(source: string): AST {
    // Adapt external format to our format
    const externalAST = this.externalParser.parse(source);
    return this.convertAST(externalAST);
  }
}
```

#### Decorator Pattern

```typescript
// Add capabilities to detectors
class CachedDetector implements IDetector {
  constructor(
    private detector: IDetector,
    private cache: Cache
  ) {}

  detect(context: AnalysisContext): Issue[] {
    const key = this.getCacheKey(context);
    const cached = this.cache.get(key);

    if (cached) return cached;

    const issues = this.detector.detect(context);
    this.cache.set(key, issues);
    return issues;
  }
}
```

### Behavioral Patterns

#### Strategy Pattern

```typescript
// Different formatting strategies
interface IFormatter {
  format(issues: Issue[]): string;
}

class JSONFormatter implements IFormatter {
  format(issues: Issue[]): string {
    return JSON.stringify(issues, null, 2);
  }
}

class SARIFFormatter implements IFormatter {
  format(issues: Issue[]): string {
    return this.toSARIF(issues);
  }
}

// Context uses strategy
class Reporter {
  constructor(private formatter: IFormatter) {}

  report(issues: Issue[]): void {
    const output = this.formatter.format(issues);
    console.log(output);
  }
}
```

#### Observer Pattern

```typescript
// Progress reporting
interface IProgressObserver {
  onFileAnalyzed(file: string): void;
  onIssueFound(issue: Issue): void;
}

class AnalysisEngine {
  private observers: IProgressObserver[] = [];

  addObserver(observer: IProgressObserver): void {
    this.observers.push(observer);
  }

  private notifyFileAnalyzed(file: string): void {
    this.observers.forEach(o => o.onFileAnalyzed(file));
  }
}
```

#### Visitor Pattern

```typescript
// AST traversal
interface Visitor {
  visitFunctionDefinition?(node: FunctionNode): void;
  visitContractDefinition?(node: ContractNode): void;
}

class SecurityVisitor implements Visitor {
  visitFunctionDefinition(node: FunctionNode): void {
    // Check function security
  }
}

function walk(ast: AST, visitor: Visitor): void {
  // Visit nodes and call appropriate methods
}
```

---

## Anti-Patterns to Avoid

### God Object

```typescript
// ❌ AVOID: God object that does everything
class ApplicationGod {
  parseFiles() {}
  analyzeCode() {}
  detectVulnerabilities() {}
  formatOutput() {}
  saveToDatabase() {}
  sendNotifications() {}
}

// DO: Separate concerns
class Parser {}
class Analyzer {}
class Detector {}
class Formatter {}
class Repository {}
class Notifier {}
```

### Spaghetti Code

```typescript
// ❌ AVOID: Tangled dependencies
function process(data: any): any {
  const x = transform(data);
  save(x);
  const y = load();
  update(y);
  const z = calculate(y);
  if (z > 10) {
    save(z);
    return load();
  }
  return z;
}

// DO: Clear flow
function process(data: Data): Result {
  const transformed = transform(data);
  const saved = save(transformed);
  return calculateResult(saved);
}
```

### Copy-Paste Programming

```typescript
// ❌ AVOID: Duplicated code
class Detector1 {
  detect(ast: AST): Issue[] {
    const functions = ast.findAll('FunctionDefinition');
    const issues = [];
    for (const func of functions) {
      // 50 lines of detection logic
    }
    return issues;
  }
}

class Detector2 {
  detect(ast: AST): Issue[] {
    const functions = ast.findAll('FunctionDefinition');
    const issues = [];
    for (const func of functions) {
      // Same 50 lines with slight variation
    }
    return issues;
  }
}

// DO: Extract common logic
abstract class FunctionDetector {
  detect(ast: AST): Issue[] {
    const functions = this.getFunctions(ast);
    return functions.flatMap(f => this.analyzeFunction(f));
  }

  protected abstract analyzeFunction(func: FunctionNode): Issue[];
}
```

### Premature Optimization

```typescript
// ❌ AVOID: Optimizing before profiling
class DetectorComplex {
  detect(ast: AST): Issue[] {
    // Complex caching, memoization, bit manipulation
    // without knowing if it's needed
  }
}

// DO: Simple first, optimize if needed
class DetectorSimple {
  detect(ast: AST): Issue[] {
    // Clear, simple logic
    // Profile and optimize hot paths if needed
  }
}
```

---

## Code Organization

### File Structure

```
lib/
├── core/                 # Core engine
│   ├── engine.ts
│   ├── analysis-context.ts
│   └── issue-manager.ts
├── parser/               # Parsing
│   ├── solidity-parser.ts
│   └── ast-walker.ts
├── rules/                # Rules
│   ├── lint/            # Lint rules
│   │   ├── naming/
│   │   ├── style/
│   │   └── best-practices/
│   └── security/        # Security detectors
│       ├── reentrancy/
│       └── access-control/
├── formatters/          # Output formatting
└── cli/                 # CLI interface
```

### Import Organization

```typescript
// Group and order imports
// 1. Node built-ins
import fs from 'fs';
import path from 'path';

// 2. External dependencies
import { parse } from '@solidity-parser/parser';
import { Command } from 'commander';

// 3. Internal - absolute imports
import { IParser } from '@/parser/types';
import { IDetector } from '@/rules/types';

// 4. Internal - relative imports
import { helper } from './utils';
import { Config } from './config';
```

---

## Performance Guidelines

### Do's

1. **Measure First**: Profile before optimizing
2. **Lazy Loading**: Load resources when needed
3. **Caching**: Cache expensive computations
4. **Parallel Processing**: Use worker threads for CPU-bound tasks
5. **Batch Operations**: Group similar operations

### Don'ts

1. **Premature Optimization**: Don't optimize without data
2. **Micro-Optimizations**: Don't sacrifice readability for minor gains
3. **Memory Leaks**: Be careful with event listeners and caches
4. **Blocking Operations**: Use async for I/O operations

---

## Security Practices

### Input Validation

```typescript
// Validate all inputs
function loadConfig(path: string): Config {
  // Sanitize path
  const safePath = path.replace(/\.\./g, '');

  // Validate file exists
  if (!fs.existsSync(safePath)) {
    throw new Error('Config file not found');
  }

  // Parse and validate against schema
  const config = JSON.parse(fs.readFileSync(safePath, 'utf-8'));
  return validateConfig(config);
}
```

### No Secret Exposure

```typescript
// ❌ Don't log sensitive data
logger.debug(`User credentials: ${JSON.stringify(credentials)}`);

// Log safely
logger.debug(`User ${credentials.username} authenticated`);
```

### Safe Dependencies

1. **Audit Regularly**: Run `npm audit`
2. **Pin Versions**: Use exact versions in package.json
3. **Review Changes**: Check diffs before updating
4. **Minimal Dependencies**: Only include what you need

---

## Conclusion

These design principles and practices ensure that Solin:

**Maintainable**: Easy to understand and modify
**Testable**: Easy to write unit and integration tests
**Extensible**: Easy to add new features
**Reliable**: Robust error handling and validation
**Performant**: Optimized where it matters

**Remember**: Follow these principles, but use judgment. Sometimes breaking a rule is the right choice, but it should be a conscious decision with good reason.
