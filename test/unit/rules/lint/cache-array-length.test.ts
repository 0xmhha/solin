/**
 * Cache Array Length Rule Tests
 *
 * Testing detection of uncached array.length in loop conditions
 */

import { CacheArrayLengthRule } from '@/rules/lint/cache-array-length';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('CacheArrayLengthRule', () => {
  let rule: CacheArrayLengthRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new CacheArrayLengthRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/cache-array-length');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('for loops with array.length', () => {
    test('should detect uncached array.length in for loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] public items;

          function process() public {
            for (uint256 i = 0; i < items.length; i++) {
              // process items
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/cache/i);
      expect(issues[0]?.message).toContain('items');
    });

    test('should detect with different comparison operators', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function test1() public {
            for (uint i = 0; i < items.length; i++) {}
          }

          function test2() public {
            for (uint i = 0; i <= items.length - 1; i++) {}
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(2);
    });

    test('should detect multiple uncached arrays in same function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;
          uint256[] values;

          function process() public {
            for (uint i = 0; i < items.length; i++) {}
            for (uint j = 0; j < values.length; j++) {}
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(2);
      expect(issues.some(i => i.message.includes('items'))).toBe(true);
      expect(issues.some(i => i.message.includes('values'))).toBe(true);
    });

    test('should not report when length is already cached', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function process() public {
            uint256 length = items.length;
            for (uint256 i = 0; i < length; i++) {
              // process items
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

    test('should handle nested loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;
          uint256[] values;

          function process() public {
            for (uint i = 0; i < items.length; i++) {
              for (uint j = 0; j < values.length; j++) {
                // nested processing
              }
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(2); // Both loops
    });
  });

  describe('while loops with array.length', () => {
    test('should detect uncached array.length in while loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function process() public {
            uint256 i = 0;
            while (i < items.length) {
              i++;
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/cache/i);
    });

    test('should not report when length is cached in while loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function process() public {
            uint256 length = items.length;
            uint256 i = 0;
            while (i < length) {
              i++;
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

  describe('array modifications', () => {
    test('should not report when array is modified in loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function addItems() public {
            for (uint i = 0; i < items.length; i++) {
              items.push(i);  // Array is modified
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

    test('should not report when array is popped in loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function removeItems() public {
            for (uint i = 0; i < items.length; i++) {
              items.pop();  // Array is modified
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

    test('should report when different array is modified', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;
          uint256[] results;

          function process() public {
            for (uint i = 0; i < items.length; i++) {
              results.push(items[i]);  // Different array modified
            }
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

  describe('edge cases', () => {
    test('should handle function without loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function getLength() public view returns (uint256) {
            return items.length;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle loop without array.length', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function process() public {
            for (uint i = 0; i < 10; i++) {
              // fixed iteration
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

    test('should handle memory arrays', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function process(uint256[] memory items) public {
            for (uint i = 0; i < items.length; i++) {
              // process memory array
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Memory arrays also benefit from caching, so should report
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle calldata arrays', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function process(uint256[] calldata items) external {
            for (uint i = 0; i < items.length; i++) {
              // process calldata array
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Calldata arrays also benefit from caching
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle array accessed via struct', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          struct Data {
            uint256[] items;
          }

          Data public data;

          function process() public {
            for (uint i = 0; i < data.items.length; i++) {
              // process struct array
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('items');
    });
  });

  describe('gas optimization guidance', () => {
    test('should provide gas optimization information', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] items;

          function process() public {
            for (uint i = 0; i < items.length; i++) {}
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/gas/i);
    });
  });
});
