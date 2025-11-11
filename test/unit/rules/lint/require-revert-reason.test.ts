/**
 * Require Revert Reason Rule Tests
 *
 * Testing detection of require/revert statements without error messages
 */

import { RequireRevertReasonRule } from '@/rules/lint/require-revert-reason';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('RequireRevertReasonRule', () => {
  let rule: RequireRevertReasonRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new RequireRevertReasonRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/require-revert-reason');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('require() statements', () => {
    test('should not report require with error message', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public {
            require(value > 0, "Value must be positive");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report require without error message', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public {
            require(value > 0);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/require.*message/i);
    });

    test('should report require with empty string message', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public {
            require(value > 0, "");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/empty.*message/i);
    });

    test('should handle multiple requires', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 a, uint256 b) public {
            require(a > 0, "A must be positive");
            require(b > 0);  // Missing message
            require(a < b, "A must be less than B");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1); // Only the one without message
    });
  });

  describe('revert() statements', () => {
    test('should not report revert with error message', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public {
            if (value == 0) {
              revert("Value cannot be zero");
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

    test('should report revert without error message', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public {
            if (value == 0) {
              revert();
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/revert.*message/i);
    });

    test('should report revert with empty string message', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public {
            if (value == 0) {
              revert("");
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/empty.*message/i);
    });
  });

  describe('Custom errors (Solidity 0.8.4+)', () => {
    test('should not report revert with custom error', async () => {
      const source = `
        pragma solidity ^0.8.4;

        contract Test {
          error InvalidValue(uint256 value);

          function check(uint256 value) public {
            if (value == 0) {
              revert InvalidValue(value);
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

    test('should allow custom error with parameters', async () => {
      const source = `
        pragma solidity ^0.8.4;

        contract Test {
          error OutOfRange(uint256 min, uint256 max, uint256 actual);

          function check(uint256 value) public {
            if (value < 10 || value > 100) {
              revert OutOfRange(10, 100, value);
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

  describe('assert() statements', () => {
    test('should not check assert statements', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public {
            assert(value > 0);  // Assert doesn't need message
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

  describe('Edge cases', () => {
    test('should handle function with no require/revert', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function calculate(uint256 a, uint256 b) public returns (uint256) {
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

    test('should handle require with complex condition', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 a, uint256 b) public {
            require(a > 0 && b > 0 && a < b, "Invalid values");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle require with variable message', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value, string memory errorMsg) public {
            require(value > 0, errorMsg);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle nested require statements', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function check(uint256 value) public {
            if (value > 0) {
              require(value < 100, "Value too large");
            } else {
              require(value == 0);  // Missing message
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });
  });

  describe('Mixed statements', () => {
    test('should detect all issues in complex function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function complex(uint256 a, uint256 b, uint256 c) public {
            require(a > 0, "A must be positive");
            require(b > 0);  // Missing message

            if (c == 0) {
              revert("C cannot be zero");
            }

            if (a > b) {
              revert();  // Missing message
            }

            require(a < 100);  // Missing message
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(3); // 2 requires + 1 revert without message
    });
  });
});
