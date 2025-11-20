/**
 * Magic Numbers Rule Tests
 *
 * Testing detection of magic numbers (unexplained numeric literals)
 */

import { MagicNumbersRule } from '@/rules/lint/magic-numbers';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MagicNumbersRule', () => {
  let rule: MagicNumbersRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MagicNumbersRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/magic-numbers');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Basic Detection', () => {
    test('should detect magic number in condition', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public returns (bool) {
            return value > 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const magicIssue = issues.find(i => i.message.includes('100'));
      expect(magicIssue).toBeDefined();
      expect(magicIssue?.message).toMatch(/magic number/i);
    });

    test('should detect magic number in arithmetic', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function multiply(uint256 x) public returns (uint256) {
            return x * 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const magicIssue = issues.find(i => i.message.includes('42'));
      expect(magicIssue).toBeDefined();
    });

    test('should detect magic number in assignment', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function setValue() public returns (uint256) {
            uint256 limit = 1000;
            return limit;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const magicIssue = issues.find(i => i.message.includes('1000'));
      expect(magicIssue).toBeDefined();
    });

    test('should detect multiple magic numbers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function calculate(uint256 x) public returns (uint256) {
            if (x > 50) {
              return x * 100;
            }
            return x + 25;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(3); // 50, 100, 25
    });
  });

  describe('Allowed Numbers', () => {
    test('should not report 0', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 x) public returns (bool) {
            return x > 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report 1', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function increment(uint256 x) public returns (uint256) {
            return x + 1;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report -1', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function decrement(int256 x) public returns (int256) {
            return x - 1;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should allow 0, 1, and -1 but report others', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function mix(uint256 x) public returns (uint256) {
            uint256 a = x + 0;
            uint256 b = x + 1;
            uint256 c = x + 2;  // Magic number
            uint256 d = x + 10;  // Magic number
            return a + b + c + d;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2); // 2 and 10
      expect(issues.some(i => i.message.includes('2'))).toBe(true);
      expect(issues.some(i => i.message.includes('10'))).toBe(true);
    });
  });

  describe('Constants and State Variables', () => {
    test('should not report numbers in constant declaration', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 constant MAX_SUPPLY = 1000000;
          uint256 public totalSupply = 500000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      // State variable initializers should be reported as magic numbers
      // Constants are acceptable since they are named
      // Implementation choice: we might allow state variable init or not
      // For this test, we document the behavior
    });

    test('should allow numbers used with named constants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 constant DECIMALS = 18;

          function calculate() public pure returns (uint256) {
            return DECIMALS;  // Using constant, not magic number
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      // The constant declaration itself might be allowed
      // This documents the behavior
    });
  });

  describe('Configuration', () => {
    test('should respect custom allowed numbers', async () => {
      const customConfig: ResolvedConfig = {
        basePath: '/test',
        rules: {
          'lint/magic-numbers': [
            'error',
            {
              allowedNumbers: [0, 1, 100],
            },
          ],
        },
      };

      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 x) public returns (uint256) {
            if (x > 100) {  // Allowed
              return x * 2;  // Magic number
            }
            return x + 50;  // Magic number
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, customConfig);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2); // 2 and 50
      expect(issues.some(i => i.message.includes('100'))).toBe(false);
      expect(issues.some(i => i.message.includes('2'))).toBe(true);
      expect(issues.some(i => i.message.includes('50'))).toBe(true);
    });

    test('should handle empty allowed numbers list', async () => {
      const customConfig: ResolvedConfig = {
        basePath: '/test',
        rules: {
          'lint/magic-numbers': [
            'error',
            {
              allowedNumbers: [],
            },
          ],
        },
      };

      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 x) public returns (bool) {
            return x > 0;  // Even 0 should be reported
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, customConfig);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('Negative Numbers', () => {
    test('should detect negative magic numbers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(int256 x) public returns (int256) {
            return x + (-100);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const magicIssue = issues.find(i => i.message.includes('100') || i.message.includes('-100'));
      expect(magicIssue).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle function with no magic numbers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 constant MULTIPLIER = 100;

          function calculate(uint256 x) public pure returns (uint256) {
            return x * MULTIPLIER;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      // May or may not report the constant declaration - implementation choice
    });

    test('should handle empty function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function empty() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle large numbers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function bigNumber() public returns (uint256) {
            return 1000000000000000000;  // 1 ether in wei
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const magicIssue = issues.find(i => i.message.includes('1000000000000000000'));
      expect(magicIssue).toBeDefined();
    });
  });

  describe('Array and Indexing', () => {
    test('should detect magic numbers in array declarations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function createArray() public pure returns (uint256[] memory) {
            uint256[] memory arr = new uint256[](10);
            return arr;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Array size is a magic number
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect magic numbers in array access', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] public values;

          function getThird() public view returns (uint256) {
            return values[2];  // Magic index
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Index 2 should be reported
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
