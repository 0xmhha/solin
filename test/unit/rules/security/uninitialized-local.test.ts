/**
 * Uninitialized Local Variable Security Rule Tests
 */

import { UninitializedLocalRule } from '@/rules/security/uninitialized-local';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UninitializedLocalRule', () => {
  let rule: UninitializedLocalRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UninitializedLocalRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/uninitialized-local');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect uninitialized struct', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          struct Data {
            uint value;
            address owner;
          }

          function test() public {
            Data memory data;
            data.value = 100;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect uninitialized storage pointer', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          struct Data {
            uint value;
          }

          Data[] public dataArray;

          function test() public {
            Data storage data;
            data.value = 100;
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
    test('should not report initialized variables', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          struct Data {
            uint value;
          }

          function test() public {
            Data memory data = Data(100);
            uint x = 10;
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
