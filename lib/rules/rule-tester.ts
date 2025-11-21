/**
 * Rule Tester
 *
 * A testing utility for Solin rules, similar to ESLint's RuleTester.
 * Makes it easy to write tests for custom rules.
 */

import { SolidityParser } from '@parser/solidity-parser';
import { AnalysisContext } from '@core/analysis-context';
import type { IRule, Issue } from '@core/types';
import type { ResolvedConfig } from '@config/types';

/**
 * Test case for valid code (should not report issues)
 */
export interface ValidTestCase {
  /**
   * Test name/description
   */
  name?: string;

  /**
   * Solidity source code
   */
  code: string;

  /**
   * Rule options (if applicable)
   */
  options?: unknown;
}

/**
 * Test case for invalid code (should report issues)
 */
export interface InvalidTestCase {
  /**
   * Test name/description
   */
  name?: string;

  /**
   * Solidity source code
   */
  code: string;

  /**
   * Rule options (if applicable)
   */
  options?: unknown;

  /**
   * Expected errors
   */
  errors: ExpectedError[];
}

/**
 * Expected error in invalid test case
 */
export interface ExpectedError {
  /**
   * Expected error message (exact match or regex)
   */
  message?: string | RegExp;

  /**
   * Expected line number
   */
  line?: number;

  /**
   * Expected column number
   */
  column?: number;

  /**
   * Expected rule ID
   */
  ruleId?: string;
}

/**
 * Test result
 */
export interface TestResult {
  /**
   * Test passed
   */
  passed: boolean;

  /**
   * Test name
   */
  name: string;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Actual issues reported
   */
  issues?: Issue[];

  /**
   * Expected errors (for invalid tests)
   */
  expectedErrors?: ExpectedError[];
}

/**
 * Rule tester configuration
 */
export interface RuleTesterConfig {
  /**
   * Default parser options
   */
  parserOptions?: {
    tolerant?: boolean;
    sourceType?: string;
  };

  /**
   * Default config to use
   */
  config?: Partial<ResolvedConfig>;
}

/**
 * Rule Tester class
 *
 * Usage:
 * ```typescript
 * const tester = new RuleTester();
 *
 * tester.run(MyRule, {
 *   valid: [
 *     { code: 'valid code here' },
 *   ],
 *   invalid: [
 *     {
 *       code: 'invalid code here',
 *       errors: [{ message: 'Expected error message' }],
 *     },
 *   ],
 * });
 * ```
 */
export class RuleTester {
  private parser: SolidityParser;
  private config: RuleTesterConfig;
  private results: TestResult[] = [];

  constructor(config: RuleTesterConfig = {}) {
    this.parser = new SolidityParser();
    this.config = config;
  }

