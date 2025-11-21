/**
 * Unary Expression Security Rule Tests
 *
 * Testing detection of potentially dangerous unary expressions
 */

import { UnaryExpressionRule } from '@/rules/security/unary-expression';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UnaryExpressionRule', () => {
  let rule: UnaryExpressionRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UnaryExpressionRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unary-expression');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous unary operations', () => {
    test('should detect delete on dynamic array', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256[] public data;

          function clear() public {
            delete data;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/delete|unary/i);
    });

    test('should detect complex unary operations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          mapping(address => uint256) public balances;

          function clearBalance(address user) public {
            delete balances[user];
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('safe operations', () => {
    test('should not report simple arithmetic unary', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function negate(int256 x) public pure returns (int256) {
            return -x;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report logical not', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(bool flag) public pure returns (bool) {
            return !flag;
          }
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
