/**
 * Divide Before Multiply Security Rule Tests
 */

import { DivideBeforeMultiplyRule } from '@/rules/security/divide-before-multiply';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('DivideBeforeMultiplyRule', () => {
  let rule: DivideBeforeMultiplyRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new DivideBeforeMultiplyRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/divide-before-multiply');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect a / b * c pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function calc(uint a, uint b, uint c) public pure returns (uint) {
            return a / b * c;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect complex division then multiplication', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function calculate(uint256 amount, uint256 rate) public pure returns (uint256) {
            return amount / 100 * rate;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });
  });

  describe('safe patterns', () => {
    test('should not report a * c / b pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function calc(uint a, uint b, uint c) public pure returns (uint) {
            return a * c / b;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report single division', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function calc(uint a, uint b) public pure returns (uint) {
            return a / b;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
