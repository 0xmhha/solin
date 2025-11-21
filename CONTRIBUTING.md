# Contributing to Solin

Thank you for your interest in contributing to Solin! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/solin.git
   cd solin
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/my-feature
   ```

## Development Process

### Test-Driven Development (TDD)

We follow TDD practices. See [Development Guide](docs/development-guide.md) for detailed TDD workflow.

**Quick TDD Cycle**:

1. **RED**: Write a failing test
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Improve code while keeping tests green

### Example

```typescript
// 1. Write test first
test('should detect reentrancy', () => {
  const detector = new ReentrancyDetector();
  const issues = detector.detect(context);
  expect(issues).toHaveLength(1);
});

// 2. Implement minimal code
class ReentrancyDetector {
  detect(context: AnalysisContext): Issue[] {
    // Minimal implementation
  }
}

// 3. Refactor
// Improve code quality while keeping tests green
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Code coverage >= 80% (`npm run test:coverage`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation updated
- [ ] Commit messages follow conventions

### PR Title Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

Examples:
feat(security): add reentrancy detector
fix(parser): handle malformed input
docs(readme): update installation instructions
test(rules): add tests for naming convention
refactor(engine): simplify issue collection
```

### PR Description

Use this template:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing performed

## Checklist

- [ ] Tests pass
- [ ] Coverage >= 80%
- [ ] Documentation updated
- [ ] Follows coding standards
```

### Review Process

1. Automated checks run (CI)
2. Code review by maintainers
3. Address feedback
4. Approval and merge

## Coding Standards

### SOLID Principles

Follow SOLID principles. See [Design Principles](docs/design-principles.md) for details.

### Clean Code

- **Meaningful names**: Use descriptive names
- **Small functions**: 20-50 lines max
- **Single responsibility**: One function, one purpose
- **No duplication**: DRY principle

### TypeScript

```typescript
// ✅ GOOD
function analyzeContract(filePath: string): AnalysisResult {
  const source = readFile(filePath);
  const ast = parseSource(source);
  return detectIssues(ast);
}

// ❌ BAD
function doStuff(x: any): any {
  // ...
}
```

## Testing Requirements

### Coverage Thresholds

- Branches: 80%
- Functions: 90%
- Lines: 90%
- Statements: 90%

### Test Structure

Use AAA pattern:

```typescript
test('description', () => {
  // ARRANGE
  const detector = new Detector();
  const context = createContext(code);

  // ACT
  const issues = detector.detect(context);

  // ASSERT
  expect(issues).toHaveLength(1);
});
```

### Test Types

1. **Unit Tests**: Test individual components
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete workflows

## Documentation

### Code Documentation

Use JSDoc for public APIs:

````typescript
/**
 * Detects reentrancy vulnerabilities in Solidity contracts.
 *
 * @param context - Analysis context containing AST and source
 * @returns Array of detected issues
 *
 * @example
 * ```typescript
 * const detector = new ReentrancyDetector();
 * const issues = detector.detect(context);
 * ```
 */
export class ReentrancyDetector {
  detect(context: AnalysisContext): Issue[] {
    // Implementation
  }
}
````

### README Updates

Update README.md if adding:

- New features
- New CLI options
- Breaking changes

### Documentation Files

Update relevant docs in `docs/`:

- `features.md`: New features
- `todolist.md`: Mark completed tasks
- `architecture.md`: Architectural changes

## Questions?

- Check [Documentation](docs/)
- Open a [Discussion](https://github.com/yourusername/solin/discussions)
- Join our Discord (link in README)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
