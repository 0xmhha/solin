/**
 * Variable Mutation Security Rule Tests
 */

import { VariableMutationRule } from '@/rules/security/variable-mutation';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('VariableMutationRule', () => {
  let rule: VariableMutationRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new VariableMutationRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/variable-mutation');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect dangerous parameter mutation', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function process(uint amount) public {
            amount = amount * 2;
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

  describe('safe patterns', () => {
    test('should not report safe local variable usage', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function process(uint amount) public {
            uint doubled = amount * 2;
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