  /**
   * Run tests for a rule
   *
   * @param RuleClass - Rule class constructor
   * @param tests - Test cases
   */
  async run(
    RuleClass: new () => IRule,
    tests: {
      valid?: (ValidTestCase | string)[];
      invalid?: InvalidTestCase[];
    }
  ): Promise<TestResult[]> {
    this.results = [];

    // Run valid tests
    if (tests.valid) {
      for (let i = 0; i < tests.valid.length; i++) {
        const testCase = tests.valid[i];
        if (!testCase) continue;

        const normalizedTest = typeof testCase === 'string' ? { code: testCase } : testCase;

        const name = normalizedTest.name || `valid case ${i + 1}`;
        const result = await this.runValidTest(RuleClass, normalizedTest, name);
        this.results.push(result);
      }
    }

    // Run invalid tests
    if (tests.invalid) {
      for (let i = 0; i < tests.invalid.length; i++) {
        const testCase = tests.invalid[i];
        if (!testCase) continue;

        const name = testCase.name || `invalid case ${i + 1}`;
        const result = await this.runInvalidTest(RuleClass, testCase, name);
        this.results.push(result);
      }
    }

    return this.results;
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Check if all tests passed
   */
  allPassed(): boolean {
    return this.results.every(r => r.passed);
  }

  /**
   * Get failed tests
   */
  getFailedTests(): TestResult[] {
    return this.results.filter(r => !r.passed);
  }

  /**
   * Run a single valid test case
   */
  private async runValidTest(
    RuleClass: new () => IRule,
    testCase: ValidTestCase,
    name: string
  ): Promise<TestResult> {
    try {
      const issues = await this.analyzeCode(RuleClass, testCase.code, testCase.options);

      if (issues.length > 0) {
        return {
          passed: false,
          name,
          error: `Expected no errors but got ${issues.length}: ${issues.map(i => i.message).join(', ')}`,
          issues,
        };
      }

      return { passed: true, name };
    } catch (error) {
      return {
        passed: false,
        name,
        error: `Test threw an error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Run a single invalid test case
   */
  private async runInvalidTest(
    RuleClass: new () => IRule,
    testCase: InvalidTestCase,
    name: string
  ): Promise<TestResult> {
    try {
      const issues = await this.analyzeCode(RuleClass, testCase.code, testCase.options);

      if (issues.length === 0) {
        return {
          passed: false,
          name,
          error: `Expected ${testCase.errors.length} error(s) but got none`,
          issues,
          expectedErrors: testCase.errors,
        };
      }

      // Check each expected error
      const errors: string[] = [];

      for (let i = 0; i < testCase.errors.length; i++) {
        const expected = testCase.errors[i];
        if (!expected) continue;

        const actual = issues[i];

        if (!actual) {
          errors.push(`Expected error ${i + 1} but only got ${issues.length} error(s)`);
          continue;
        }

        // Check message
        if (expected.message) {
          if (expected.message instanceof RegExp) {
            if (!expected.message.test(actual.message)) {
              errors.push(
                `Error ${i + 1}: Message "${actual.message}" does not match pattern ${expected.message}`
              );
            }
          } else {
            if (actual.message !== expected.message) {
              errors.push(
                `Error ${i + 1}: Expected message "${expected.message}" but got "${actual.message}"`
              );
            }
          }
        }

        // Check line
        if (expected.line !== undefined && actual.location.start.line !== expected.line) {
          errors.push(
            `Error ${i + 1}: Expected line ${expected.line} but got ${actual.location.start.line}`
          );
        }

        // Check column
        if (expected.column !== undefined && actual.location.start.column !== expected.column) {
          errors.push(
            `Error ${i + 1}: Expected column ${expected.column} but got ${actual.location.start.column}`
          );
        }

        // Check rule ID
        if (expected.ruleId && actual.ruleId !== expected.ruleId) {
          errors.push(
            `Error ${i + 1}: Expected ruleId "${expected.ruleId}" but got "${actual.ruleId}"`
          );
        }
      }

      // Check for extra errors
      if (issues.length > testCase.errors.length) {
        errors.push(`Expected ${testCase.errors.length} error(s) but got ${issues.length}`);
      }

      if (errors.length > 0) {
        return {
          passed: false,
          name,
          error: errors.join('\n'),
          issues,
          expectedErrors: testCase.errors,
        };
      }

      return { passed: true, name, issues };
    } catch (error) {
      return {
        passed: false,
        name,
        error: `Test threw an error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Analyze code with a rule
   */
  private async analyzeCode(
    RuleClass: new () => IRule,
    code: string,
    _options?: unknown
  ): Promise<Issue[]> {
    // Parse code
    const parseResult = await this.parser.parse(code);

    if (parseResult.errors && parseResult.errors.length > 0) {
      throw new Error(`Failed to parse code: ${parseResult.errors[0]?.message || 'Unknown error'}`);
    }

    // Create context
    const config: ResolvedConfig = {
      basePath: '/test',
      rules: {},
      ...this.config.config,
    };

    const context = new AnalysisContext('test.sol', code, parseResult.ast, config);

    // Run rule
    const rule = new RuleClass();
    await rule.analyze(context);

    return context.getIssues();
  }
}

/**
 * Helper function to create a rule tester with common configuration
 */
export function createRuleTester(config?: RuleTesterConfig): RuleTester {
  return new RuleTester(config);
}
