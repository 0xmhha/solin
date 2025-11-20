/**
 * Statement Indent Rule Tests
 *
 * Testing statement-level indentation enforcement
 */

import { StatementIndentRule } from '@/rules/lint/statement-indent';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('StatementIndentRule', () => {
  let rule: StatementIndentRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new StatementIndentRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/statement-indent');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Statement indentation', () => {
    test('should not report issue for properly indented statements', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function test() public {
                uint256 x = 1;
                uint256 y = 2;
                return x + y;
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for inconsistent statement indentation', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function test() public {
                uint256 x = 1;
             uint256 y = 2;
                return x + y;
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes('indent'))).toBe(true);
    });

    test('should handle nested blocks correctly', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function test() public {
                if (true) {
                    uint256 x = 1;
                    if (x > 0) {
                        x = 2;
                    }
                }
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when statement has wrong indentation level', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function test() public {
                uint256 x = 1;
                    uint256 y = 2;
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle empty functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function test() public {
            }
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
