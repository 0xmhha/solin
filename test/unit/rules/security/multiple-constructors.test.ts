/**
 * Multiple Constructors Security Rule Tests
 *
 * Testing detection of multiple constructor definitions
 */

import { MultipleConstructorsRule } from '@/rules/security/multiple-constructors';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MultipleConstructorsRule', () => {
  let rule: MultipleConstructorsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MultipleConstructorsRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/multiple-constructors');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('multiple constructor detection', () => {
    test('should detect multiple constructor functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value;

          constructor() {
            value = 1;
          }

          constructor(uint256 _value) {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/multiple|constructor/i);
    });
  });

  describe('valid constructor usage', () => {
    test('should not report single constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value;

          constructor(uint256 _value) {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report contract without constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 42;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });
});
