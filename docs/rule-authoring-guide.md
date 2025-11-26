# Rule Authoring Guide

This guide explains how to create custom rules for Solin to analyze specific patterns in Solidity code.

## Table of Contents

- [Overview](#overview)
- [Rule Structure](#rule-structure)
- [Creating a Rule](#creating-a-rule)
- [Testing Rules](#testing-rules)
- [Using RuleGenerator](#using-rulegenerator)
- [AST Node Types](#ast-node-types)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

Solin rules are classes that analyze Solidity AST (Abstract Syntax Tree) and report issues. Each rule:

- Extends `AbstractRule`
- Defines metadata (id, category, severity, description)
- Implements an `analyze` method
- Reports issues through the analysis context

## Rule Structure

### Basic Template

```typescript
import { AbstractRule } from '@/rules/abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/analysis-context';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

export class MyCustomRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'custom/my-rule',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'My Custom Rule',
      description: 'Detects a specific pattern',
      recommendation: 'How to fix the issue',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'FunctionDefinition') {
          this.checkFunction(node, context);
        }
        return undefined;
      },
    });
  }

  private checkFunction(node: ASTNode, context: AnalysisContext): void {
    // Your detection logic here

    if (/* issue detected */) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'Description of the issue',
        location: {
          start: {
            line: node.loc.start.line,
            column: node.loc.start.column,
          },
          end: {
            line: node.loc.end.line,
            column: node.loc.end.column,
          },
        },
      });
    }
  }
}
```

### Metadata Fields

| Field              | Type     | Required | Description                                                        |
| ------------------ | -------- | -------- | ------------------------------------------------------------------ |
| `id`               | string   | Yes      | Unique identifier (e.g., `security/reentrancy`)                    |
| `category`         | Category | Yes      | `SECURITY`, `LINT`, `GAS_OPTIMIZATION`, `BEST_PRACTICES`, `CUSTOM` |
| `severity`         | Severity | Yes      | `ERROR`, `WARNING`, `INFO`                                         |
| `title`            | string   | Yes      | Short descriptive title                                            |
| `description`      | string   | Yes      | Detailed description                                               |
| `recommendation`   | string   | Yes      | How to fix the issue                                               |
| `documentationUrl` | string   | No       | Link to documentation                                              |
| `fixable`          | boolean  | No       | Whether auto-fix is available                                      |

## Creating a Rule

### Step 1: Define the Pattern

First, identify what pattern you want to detect. For example, detecting functions without visibility modifiers.

### Step 2: Explore the AST

Use the AST to understand the node structure:

```typescript
// Parse a sample to see the AST structure
import { SolidityParser } from '@parser/solidity-parser';

const parser = new SolidityParser();
const result = await parser.parse(`
  contract Test {
    function foo() {
      // ...
    }
  }
`);

console.log(JSON.stringify(result.ast, null, 2));
```

### Step 3: Implement Detection Logic

```typescript
private checkFunction(node: any, context: AnalysisContext): void {
  // Check if visibility is missing
  if (!node.visibility || node.visibility === 'default') {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Function '${node.name}' has no visibility modifier`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
```

### Step 4: Add Auto-Fix (Optional)

```typescript
context.report({
  ruleId: this.metadata.id,
  severity: this.metadata.severity,
  category: this.metadata.category,
  message: 'Function has no visibility modifier',
  location: {
    /* ... */
  },
  fix: {
    description: 'Add public visibility',
    range: {
      start: { line: node.loc.start.line, column: insertPosition },
      end: { line: node.loc.start.line, column: insertPosition },
    },
    text: 'public ',
  },
});
```

## Testing Rules

### Using RuleTester

RuleTester provides an ESLint-like testing experience:

```typescript
import { RuleTester } from '@/rules/rule-tester';
import { MyCustomRule } from './my-custom-rule';

describe('MyCustomRule', () => {
  const tester = new RuleTester();

  test('should detect issues', async () => {
    const results = await tester.run(MyCustomRule, {
      // Code that should NOT trigger the rule
      valid: [
        {
          name: 'function with visibility',
          code: `
            pragma solidity ^0.8.0;
            contract Test {
              function foo() public {}
            }
          `,
        },
        // String shorthand
        'pragma solidity ^0.8.0; contract A { function bar() external {} }',
      ],

      // Code that SHOULD trigger the rule
      invalid: [
        {
          name: 'function without visibility',
          code: `
            pragma solidity ^0.8.0;
            contract Test {
              function foo() {}
            }
          `,
          errors: [
            {
              message: /no visibility modifier/,
              line: 4,
            },
          ],
        },
      ],
    });

    expect(tester.allPassed()).toBe(true);
  });
});
```

### Error Matchers

You can match errors by:

```typescript
errors: [
  // Exact message
  { message: 'Exact error message' },

  // Regex pattern
  { message: /partial match/ },

  // Line number
  { line: 5 },

  // Column number
  { column: 10 },

  // Rule ID
  { ruleId: 'custom/my-rule' },

  // Combine multiple
  { message: /visibility/, line: 4, ruleId: 'custom/my-rule' },
];
```

### Helper Methods

```typescript
const tester = new RuleTester();

await tester.run(MyRule, { valid: [...], invalid: [...] });

// Check if all tests passed
tester.allPassed(); // true/false

// Get failed tests
tester.getFailedTests(); // TestResult[]

// Get all results
tester.getResults(); // TestResult[]
```

## Using RuleGenerator

Generate rule boilerplate quickly:

```typescript
import { RuleGenerator, generateRule } from '@/rules/rule-generator';

// Using the class
const generator = new RuleGenerator();
const result = generator.generate({
  name: 'no-magic-addresses',
  title: 'No Magic Addresses',
  description: 'Disallow hardcoded addresses',
  category: Category.SECURITY,
  severity: Severity.WARNING,
  recommendation: 'Use constants or configuration for addresses',
  nodeTypes: ['Literal'],
});

console.log(result.ruleCode); // Rule implementation
console.log(result.testCode); // Test file
console.log(result.ruleFileName); // no-magic-addresses.ts
console.log(result.testFileName); // no-magic-addresses.test.ts

// Using the helper function
const quick = generateRule({
  name: 'my-rule',
  title: 'My Rule',
  description: 'Description',
  category: Category.LINT,
  severity: Severity.INFO,
  recommendation: 'Fix it',
});
```

### Generated Files

The generator creates:

1. **Rule file** (`lib/rules/{category}/my-rule.ts`):
   - Class extending AbstractRule
   - Metadata configuration
   - AST walking setup
   - Placeholder check method

2. **Test file** (`test/unit/rules/my-rule.test.ts`):
   - Jest test suite
   - Metadata tests
   - Valid/invalid test cases
   - Parser setup

## AST Node Types

Common node types to check:

| Node Type                  | Description                          |
| -------------------------- | ------------------------------------ |
| `SourceUnit`               | Root of the AST                      |
| `ContractDefinition`       | Contract/interface/library           |
| `FunctionDefinition`       | Function declaration                 |
| `ModifierDefinition`       | Modifier declaration                 |
| `VariableDeclaration`      | Variable declaration                 |
| `StateVariableDeclaration` | State variable                       |
| `EventDefinition`          | Event declaration                    |
| `FunctionCall`             | Function invocation                  |
| `MemberAccess`             | Property access (e.g., `msg.sender`) |
| `BinaryOperation`          | Binary operators (+, -, ==, etc.)    |
| `IfStatement`              | If/else statements                   |
| `ForStatement`             | For loops                            |
| `WhileStatement`           | While loops                          |
| `Return`                   | Return statements                    |
| `Block`                    | Code block { }                       |
| `Literal`                  | Literal values (numbers, strings)    |
| `Identifier`               | Variable/function names              |

### Accessing Node Properties

```typescript
// FunctionDefinition
node.name; // Function name
node.visibility; // public, private, internal, external
node.stateMutability; // pure, view, payable
node.parameters; // Function parameters
node.returnParameters; // Return values
node.body; // Function body (Block)
node.modifiers; // Applied modifiers

// ContractDefinition
node.name; // Contract name
node.kind; // contract, interface, library
node.baseContracts; // Inherited contracts
node.subNodes; // Contract members

// FunctionCall
node.expression; // Called function
node.arguments; // Call arguments

// BinaryOperation
node.operator; // +, -, *, /, ==, etc.
node.left; // Left operand
node.right; // Right operand
```

## Best Practices

### 1. Use Descriptive IDs

```typescript
// Good
id: 'security/reentrancy-guard';
id: 'lint/no-empty-blocks';
id: 'gas/cache-array-length';

// Bad
id: 'rule1';
id: 'myRule';
```

### 2. Provide Actionable Messages

```typescript
// Good
message: `Function '${name}' lacks reentrancy protection. ` + `Consider using a reentrancy guard.`;

// Bad
message: 'Bad pattern detected';
```

### 3. Include Location Information

Always provide accurate location for the issue:

```typescript
location: {
  start: {
    line: node.loc.start.line,
    column: node.loc.start.column,
  },
  end: {
    line: node.loc.end.line,
    column: node.loc.end.column,
  },
}
```

### 4. Handle Edge Cases

```typescript
private checkNode(node: any, context: AnalysisContext): void {
  // Check for missing location
  if (!node.loc) {
    return;
  }

  // Check for null/undefined values
  if (!node.name) {
    return;
  }

  // Your logic here
}
```

### 5. Write Comprehensive Tests

Test both positive and negative cases:

```typescript
valid: [
  // Normal cases
  'contract A { function foo() public {} }',
  // Edge cases
  'contract A { }', // Empty contract
  'library L { function foo() internal {} }', // Library
],
invalid: [
  // Main issue
  { code: '...', errors: [{ message: /expected/ }] },
  // Multiple issues
  { code: '...', errors: [{ line: 3 }, { line: 5 }] },
]
```

### 6. Consider Performance

```typescript
// Good: Check node type first
if (node.type === 'FunctionCall') {
  // Then do expensive checks
}

// Bad: Expensive checks on every node
this.expensiveCheck(node);
```

## Examples

### Example 1: No Console Log

Detect `console.log` calls:

```typescript
export class NoConsoleRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/no-console',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'No Console',
      description: 'Disallow console.log statements',
      recommendation: 'Remove console statements before deployment',
    });
  }

  analyze(context: AnalysisContext): void {
    const walker = new ASTWalker();

    walker.walk(context.ast, {
      enter: node => {
        if (
          node.type === 'FunctionCall' &&
          node.expression?.type === 'MemberAccess' &&
          node.expression.expression?.name === 'console'
        ) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `Unexpected console.${node.expression.memberName}`,
            location: {
              start: { line: node.loc.start.line, column: node.loc.start.column },
              end: { line: node.loc.end.line, column: node.loc.end.column },
            },
          });
        }
        return undefined;
      },
    });
  }
}
```

### Example 2: Require Reason String

Ensure `require` statements have reason strings:

```typescript
export class RequireReasonRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/require-reason',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Require Reason',
      description: 'Require statements should have reason strings',
      recommendation: 'Add a reason string to the require statement',
    });
  }

  analyze(context: AnalysisContext): void {
    const walker = new ASTWalker();

    walker.walk(context.ast, {
      enter: node => {
        if (
          node.type === 'FunctionCall' &&
          node.expression?.type === 'Identifier' &&
          node.expression.name === 'require' &&
          node.arguments?.length < 2
        ) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: 'require statement is missing a reason string',
            location: {
              start: { line: node.loc.start.line, column: node.loc.start.column },
              end: { line: node.loc.end.line, column: node.loc.end.column },
            },
          });
        }
        return undefined;
      },
    });
  }
}
```

### Example 3: Max Contract Size

Limit contract complexity:

```typescript
export class MaxContractSizeRule extends AbstractRule {
  private maxFunctions = 20;

