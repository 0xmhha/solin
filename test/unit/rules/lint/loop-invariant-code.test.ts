/**
 * Loop Invariant Code Rule Tests
 *
 * Testing detection of loop-invariant code that can be moved outside loops
 */

import { LoopInvariantCodeRule } from '@/rules/lint/loop-invariant-code';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('LoopInvariantCodeRule', () => {
  let rule: LoopInvariantCodeRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new LoopInvariantCodeRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/loop-invariant-code');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('state variable reads in loops', () => {
    test('should detect repeated state variable read in loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public fee = 100;
          uint256[] public items;

          function process() public view returns (uint256) {
            uint256 total = 0;
            for (uint256 i = 0; i < items.length; i++) {
              total += items[i] * fee;  // fee is read every iteration
            }
            return total;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/invariant/i);
      expect(issues[0]?.message).toContain('fee');
    });

    test('should detect multiple invariant reads', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public rate = 10;
          uint256 public bonus = 5;
          uint256[] items;

          function calculate() public view returns (uint256) {
            uint256 sum = 0;
            for (uint i = 0; i < items.length; i++) {
              sum += items[i] * rate + bonus;
            }
            return sum;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      // Should detect at least one of rate or bonus
    });

    test('should handle while loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public multiplier = 10;
          uint256[] items;

          function process() public view returns (uint256) {
            uint256 total = 0;
            uint256 i = 0;
            while (i < items.length) {
              total += items[i] * multiplier;
              i++;
            }
            return total;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('multiplier');
    });
  });

  describe('valid loop code', () => {
    test('should not report when state var is cached', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public fee = 100;
          uint256[] items;

          function process() public view returns (uint256) {
            uint256 total = 0;
            uint256 cachedFee = fee;  // Cached before loop
            for (uint i = 0; i < items.length; i++) {
              total += items[i] * cachedFee;
            }
            return total;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report when var is modified in loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public counter;
          uint256[] items;

          function process() public {
            for (uint i = 0; i < items.length; i++) {
              counter += items[i];  // counter is modified
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

    test('should not report loop-dependent calculations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;
          uint256[] results;

          function process() public {
            for (uint i = 0; i < items.length; i++) {
              results[i] = items[i] * i;  // Uses loop variable
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

    test('should not report when only array element accessed', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function sum() public view returns (uint256) {
            uint256 total = 0;
            for (uint i = 0; i < items.length; i++) {
              total += items[i];  // Only array element, not invariant
            }
            return total;
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

  describe('complex scenarios', () => {
    test('should detect in nested loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public factor = 10;
          uint256[][] matrix;

          function processMatrix() public view returns (uint256) {
            uint256 sum = 0;
            for (uint i = 0; i < matrix.length; i++) {
              for (uint j = 0; j < matrix[i].length; j++) {
                sum += matrix[i][j] * factor;
              }
            }
            return sum;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle function parameters as invariants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function process(uint256 multiplier) public view returns (uint256) {
            uint256 total = 0;
            for (uint i = 0; i < items.length; i++) {
              total += items[i] * multiplier;  // Parameter is invariant
            }
            return total;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('multiplier');
    });
  });

  describe('edge cases', () => {
    test('should handle empty loop body', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function emptyLoop() public pure {
            for (uint i = 0; i < 10; i++) {
              // Empty
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

    test('should handle function without loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public value = 100;

          function getValue() public view returns (uint256) {
            return value * 2;
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
