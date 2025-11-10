/**
 * Abstract Rule Tests
 *
 * Testing the base rule class that all rules extend
 */

import { AbstractRule } from '@/rules/abstract-rule';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { IRule } from '@core/types';
import type { ResolvedConfig } from '@config/types';

/**
 * Concrete test rule for testing AbstractRule
 */
class TestRule extends AbstractRule {
  constructor() {
    super({
      id: 'test/sample-rule',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Sample Test Rule',
      description: 'A sample rule for testing',
      recommendation: 'Follow the recommendation',
    });
  }

  analyze(context: AnalysisContext): void {
    // Simple test implementation
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: 'Test issue found',
      location: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 10 },
      },
    });
  }
}

/**
 * Async test rule
 */
class AsyncTestRule extends AbstractRule {
  constructor() {
    super({
      id: 'test/async-rule',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Async Test Rule',
      description: 'An async rule for testing',
      recommendation: 'Follow async recommendation',
    });
  }

  async analyze(context: AnalysisContext): Promise<void> {
    await Promise.resolve();
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: 'Async test issue',
      location: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 10 },
      },
    });
  }
}

describe('AbstractRule', () => {
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('constructor', () => {
    test('should create rule with metadata', () => {
      const rule = new TestRule();

      expect(rule).toBeInstanceOf(AbstractRule);
      expect(rule.metadata).toBeDefined();
      expect(rule.metadata.id).toBe('test/sample-rule');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBe('Sample Test Rule');
      expect(rule.metadata.description).toBe('A sample rule for testing');
      expect(rule.metadata.recommendation).toBe('Follow the recommendation');
    });

    test('should implement IRule interface', () => {
      const rule: IRule = new TestRule();

      expect(rule.metadata).toBeDefined();
      expect(typeof rule.analyze).toBe('function');
    });
  });

  describe('analyze', () => {
    test('should execute synchronous analyze method', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      const rule = new TestRule();

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toBe('Test issue found');
    });

    test('should execute asynchronous analyze method', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      const rule = new AsyncTestRule();

      await rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toBe('Async test issue');
    });
  });

  describe('metadata', () => {
    test('should provide immutable metadata', () => {
      const rule = new TestRule();
      const metadata = rule.metadata;

      // Metadata object should be frozen
      expect(Object.isFrozen(metadata)).toBe(true);

      // Properties should be accessible
      expect(metadata.id).toBe('test/sample-rule');
      expect(metadata.category).toBe(Category.LINT);

      // Attempting to modify should throw in strict mode (Jest runs in strict mode)
      expect(() => {
        (metadata as any).id = 'changed';
      }).toThrow(TypeError);
    });

    test('should support optional metadata fields', () => {
      class RuleWithOptionals extends AbstractRule {
        constructor() {
          super({
            id: 'test/optionals',
            category: Category.SECURITY,
            severity: Severity.ERROR,
            title: 'Rule with optionals',
            description: 'Testing optional fields',
            recommendation: 'Do something',
            documentationUrl: 'https://example.com/docs',
            fixable: true,
          });
        }

        analyze(): void {
          // No-op
        }
      }

      const rule = new RuleWithOptionals();

      expect(rule.metadata.documentationUrl).toBe('https://example.com/docs');
      expect(rule.metadata.fixable).toBe(true);
    });
  });
});
