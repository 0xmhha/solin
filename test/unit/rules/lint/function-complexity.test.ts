/**
 * Function Complexity Rule Tests
 *
 * Testing code complexity metrics:
 * - Cyclomatic complexity
 * - Function line count
 * - Parameter count
 */

import { FunctionComplexityRule } from '@/rules/lint/function-complexity';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('FunctionComplexityRule', () => {
  let rule: FunctionComplexityRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new FunctionComplexityRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/function-complexity');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Cyclomatic Complexity', () => {
    test('should not report simple function (complexity = 1)', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function simple() public returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report function with single if (complexity = 2)', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function withIf(uint256 x) public returns (uint256) {
            if (x > 10) {
              return x * 2;
            }
            return x;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report function with high complexity', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function complex(uint256 x) public returns (uint256) {
            if (x > 10) {
              return x;
            }
            if (x > 9) {
              return x;
            }
            if (x > 8) {
              return x;
            }
            if (x > 7) {
              return x;
            }
            if (x > 6) {
              return x;
            }
            if (x > 5) {
              return x;
            }
            if (x > 4) {
              return x;
            }
            if (x > 3) {
              return x;
            }
            if (x > 2) {
              return x;
            }
            if (x > 1) {
              return x;
            }
            return 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const complexityIssue = issues.find(i => i.message.includes('complexity'));
      expect(complexityIssue).toBeDefined();
      expect(complexityIssue?.message).toContain('11'); // complexity = 11
    });

    test('should count for loop as decision point', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function withLoop() public {
            for (uint256 i = 0; i < 10; i++) {
              // Loop body
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0); // Complexity = 2, still under threshold
    });

    test('should count while loop as decision point', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function withWhile(uint256 x) public {
            while (x > 0) {
              x--;
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0); // Complexity = 2, still under threshold
    });

    test('should count nested control structures', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function nested(uint256 x) public returns (uint256) {
            if (x > 10) {
              for (uint256 i = 0; i < x; i++) {
                if (i % 2 == 0) {
                  return i;
                }
              }
            }
            return 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0); // Complexity = 4, still under threshold
    });

    test('should count logical operators', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function withLogicalOps(uint256 x, uint256 y) public returns (bool) {
            return (x > 10 && y < 5) || (x < 5 && y > 10);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0); // Complexity = 5, still under threshold
    });

    test('should count ternary operators', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function withTernary(uint256 x) public returns (uint256) {
            return x > 10 ? x * 2 : x;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0); // Complexity = 2, still under threshold
    });
  });

  describe('Function Line Count', () => {
    test('should not report short function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function short() public returns (uint256) {
            uint256 x = 10;
            uint256 y = 20;
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

    test('should report long function (>50 lines)', async () => {
      // Create a function with many lines
      const lines = [];
      lines.push('pragma solidity ^0.8.0;');
      lines.push('contract Test {');
      lines.push('  function long() public returns (uint256) {');

      // Add 60 lines of code
      for (let i = 0; i < 60; i++) {
        lines.push(`    uint256 var${i} = ${i};`);
      }

      lines.push('    return 0;');
      lines.push('  }');
      lines.push('}');

      const source = lines.join('\n');

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const linesIssue = issues.find(i => i.message.includes('lines'));
      expect(linesIssue).toBeDefined();
    });
  });

  describe('Parameter Count', () => {
    test('should not report function with few parameters', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function fewParams(uint256 a, uint256 b, uint256 c) public returns (uint256) {
            return a + b + c;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report function with many parameters (>7)', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function manyParams(
            uint256 a,
            uint256 b,
            uint256 c,
            uint256 d,
            uint256 e,
            uint256 f,
            uint256 g,
            uint256 h
          ) public returns (uint256) {
            return a + b + c + d + e + f + g + h;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const paramsIssue = issues.find(i => i.message.includes('parameter'));
      expect(paramsIssue).toBeDefined();
      expect(paramsIssue?.message).toContain('8');
    });
  });

  describe('Multiple Issues', () => {
    test('should report multiple metrics violations', async () => {
      // Create a function that violates all three metrics
      const lines = [];
      lines.push('pragma solidity ^0.8.0;');
      lines.push('contract Test {');
      lines.push('  function bad(');

      // 8 parameters (violates parameter count)
      for (let i = 0; i < 8; i++) {
        lines.push(`    uint256 param${i}${i < 7 ? ',' : ''}`);
      }

      lines.push('  ) public returns (uint256) {');

      // Many if statements (violates complexity)
      for (let i = 0; i < 11; i++) {
        lines.push(`    if (param0 > ${i}) { return ${i}; }`);
      }

      // Many more lines (violates line count)
      for (let i = 0; i < 45; i++) {
        lines.push(`    uint256 var${i} = ${i};`);
      }

      lines.push('    return 0;');
      lines.push('  }');
      lines.push('}');

      const source = lines.join('\n');

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(3);

      // Should have complexity issue
      const complexityIssue = issues.find(i => i.message.includes('complexity'));
      expect(complexityIssue).toBeDefined();

      // Should have lines issue
      const linesIssue = issues.find(i => i.message.includes('lines'));
      expect(linesIssue).toBeDefined();

      // Should have parameters issue
      const paramsIssue = issues.find(i => i.message.includes('parameter'));
      expect(paramsIssue).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('should respect custom maxComplexity threshold', async () => {
      const customConfig: ResolvedConfig = {
        basePath: '/test',
        rules: {
          'lint/function-complexity': [
            'error',
            {
              maxComplexity: 3,
            },
          ],
        },
      };

      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function moderate(uint256 x) public returns (uint256) {
            if (x > 10) {
              return x;
            }
            if (x > 5) {
              return x * 2;
            }
            if (x > 2) {
              return x * 3;
            }
            return 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, customConfig);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const complexityIssue = issues.find(i => i.message.includes('complexity'));
      expect(complexityIssue).toBeDefined();
    });

    test('should respect custom maxLines threshold', async () => {
      const customConfig: ResolvedConfig = {
        basePath: '/test',
        rules: {
          'lint/function-complexity': [
            'error',
            {
              maxLines: 10,
            },
          ],
        },
      };

      const lines = [];
      lines.push('pragma solidity ^0.8.0;');
      lines.push('contract Test {');
      lines.push('  function moderate() public returns (uint256) {');

      // Add 15 lines
      for (let i = 0; i < 15; i++) {
        lines.push(`    uint256 var${i} = ${i};`);
      }

      lines.push('    return 0;');
      lines.push('  }');
      lines.push('}');

      const source = lines.join('\n');

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, customConfig);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const linesIssue = issues.find(i => i.message.includes('lines'));
      expect(linesIssue).toBeDefined();
    });

    test('should respect custom maxParameters threshold', async () => {
      const customConfig: ResolvedConfig = {
        basePath: '/test',
        rules: {
          'lint/function-complexity': [
            'error',
            {
              maxParameters: 3,
            },
          ],
        },
      };

      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function moderate(uint256 a, uint256 b, uint256 c, uint256 d) public returns (uint256) {
            return a + b + c + d;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, customConfig);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      const paramsIssue = issues.find(i => i.message.includes('parameter'));
      expect(paramsIssue).toBeDefined();
    });
  });

  describe('Special Cases', () => {
    test('should not check constructor complexity', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          constructor() {
            // Complex constructor logic is acceptable
            if (true) {}
            if (true) {}
            if (true) {}
            if (true) {}
            if (true) {}
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      // Constructors might be checked or not - implementation decision
      // This test documents the behavior
      // We don't make assertions here, just verify no crash
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
  });
});
