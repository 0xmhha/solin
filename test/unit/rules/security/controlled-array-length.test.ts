/**
 * Controlled Array Length Security Rule Tests
 *
 * Testing detection of array length controlled by external actors (DOS risk)
 */

import { ControlledArrayLengthRule } from '@/rules/security/controlled-array-length';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ControlledArrayLengthRule', () => {
  let rule: ControlledArrayLengthRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ControlledArrayLengthRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/controlled-array-length');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('controlled array length patterns', () => {
    test('should detect loop over user-provided array', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function processAll(address[] memory users) public {
            for (uint i = 0; i < users.length; i++) {
              // Process each user
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/array length|DOS|denial.of.service/i);
    });

    test('should detect loop with user-controlled upper bound', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address[] public users;

          function addUsers(address[] memory newUsers) public {
            for (uint i = 0; i < newUsers.length; i++) {
              users.push(newUsers[i]);
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

    test('should detect unbounded loop over dynamic array', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          mapping(address => bool) processed;

          function processUsers(address[] calldata users) external {
            for (uint i = 0; i < users.length; i++) {
              processed[users[i]] = true;
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

    test('should detect external array used in loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function distributeRewards(address[] calldata recipients, uint256[] calldata amounts) external {
            for (uint i = 0; i < recipients.length; i++) {
              payable(recipients[i]).transfer(amounts[i]);
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

    test('should detect while loop with external array', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function process(uint256[] memory values) public {
            uint i = 0;
            while (i < values.length) {
              // Process value
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
    });
  });

  describe('safe patterns', () => {
    test('should not report loop with fixed upper bound', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function process() public {
            for (uint i = 0; i < 10; i++) {
              // Fixed bound
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

    test('should not report loop with bounded array', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          uint256[5] public fixedArray;

          function processFixed() public {
            for (uint i = 0; i < fixedArray.length; i++) {
              // Fixed-size array is safe
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

    test('should not report internal array iteration', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address[] private internalUsers;

          function processInternal() private {
            for (uint i = 0; i < internalUsers.length; i++) {
              // Internal array with access control
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

    test('should not report loop without array access', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function calculate(uint n) public pure returns (uint) {
            uint sum = 0;
            for (uint i = 0; i < n; i++) {
              sum += i;
            }
            return sum;
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
    test('should handle contracts without loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Simple {
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should detect nested loops with external arrays', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function processMatrix(uint[][] memory matrix) public {
            for (uint i = 0; i < matrix.length; i++) {
              for (uint j = 0; j < matrix[i].length; j++) {
                // Process element
              }
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
});
