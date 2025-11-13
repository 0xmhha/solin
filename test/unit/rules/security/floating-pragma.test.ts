/**
 * Floating Pragma Security Rule Tests
 */

import { FloatingPragmaRule } from '@/rules/security/floating-pragma';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('FloatingPragmaRule', () => {
  let rule: FloatingPragmaRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new FloatingPragmaRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/floating-pragma');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect caret (^) floating pragma', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test() public {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('Floating');
      expect(issues[0]?.message).toContain('^');
    });

    test('should detect greater than (>) floating pragma', async () => {
      const source = `
        pragma solidity >0.7.0;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect greater than or equal (>=) floating pragma', async () => {
      const source = `
        pragma solidity >=0.8.0;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect less than (<) floating pragma', async () => {
      const source = `
        pragma solidity <0.9.0;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect less than or equal (<=) floating pragma', async () => {
      const source = `
        pragma solidity <=0.8.20;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect range floating pragma', async () => {
      const source = `
        pragma solidity >=0.7.0 <0.9.0;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect complex range with caret', async () => {
      const source = `
        pragma solidity ^0.8.0 <0.9.0;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('safe patterns', () => {
    test('should not report fixed version pragma', async () => {
      const source = `
        pragma solidity 0.8.19;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report fixed version with three parts', async () => {
      const source = `
        pragma solidity 0.8.20;
        contract Test {
          function test() public {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report exact version with equal sign', async () => {
      const source = `
        pragma solidity =0.8.0;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report non-solidity pragma', async () => {
      const source = `
        pragma solidity 0.8.19;
        pragma abicoder v2;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should handle contract without pragma gracefully', async () => {
      const source = `
        contract Test {
          function test() public {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
