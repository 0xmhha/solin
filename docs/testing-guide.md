# Testing Guide for Custom Rules

This guide explains how to test custom rules in Solin using the built-in testing utilities.

## Table of Contents

- [Overview](#overview)
- [RuleTester](#ruletester)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

Solin provides a `RuleTester` utility that makes it easy to test custom rules. The RuleTester:
- Automatically parses Solidity code
- Runs your rule against the AST
- Validates the reported issues
- Supports comprehensive assertion patterns

## RuleTester

### Basic Usage

```typescript
import { RuleTester } from 'solin';
import { MyCustomRule } from './my-custom-rule';

describe('MyCustomRule', () => {
  const tester = new RuleTester();

  test('should detect invalid pattern', async () => {
    const code = `
      pragma solidity ^0.8.0;
      contract Test {
        // Your test code here
      }
    `;

    const issues = await tester.run(MyCustomRule, code);
    expect(issues).toHaveLength(1);
  });
});
```

### API Reference

#### `new RuleTester(options?)`

Creates a new RuleTester instance.

**Options:**
```typescript
interface RuleTesterOptions {
  config?: Partial<ResolvedConfig>;  // Custom configuration
}
```

#### `run(RuleClass, code): Promise<Issue[]>`

Runs a rule against the provided Solidity code and returns detected issues.

**Parameters:**
- `RuleClass`: The rule class to test (must extend AbstractRule)
- `code`: Solidity source code string

**Returns:** Promise<Issue[]> - Array of detected issues

**Example:**
```typescript
const issues = await tester.run(MyRule, 'contract Test {}');
```

## Writing Tests

### Test Structure

Follow the AAA (Arrange-Act-Assert) pattern:

```typescript
describe('MyRule', () => {
  const tester = new RuleTester();

  describe('Valid code', () => {
    test('should not report issues for valid code', async () => {
      // ARRANGE
      const code = `
        pragma solidity ^0.8.0;
        contract ValidExample {
          uint256 public value;
        }
      `;

      // ACT
      const issues = await tester.run(MyRule, code);

      // ASSERT
      expect(issues).toHaveLength(0);
    });
  });

  describe('Invalid code', () => {
    test('should report issues for invalid code', async () => {
      // ARRANGE
      const code = `
        pragma solidity ^0.8.0;
        contract InvalidExample {
          uint256 value; // Missing visibility
        }
      `;

      // ACT
      const issues = await tester.run(MyRule, code);

      // ASSERT
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe(Severity.WARNING);
      expect(issues[0].message).toContain('visibility');
    });
  });
});
```

### Assertion Patterns

#### Basic Assertions

```typescript
// Check issue count
expect(issues).toHaveLength(2);

// Check no issues
expect(issues).toHaveLength(0);

// Check at least one issue
expect(issues.length).toBeGreaterThan(0);
```

#### Issue Properties

```typescript
const issue = issues[0];

// Severity
expect(issue.severity).toBe(Severity.ERROR);
expect(issue.severity).toBe(Severity.WARNING);
expect(issue.severity).toBe(Severity.INFO);

// Rule ID
expect(issue.ruleId).toBe('custom/my-rule');

// Message
expect(issue.message).toContain('expected text');
expect(issue.message).toBe('exact message');
expect(issue.message).toMatch(/regex pattern/);

// Category
expect(issue.category).toBe(Category.LINT);
expect(issue.category).toBe(Category.SECURITY);
expect(issue.category).toBe(Category.CUSTOM);

// Location
expect(issue.location.start.line).toBe(5);
expect(issue.location.start.column).toBe(10);
expect(issue.location.end.line).toBe(5);
expect(issue.location.end.column).toBe(20);
```

#### Multiple Issues

```typescript
// Verify all issues
expect(issues).toHaveLength(3);
expect(issues[0].message).toContain('first issue');
expect(issues[1].message).toContain('second issue');
expect(issues[2].message).toContain('third issue');

// Filter by severity
const errors = issues.filter(i => i.severity === Severity.ERROR);
expect(errors).toHaveLength(1);

const warnings = issues.filter(i => i.severity === Severity.WARNING);
expect(warnings).toHaveLength(2);
```

## Best Practices

### 1. Test Both Valid and Invalid Code

Always test that your rule:
- Does NOT report issues for valid code
- DOES report issues for invalid code

```typescript
describe('MyRule', () => {
  describe('Valid code', () => {
    test('should allow proper usage', async () => {
      const issues = await tester.run(MyRule, validCode);
      expect(issues).toHaveLength(0);
    });
  });

  describe('Invalid code', () => {
    test('should detect improper usage', async () => {
      const issues = await tester.run(MyRule, invalidCode);
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
```

### 2. Test Edge Cases

Consider edge cases like:
- Empty contracts
- Multiple violations in one file
- Nested structures
- Edge of valid/invalid boundary

```typescript
describe('Edge cases', () => {
  test('should handle empty contracts', async () => {
    const code = 'contract Empty {}';
    const issues = await tester.run(MyRule, code);
    expect(issues).toHaveLength(0);
  });

  test('should handle multiple violations', async () => {
    const code = `
      contract Test {
        uint a; // violation 1
        uint b; // violation 2
      }
    `;
    const issues = await tester.run(MyRule, code);
    expect(issues).toHaveLength(2);
  });
});
```

### 3. Use Descriptive Test Names

```typescript
// Good
test('should report error when function lacks visibility modifier', async () => {
  // ...
});

// Bad
test('test1', async () => {
  // ...
});
```

### 4. Group Related Tests

```typescript
describe('VisibilityRule', () => {
  describe('Functions', () => {
    test('should require visibility for public functions', async () => {});
    test('should allow explicit visibility', async () => {});
  });

  describe('State variables', () => {
    test('should require visibility for state variables', async () => {});
  });

  describe('Constructors', () => {
    test('should not require visibility for constructors', async () => {});
  });
});
```

### 5. Test Message Quality

Ensure your error messages are helpful:

```typescript
test('should provide helpful error message', async () => {
  const issues = await tester.run(MyRule, invalidCode);

  expect(issues[0].message).toContain('visibility modifier');
  expect(issues[0].message).not.toBe('error'); // Too generic
  expect(issues[0].metadata?.suggestion).toBeDefined();
});
```

## Examples

### Example 1: Simple Lint Rule

```typescript
import { RuleTester } from 'solin';
import { NoEmptyBlocksRule } from './no-empty-blocks';
import { Severity } from 'solin';

describe('NoEmptyBlocksRule', () => {
  const tester = new RuleTester();

  test('should report empty function bodies', async () => {
    const code = `
      pragma solidity ^0.8.0;
      contract Test {
        function empty() public {}
      }
    `;

    const issues = await tester.run(NoEmptyBlocksRule, code);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe(Severity.WARNING);
    expect(issues[0].message).toContain('empty');
  });

  test('should allow non-empty functions', async () => {
    const code = `
      pragma solidity ^0.8.0;
      contract Test {
        function notEmpty() public {
          uint x = 1;
        }
      }
    `;

    const issues = await tester.run(NoEmptyBlocksRule, code);
    expect(issues).toHaveLength(0);
  });
});
```

### Example 2: Security Detector

```typescript
import { RuleTester } from 'solin';
import { ReentrancyRule } from './reentrancy';
import { Severity } from 'solin';

describe('ReentrancyRule', () => {
  const tester = new RuleTester();

  test('should detect reentrancy vulnerability', async () => {
    const code = `
      pragma solidity ^0.8.0;
      contract Vulnerable {
        mapping(address => uint) balances;

        function withdraw() public {
          uint amount = balances[msg.sender];
          (bool success,) = msg.sender.call{value: amount}("");
          require(success);
          balances[msg.sender] = 0; // State change after external call
        }
      }
    `;

    const issues = await tester.run(ReentrancyRule, code);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe(Severity.ERROR);
    expect(issues[0].message).toContain('reentrancy');
  });

  test('should allow checks-effects-interactions pattern', async () => {
    const code = `
      pragma solidity ^0.8.0;
      contract Safe {
        mapping(address => uint) balances;

        function withdraw() public {
          uint amount = balances[msg.sender];
          balances[msg.sender] = 0; // State change before external call
          (bool success,) = msg.sender.call{value: amount}("");
          require(success);
        }
      }
    `;

    const issues = await tester.run(ReentrancyRule, code);
    expect(issues).toHaveLength(0);
  });
});
```

### Example 3: Complex AST Traversal

```typescript
import { RuleTester } from 'solin';
import { ComplexRule } from './complex-rule';

describe('ComplexRule', () => {
  const tester = new RuleTester();

  test('should detect nested pattern', async () => {
    const code = `
      pragma solidity ^0.8.0;
      contract Test {
        function complex() public {
          if (true) {
            while (true) {
              for (uint i = 0; i < 10; i++) {
                // Deep nesting
              }
            }
          }
        }
      }
    `;

    const issues = await tester.run(ComplexRule, code);
    expect(issues.length).toBeGreaterThan(0);
  });
});
```

## Integration with Jest

Solin uses Jest for testing. You can leverage all Jest features:

### Setup/Teardown

```typescript
describe('MyRule', () => {
  let tester: RuleTester;

  beforeEach(() => {
    tester = new RuleTester();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  test('test case', async () => {
    // Use tester
  });
});
```

### Test Filtering

```bash
# Run specific test file
npm test -- my-rule.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should detect"

# Run in watch mode
npm run test:watch
```

### Coverage

```bash
# Run with coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Troubleshooting

### Common Issues

#### Parse Errors

If your test code has syntax errors:

```typescript
test('should handle parse errors', async () => {
  const invalidSyntax = 'contract {'; // Invalid Solidity

  // RuleTester will parse the code
  // Parse errors are handled gracefully
  const issues = await tester.run(MyRule, invalidSyntax);
  // May return empty array if parsing fails
});
```

#### Async Issues

Always use `async/await`:

```typescript
// Good
test('should work', async () => {
  const issues = await tester.run(MyRule, code);
  expect(issues).toHaveLength(1);
});

// Bad - will fail
test('should work', () => {
  const issues = tester.run(MyRule, code); // Missing await
  expect(issues).toHaveLength(1); // issues is a Promise!
});
```

#### Configuration Issues

If you need custom configuration:

```typescript
const tester = new RuleTester({
  config: {
    basePath: __dirname,
    rules: {
      'custom/my-rule': 'error',
    },
  },
});
```

## Additional Resources

- [Rule Development Guide](./development-guide.md)
- [Architecture Documentation](./architecture.md)
- [Example Rules](../lib/rules/)
- [Example Tests](../test/unit/rules/)

---

For more information, see the main [README](../README.md) or visit the [GitHub repository](https://github.com/0xmhha/solin).
