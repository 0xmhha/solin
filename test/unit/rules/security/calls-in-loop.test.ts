/**
 * Calls in Loop Security Rule Tests
 *
 * Testing detection of external calls inside loops (DOS risk)
 */

import { CallsInLoopRule } from '@/rules/security/calls-in-loop';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('CallsInLoopRule', () => {
  let rule: CallsInLoopRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new CallsInLoopRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/calls-in-loop');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('function calls in loops', () => {
    test('should detect external call in for loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          address[] public users;

          function processUsers() public {
            for (uint256 i = 0; i < users.length; i++) {
              users[i].call{value: 1 ether}("");
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/loop|call|DOS/i);
    });

    test('should detect function call in while loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IERC20 {
          function transfer(address to, uint256 amount) external returns (bool);
        }

        contract Example {
          IERC20 token;
          address[] recipients;

          function distribute() public {
            uint256 i = 0;
            while (i < recipients.length) {
              token.transfer(recipients[i], 100);
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

    test('should detect call in do-while loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          address[] targets;

          function process() public {
            uint256 i = 0;
            do {
              targets[i].call("");
              i++;
            } while (i < targets.length);
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

  describe('safe loop patterns', () => {
    test('should not report loops without function calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256[] public data;

          function sumArray() public view returns (uint256) {
            uint256 sum = 0;
            for (uint256 i = 0; i < data.length; i++) {
              sum += data[i];
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

    test('should not report functions without loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          address public target;

          function singleCall() public {
            target.call("");
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

    test('should detect nested loops with calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          address[][] public groups;

          function processAll() public {
            for (uint256 i = 0; i < groups.length; i++) {
              for (uint256 j = 0; j < groups[i].length; j++) {
                groups[i][j].call("");
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
