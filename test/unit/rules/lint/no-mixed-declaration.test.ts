/**
 * No Mixed Declaration Rule Tests
 *
 * Testing disallowing mixing variable declarations and statements
 */

import { NoMixedDeclarationRule } from '@/rules/lint/no-mixed-declaration';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NoMixedDeclarationRule', () => {
  let rule: NoMixedDeclarationRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NoMixedDeclarationRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/no-mixed-declaration');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Valid cases - declarations grouped together', () => {
    test('should not report issue when all declarations are at the beginning', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test() public {
            uint256 a = 1;
            uint256 b = 2;
            uint256 c = 3;

            a = a + 1;
            b = b + 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for single declaration', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test() public {
            uint256 a = 1;
            a = a + 1;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for empty function', async () => {
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

  describe('Invalid cases - mixed declarations and statements', () => {
    test('should report issue when declaration follows statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test() public {
            uint256 a = 1;
            a = a + 1;
            uint256 b = 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('lint/no-mixed-declaration');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('declaration');
    });

    test('should report issue when multiple declarations are mixed', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test() public {
            uint256 a = 1;
            a = a + 1;
            uint256 b = 2;
            b = b + 1;
            uint256 c = 3;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    test('should report issue when declaration follows function call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function doSomething() internal {}

          function test() public {
            uint256 a = 1;
            doSomething();
            uint256 b = 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    test('should report issue when declaration follows if statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(bool condition) public {
            uint256 a = 1;
            if (condition) {
              a = 2;
            }
            uint256 b = 3;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge cases', () => {
    test('should handle nested blocks correctly', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(bool condition) public {
            uint256 a = 1;

            if (condition) {
              uint256 b = 2;
              b = b + 1;
            }

            a = a + 1;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Each block should be checked independently
      expect(issues).toHaveLength(0);
    });

    test('should handle for loops correctly', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test() public {
            uint256 a = 1;
            for (uint256 i = 0; i < 10; i++) {
              a = a + i;
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
  });
});
