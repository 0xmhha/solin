/**
 * Compiler Version Rule Tests
 *
 * Testing Solidity compiler version constraint enforcement
 */

import { CompilerVersionRule } from '@/rules/lint/compiler-version';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('CompilerVersionRule', () => {
  let rule: CompilerVersionRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new CompilerVersionRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/compiler-version');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Compiler version validation', () => {
    test('should not report issue for valid caret pragma', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for valid range pragma', async () => {
      const source = `
        pragma solidity >=0.8.0 <0.9.0;

        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report warning for exact version (too restrictive)', async () => {
      const source = `
        pragma solidity 0.8.0;

        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('Exact compiler version');
    });

    test('should report warning for wildcard version', async () => {
      const source = `
        pragma solidity *;

        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should report warning for very old compiler versions', async () => {
      const source = `
        pragma solidity ^0.4.0;

        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('outdated');
    });

    test('should not report issue for 0.7.x versions', async () => {
      const source = `
        pragma solidity ^0.7.0;

        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // 0.7.x might be considered old but not too old
      expect(issues).toHaveLength(0);
    });

    test('should handle file without pragma', async () => {
      const source = `
        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('pragma');
    });

    test('should handle multiple pragma directives', async () => {
      const source = `
        pragma solidity ^0.8.0;
        pragma experimental ABIEncoderV2;

        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });
});
