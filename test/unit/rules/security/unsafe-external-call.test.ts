/**
 * Unsafe External Call Security Rule Tests
 */

import { UnsafeExternalCallRule } from '@/rules/security/unsafe-external-call';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UnsafeExternalCallRule', () => {
  let rule: UnsafeExternalCallRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UnsafeExternalCallRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unsafe-external-call');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect call to user-controlled address', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function execute(address target, bytes memory data) public {
            target.call(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect delegatecall to user-controlled address', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function execute(address target) public {
            target.delegatecall("");
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
    test('should not report calls to hardcoded addresses', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          address constant TRUSTED = address(0x123);

          function execute() public {
            TRUSTED.call("");
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
