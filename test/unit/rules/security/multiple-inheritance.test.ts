/**
 * Multiple Inheritance Security Rule Tests
 *
 * Testing detection of multiple inheritance
 */

import { MultipleInheritance } from '@/rules/security/multiple-inheritance';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MultipleInheritance', () => {
  let rule: MultipleInheritance;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MultipleInheritance();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/multiple-inheritance');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect multiple inheritance', async () => {
      const code = `
        contract A {}
        contract B {}
        contract C is A, B {}
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toContain('inheritance');
    });

    test('should not flag single inheritance', async () => {
      const code = `
        contract A {}
        contract B is A {}
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag contract without inheritance', async () => {
      const code = `
        contract A {
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
