/**
 * Write After Write Security Rule Tests
 */

import { WriteAfterWriteRule } from '@/rules/security/write-after-write';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('WriteAfterWriteRule', () => {
  let rule: WriteAfterWriteRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new WriteAfterWriteRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/write-after-write');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect redundant writes', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          uint public value;

          function update() public {
            value = 10;
            value = 20;
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
    test('should not report single write', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          uint public value;

          function update() public {
            value = 10;
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
