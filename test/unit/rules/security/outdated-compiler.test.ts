/**
 * Outdated Compiler Security Rule Tests
 */

import { OutdatedCompilerRule } from '@/rules/security/outdated-compiler';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('OutdatedCompilerRule', () => {
  let rule: OutdatedCompilerRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new OutdatedCompilerRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/outdated-compiler');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('outdated versions', () => {
    test('should detect very old version 0.4.x', async () => {
      const source = `
        pragma solidity 0.4.26;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('outdated');
    });

    test('should detect old version 0.5.x', async () => {
      const source = `
        pragma solidity 0.5.17;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect old version 0.6.x', async () => {
      const source = `
        pragma solidity 0.6.12;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect old version 0.7.x', async () => {
      const source = `
        pragma solidity 0.7.6;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect old 0.8.x versions below 0.8.18', async () => {
      const source = `
        pragma solidity 0.8.10;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect caret with old version', async () => {
      const source = `
        pragma solidity ^0.7.0;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect range with old version', async () => {
      const source = `
        pragma solidity >=0.6.0 <0.8.0;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('acceptable versions', () => {
    test('should not report recent 0.8.x versions (>= 0.8.18)', async () => {
      const source = `
        pragma solidity 0.8.19;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report 0.8.20', async () => {
      const source = `
        pragma solidity 0.8.20;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report 0.8.23', async () => {
      const source = `
        pragma solidity 0.8.23;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report caret with recent version', async () => {
      const source = `
        pragma solidity ^0.8.19;
        contract Test {}
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report range with recent version', async () => {
      const source = `
        pragma solidity >=0.8.19 <0.9.0;
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
