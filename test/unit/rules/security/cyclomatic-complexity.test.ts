/**
 * Cyclomatic Complexity Security Rule Tests
 *
 * Testing detection of functions with high cyclomatic complexity
 */

import { CyclomaticComplexityRule } from '@/rules/security/cyclomatic-complexity';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('CyclomaticComplexityRule', () => {
  let rule: CyclomaticComplexityRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new CyclomaticComplexityRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/cyclomatic-complexity');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('high complexity functions', () => {
    test('should detect function with many if statements', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function complex(uint256 x) public pure returns (uint256) {
            if (x == 1) return 1;
            if (x == 2) return 2;
            if (x == 3) return 3;
            if (x == 4) return 4;
            if (x == 5) return 5;
            if (x == 6) return 6;
            if (x == 7) return 7;
            if (x == 8) return 8;
            if (x == 9) return 9;
            if (x == 10) return 10;
            if (x == 11) return 11;
            if (x == 12) return 12;
            return 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/complexity|complex/i);
    });

    test('should detect function with many loops and conditions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function process(uint256[] memory data) public pure returns (uint256) {
            uint256 result = 0;
            for (uint256 i = 0; i < data.length; i++) {
              if (data[i] > 10 && data[i] < 100) {
                result += data[i];
              } else if (data[i] > 5 || data[i] == 0) {
                result += data[i] * 2;
              } else {
                result += data[i] * 3;
              }

              if (result > 100) {
                while (result > 100 && result < 200) {
                  result -= 10;
                }
              }

              if (result < 50) {
                do {
                  result += 5;
                } while (result < 50 || result > 1000);
              }

              if (data[i] == 42) {
                for (uint256 j = 0; j < 10; j++) {
                  if (j > 5) {
                    result++;
                  }
                }
              }
            }
            return result;
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

  describe('reasonable complexity', () => {
    test('should not report simple functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function simple(uint256 a, uint256 b) public pure returns (uint256) {
            return a + b;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report functions with few conditionals', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 x) public pure returns (bool) {
            if (x > 10) {
              return true;
            }
            return false;
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

  describe('edge cases', () => {
    test('should handle empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle empty function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function empty() public pure {
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
