/**
 * Costly Loop Security Rule Tests
 */

import { CostlyLoopRule } from '@/rules/security/costly-loop';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('CostlyLoopRule', () => {
  let rule: CostlyLoopRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new CostlyLoopRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/costly-loop');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect unbounded loop over dynamic array', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address[] public users;
          function processAll() public {
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
      expect(issues[0]?.message.toLowerCase()).toContain('loop');
    });

    test('should detect while loop with dynamic array access', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;
          function process() public {
            uint i = 0;
            while (i < data.length) {
              i++;
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect nested loops with unbounded iteration', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => address[]) public connections;
          address[] public users;
          function processConnections() public {
            for (uint i = 0; i < users.length; i++) {
              for (uint j = 0; j < connections[users[i]].length; j++) {
                // Double iteration
              }
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect do-while loop with dynamic array', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public items;
          function process() public {
            uint i = 0;
            do {
              i++;
            } while (i < items.length);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect loop with external call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        interface IToken {
          function transfer(address to, uint amount) external returns (bool);
        }
        contract Test {
          address[] public recipients;
          IToken public token;
          function distribute() public {
            for (uint i = 0; i < recipients.length; i++) {
              token.transfer(recipients[i], 100);
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect loop with state modification', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public total;
          uint[] public values;
          function sum() public {
            for (uint i = 0; i < values.length; i++) {
              total += values[i];
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect loop with multiple issues', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address[] public users;
          uint public counter;
          function process() public {
            for (uint i = 0; i < users.length; i++) {
              counter++;
            }
            for (uint j = 0; j < users.length; j++) {
              // Another loop
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });
  });

  describe('safe patterns', () => {
    test('should not report fixed-size loop', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function process() public pure {
            for (uint i = 0; i < 10; i++) {
              // Fixed iteration count
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });


    test('should not report loop with manual bound check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address[] public users;
          function process(uint maxIterations) public {
            uint len = users.length;
            uint iterations = len > maxIterations ? maxIterations : len;
            for (uint i = 0; i < iterations; i++) {
              // Bounded iteration
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report loop without array access', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function calculate(uint n) public pure returns (uint) {
            uint result = 1;
            for (uint i = 1; i <= n && i <= 100; i++) {
              result *= i;
            }
            return result;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without loops', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function setValue(uint v) public {
            value = v;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
