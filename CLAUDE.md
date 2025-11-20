# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Solin is a comprehensive Solidity static analysis tool that combines linting and security detection. It's built with TypeScript, follows strict TDD practices, and emphasizes SOLID principles throughout its architecture.

**Key Technologies:**
- TypeScript (ES2022 target, strict mode)
- Jest for testing with ts-jest preset
- @solidity-parser/parser for AST parsing
- Node.js >= 18.0.0

## Development Commands

### Build & Development
```bash
# Build the project (TypeScript compilation + ESBuild bundling)
npm run build

# Watch mode for development
npm run dev

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Watch mode (for TDD workflow)
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="pattern"
```

**Coverage Requirements:**
- Branches: 80%
- Functions: 90%
- Lines: 90%
- Statements: 90%

### Code Quality
```bash
# Lint TypeScript files
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all files
npm run format

# Check formatting without changes
npm run format:check

# Type checking without emitting files
npm run typecheck
```

### Git Hooks
The project uses Husky for git hooks with lint-staged:
- Pre-commit: Runs ESLint, Prettier, and related tests on staged files
- Use `npm run prepare` to install hooks after cloning

## Architecture

### Directory Structure

```
lib/
├── core/          # Core engine and orchestration logic
├── parser/        # Solidity parsing (AST generation)
│   ├── solidity-parser.ts
│   └── types.ts
├── rules/         # Rule implementations
│   ├── lint/      # Linting rules (style, best practices)
│   └── security/  # Security vulnerability detectors
├── engine/        # Analysis engine
├── plugins/       # Plugin system for extensibility
├── formatters/    # Output formatters (JSON, SARIF, etc.)
├── config/        # Configuration loading and validation
│   └── presets/   # Preset configurations
├── utils/         # Shared utilities
└── cli/           # Command-line interface

test/
├── unit/          # Unit tests for individual components
├── integration/   # Integration tests for component interactions
├── e2e/           # End-to-end workflow tests
├── fixtures/      # Test data and sample Solidity files
├── helpers/       # Test utilities
└── setup.ts       # Jest setup configuration
```

### Import Path Aliases

The project uses TypeScript path aliases for clean imports:
- `@/*` → `lib/*`
- `@core/*` → `lib/core/*`
- `@parser/*` → `lib/parser/*`
- `@rules/*` → `lib/rules/*`
- `@config/*` → `lib/config/*`
- `@cli/*` → `lib/cli/*`

These aliases work in both source code and tests.

## Architecture Principles

### Layered Architecture
The system follows a strict layered approach:
1. **CLI Layer** - User interaction, argument parsing, configuration loading
2. **Orchestration Layer** - Engine, WorkerPool, CacheManager coordination
3. **Analysis Layer** - RuleRegistry, DetectorRegistry, AnalysisContext
4. **Rule Layer** - Individual lint rules and security detectors
5. **Foundation Layer** - Parser, AST utilities

### SOLID Principles Implementation

**Single Responsibility:**
- Each rule/detector focuses on ONE specific pattern
- Engine orchestrates but doesn't implement analysis logic
- Formatters only handle output formatting

**Open/Closed:**
- Rules are extensible via inheritance from AbstractRule
- Engine is closed for modification but extensible via plugins
- New formatters can be added without modifying core

**Liskov Substitution:**
- All detectors implement the same IDetector interface
- Any detector can replace another without breaking the engine

**Interface Segregation:**
- Small, focused interfaces (IDetector, IFixable, IConfigurable)
- Rules implement only what they need

**Dependency Inversion:**
- High-level modules depend on abstractions (interfaces)
- Parser, detectors, and formatters are injected as dependencies

## Test-Driven Development (TDD)

**Mandatory TDD Cycle:**
1. **RED** - Write a failing test first
2. **GREEN** - Write minimal code to pass the test
3. **REFACTOR** - Improve code while keeping tests green

### Test Structure (AAA Pattern)
```typescript
test('description', () => {
  // ARRANGE - Set up test data and dependencies
  const detector = new ReentrancyDetector();
  const context = createContext(sampleCode);

  // ACT - Execute the code under test
  const issues = detector.detect(context);

  // ASSERT - Verify expected outcomes
  expect(issues).toHaveLength(1);
  expect(issues[0].severity).toBe(Severity.HIGH);
});
```

### Test Organization
- Unit tests: Test individual classes/functions in isolation
- Integration tests: Test component interactions (e.g., Engine + Rules)
- E2E tests: Test complete workflows (CLI → Analysis → Output)
- Use fixtures in `test/fixtures/` for Solidity code samples
- Use helpers in `test/helpers/` for common test utilities

## Key Design Patterns

1. **Strategy Pattern** - Rule selection and execution
2. **Visitor Pattern** - AST traversal
3. **Factory Pattern** - Rule creation and registration
4. **Observer Pattern** - Progress reporting
5. **Plugin Pattern** - Extensibility system

## Performance Considerations

- **Parallel Processing**: Uses Worker Threads for multi-core analysis
- **Caching**: Two-level cache (memory + disk) for parsed files
- **Incremental Analysis**: Only re-analyze changed files
- **AST Reuse**: Memoized parsing with hash-based caching

## Configuration System

Configuration is loaded via cosmiconfig from:
- `.solinrc.json`
- `.solinrc.js`
- `solin` field in `package.json`

The config schema is validated using AJV.

## Rule Development

When adding new rules:
1. Write tests first in `test/unit/rules/`
2. Extend `AbstractRule` class
3. Implement the `detect(context: AnalysisContext): Issue[]` method
4. Place lint rules in `lib/rules/lint/`
5. Place security detectors in `lib/rules/security/`
6. Register the rule in the appropriate registry

### Rule Metadata Required
- `id`: Unique identifier (e.g., "security/reentrancy")
- `category`: LINT, SECURITY, or CUSTOM
- `severity`: HIGH, MEDIUM, LOW, INFO
- `metadata`: title, description, recommendation

## AST Parsing

The parser uses `@solidity-parser/parser` which generates an AST with:
- Location information (`loc`)
- Range information (`range`)
- Tolerance for malformed input (optional)

Parse options are configured in `lib/parser/solidity-parser.ts`.

## Common Development Workflows

### Adding a New Lint Rule
1. Create test file: `test/unit/rules/lint/my-rule.test.ts`
2. Write failing tests
3. Create rule: `lib/rules/lint/my-rule.ts` extending AbstractRule
4. Implement detection logic
5. Ensure tests pass and coverage meets thresholds
6. Register rule in rule registry

### Adding a Security Detector
Similar to lint rules but:
- Place in `lib/rules/security/`
- Typically higher severity
- May require control-flow or data-flow analysis
- Should minimize false positives

### Debugging Tests
```bash
# Run single test file in watch mode
npm test -- --watch path/to/test.test.ts

# Run with verbose output
npm test -- --verbose

# Run with node debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Important Notes

- **Strict TypeScript**: All strict mode flags are enabled
- **No `any` types**: Use proper typing or `unknown`
- **Coverage is enforced**: PRs must maintain coverage thresholds
- **Commit message format**: Follow Conventional Commits (feat:, fix:, docs:, test:, refactor:)
- **License considerations**: When adding security detectors, ensure they are original implementations, not direct ports from AGPL-licensed tools

## Documentation

Comprehensive documentation is in the `docs/` directory:
- `architecture.md` - Detailed system design
- `features.md` - Feature specifications
- `development-guide.md` - TDD/DDD practices
- `design-principles.md` - SOLID principles application
- `todolist.md` - Development roadmap and progress
