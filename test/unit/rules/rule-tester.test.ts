/**
 * Rule Tester Tests
 */

import { RuleTester, createRuleTester } from '@/rules/rule-tester';
import { AbstractRule } from '@/rules/abstract-rule';
import type { AnalysisContext } from '@core/analysis-context';
import { Severity, Category } from '@core/types';

// Test rule that reports on FunctionDefinition
class TestFunctionRule extends AbstractRule {
  constructor() {
    super({
      id: 'test/function-rule',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Test Function Rule',
      description: 'Test rule for RuleTester',
      recommendation: 'Test recommendation',
    });
  }

  analyze(context: AnalysisContext): void {
    const source = context.sourceCode;
    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Report if line contains "badFunction"
      if (line.includes('badFunction')) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: 'Found badFunction',
          location: {
            start: { line: i + 1, column: 0 },
            end: { line: i + 1, column: line.length },
          },
        });
      }
    }
  }
}

describe('RuleTester', () => {
  let tester: RuleTester;

  beforeEach(() => {
    tester = new RuleTester();
  });

  describe('Valid test cases', () => {
    test('should pass when no issues reported', async () => {
      const results = await tester.run(TestFunctionRule, {
        valid: [
          {
            name: 'good function',
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function goodFunction() public {}
              }
            `,
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(true);
    });

    test('should accept string as valid test case', async () => {
      const results = await tester.run(TestFunctionRule, {
        valid: [
          `
            pragma solidity ^0.8.0;
            contract Test {
              function goodFunction() public {}
            }
          `,
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(true);
    });

    test('should fail when issues reported for valid case', async () => {
      const results = await tester.run(TestFunctionRule, {
        valid: [
          {
            name: 'should not have badFunction',
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function badFunction() public {}
              }
            `,
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.error).toContain('Expected no errors');
    });
  });

  describe('Invalid test cases', () => {
    test('should pass when expected issues reported', async () => {
      const results = await tester.run(TestFunctionRule, {
        invalid: [
          {
            name: 'has badFunction',
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function badFunction() public {}
              }
            `,
            errors: [{ message: 'Found badFunction' }],
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(true);
    });

    test('should fail when no issues reported for invalid case', async () => {
      const results = await tester.run(TestFunctionRule, {
        invalid: [
          {
            name: 'should report error',
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function goodFunction() public {}
              }
            `,
            errors: [{ message: 'Expected error' }],
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.error).toContain('Expected 1 error(s) but got none');
    });

    test('should fail when message does not match', async () => {
      const results = await tester.run(TestFunctionRule, {
        invalid: [
          {
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function badFunction() public {}
              }
            `,
            errors: [{ message: 'Wrong message' }],
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.error).toContain('Expected message');
    });

    test('should support regex message matching', async () => {
      const results = await tester.run(TestFunctionRule, {
        invalid: [
          {
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function badFunction() public {}
              }
            `,
            errors: [{ message: /Found.*Function/ }],
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(true);
    });

    test('should verify line number', async () => {
      const results = await tester.run(TestFunctionRule, {
        invalid: [
          {
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function badFunction() public {}
              }
            `,
            errors: [{ message: 'Found badFunction', line: 4 }],
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(true);
    });

    test('should fail when line number does not match', async () => {
      const results = await tester.run(TestFunctionRule, {
        invalid: [
          {
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function badFunction() public {}
              }
            `,
            errors: [{ line: 999 }],
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.error).toContain('Expected line');
    });

    test('should verify rule ID', async () => {
      const results = await tester.run(TestFunctionRule, {
        invalid: [
          {
            code: `
              pragma solidity ^0.8.0;
              contract Test {
                function badFunction() public {}
              }
            `,
            errors: [{ ruleId: 'test/function-rule' }],
          },
        ],
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(true);
    });
  });

  describe('Multiple test cases', () => {
    test('should run multiple valid and invalid cases', async () => {
      const results = await tester.run(TestFunctionRule, {
        valid: [
          'pragma solidity ^0.8.0; contract A { function good() public {} }',
          'pragma solidity ^0.8.0; contract B { function nice() public {} }',
        ],
        invalid: [
          {
            code: 'pragma solidity ^0.8.0; contract C { function badFunction() public {} }',
            errors: [{ message: 'Found badFunction' }],
          },
        ],
      });

      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.passed)).toHaveLength(3);
    });
  });

  describe('Helper methods', () => {
    test('should return all results with getResults()', async () => {
      await tester.run(TestFunctionRule, {
        valid: ['pragma solidity ^0.8.0; contract A {}'],
      });

      const results = tester.getResults();
      expect(results).toHaveLength(1);
    });

    test('should check if all tests passed with allPassed()', async () => {
      await tester.run(TestFunctionRule, {
        valid: ['pragma solidity ^0.8.0; contract A {}'],
      });

      expect(tester.allPassed()).toBe(true);
    });

    test('should return failed tests with getFailedTests()', async () => {
      await tester.run(TestFunctionRule, {
        valid: [
          'pragma solidity ^0.8.0; contract A {}',
          'pragma solidity ^0.8.0; contract B { function badFunction() public {} }',
        ],
      });

      const failed = tester.getFailedTests();
      expect(failed).toHaveLength(1);
    });
  });

  describe('createRuleTester helper', () => {
    test('should create a rule tester', () => {
      const tester = createRuleTester();
      expect(tester).toBeInstanceOf(RuleTester);
    });

    test('should accept configuration', () => {
      const tester = createRuleTester({
        config: {
          basePath: '/custom',
          rules: {},
        },
      });
      expect(tester).toBeInstanceOf(RuleTester);
    });
  });
});
