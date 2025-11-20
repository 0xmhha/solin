/**
 * Pragma Version Security Rule Tests
 *
 * Testing validation of pragma version specifications
 */

import { PragmaVersion } from '@/rules/security/pragma-version';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('PragmaVersion', () => {
  let rule: PragmaVersion;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new PragmaVersion();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/pragma-version');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect missing pragma', async () => {
      const code = `
        contract Test {
          function test() public {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toContain('pragma');
    });

    test('should not flag contracts with pragma', async () => {
      const code = `
        pragma solidity ^0.8.0;

        contract Test {
          function test() public {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });
  });
});