  constructor() {
    super({
      id: 'lint/max-contract-size',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Max Contract Size',
      description: 'Contracts should not have too many functions',
      recommendation: 'Split the contract into smaller contracts',
    });
  }

  analyze(context: AnalysisContext): void {
    const walker = new ASTWalker();

    walker.walk(context.ast, {
      enter: node => {
        if (node.type === 'ContractDefinition') {
          const functions =
            node.subNodes?.filter((n: any) => n.type === 'FunctionDefinition') || [];

          if (functions.length > this.maxFunctions) {
            context.report({
              ruleId: this.metadata.id,
              severity: this.metadata.severity,
              category: this.metadata.category,
              message:
                `Contract '${node.name}' has ${functions.length} functions ` +
                `(max: ${this.maxFunctions})`,
              location: {
                start: { line: node.loc.start.line, column: node.loc.start.column },
                end: { line: node.loc.end.line, column: node.loc.end.column },
              },
            });
          }
        }
        return undefined;
      },
    });
  }
}
```

## Publishing Rules

### As a Plugin

Create a plugin to share your rules:

```typescript
// my-solin-plugin/index.ts
import type { SolinPlugin } from 'solin';
import { NoConsoleRule } from './rules/no-console';
import { RequireReasonRule } from './rules/require-reason';

const plugin: SolinPlugin = {
  meta: {
    name: 'my-solin-plugin',
    version: '1.0.0',
  },
  rules: {
    'no-console': NoConsoleRule,
    'require-reason': RequireReasonRule,
  },
};

export default plugin;
```

### Configuration

```json
{
  "plugins": ["my-solin-plugin"],
  "rules": {
    "my-solin-plugin/no-console": "error",
    "my-solin-plugin/require-reason": "warning"
  }
}
```

## Resources

- [AST Explorer](https://astexplorer.net/) - Visualize Solidity AST
- [Solidity Docs](https://docs.soliditylang.org/) - Language reference
- [Example Rules](../lib/rules/) - Built-in rule implementations
- [Plugin System](./plugins.md) - Creating Solin plugins

## Getting Help

- GitHub Issues: Report bugs or request features
- Discussions: Ask questions and share ideas
