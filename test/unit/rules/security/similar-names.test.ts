/**
 * Similar Names Security Rule Tests
 *
 * Testing detection of similar variable/function names
 */

import { SimilarNames } from '@/rules/security/similar-names';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('SimilarNames', () => {
  let rule: SimilarNames;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new SimilarNames();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/similar-names');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect single-character difference names', async () => {
      const code = `
        contract Test {
          uint256 public balanceA;
          uint256 public balanceB;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Should detect names that differ by only one character
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect very similar function names', async () => {
      const code = `
        contract Test {
          function getValue() public {}
          function getvalue() public {}
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toContain('similar');
    });

    test('should not flag distinct names', async () => {
      const code = `
        contract Test {
          uint256 public balance;
          uint256 public total;

          function getBalance() public {}
          function getTotal() public {}
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
