/**
 * Delegatecall in Loop Security Rule Tests
 *
 * Testing detection of delegatecall usage within loops (gas exhaustion and state inconsistency risks)
 */

import { DelegatecallInLoopRule } from '@/rules/security/delegatecall-in-loop';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('DelegatecallInLoopRule', () => {
  let rule: DelegatecallInLoopRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new DelegatecallInLoopRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/delegatecall-in-loop');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous delegatecall patterns', () => {
    test('should detect delegatecall in for loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address[] public targets;

          function batchCall(bytes[] memory data) public {
            for (uint i = 0; i < targets.length; i++) {
              targets[i].delegatecall(data[i]);
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/delegatecall.*loop/i);
    });

    test('should detect delegatecall in while loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function processAll(address[] memory addrs, bytes[] memory data) public {
            uint i = 0;
            while (i < addrs.length) {
              addrs[i].delegatecall(data[i]);
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
      expect(issues[0]?.message).toMatch(/delegatecall/i);
    });

    test('should detect delegatecall in do-while loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function execute(address[] memory targets, bytes memory data) public {
            uint i = 0;
            do {
              targets[i].delegatecall(data);
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

    test('should detect delegatecall in nested loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function batchProcess(address[][] memory targets, bytes memory data) public {
            for (uint i = 0; i < targets.length; i++) {
              for (uint j = 0; j < targets[i].length; j++) {
                targets[i][j].delegatecall(data);
              }
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should detect delegatecall in nested loop
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple delegatecalls in same loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function multiCall(address[] memory targets, bytes[] memory data1, bytes[] memory data2) public {
            for (uint i = 0; i < targets.length; i++) {
              targets[i].delegatecall(data1[i]);
              targets[i].delegatecall(data2[i]);
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2); // Two delegatecalls
    });

    test('should detect delegatecall through low-level call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function batchExec(address[] memory targets, bytes memory data) public {
            for (uint i = 0; i < targets.length; i++) {
              (bool success, ) = targets[i].delegatecall(data);
              require(success, "Call failed");
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

    test('should detect delegatecall with array iteration', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address[] public implementations;

          function upgradeAll(bytes memory data) public {
            for (uint i = 0; i < implementations.length; i++) {
              implementations[i].delegatecall(data);
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

  describe('safe delegatecall patterns', () => {
    test('should not report delegatecall outside loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address public implementation;

          function upgrade(bytes memory data) public {
            implementation.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report regular call in loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function batchCall(address[] memory targets, bytes[] memory data) public {
            for (uint i = 0; i < targets.length; i++) {
              targets[i].call(data[i]);
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

    test('should not report staticcall in loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function batchQuery(address[] memory targets, bytes memory data) public view returns (bytes[] memory) {
            bytes[] memory results = new bytes[](targets.length);
            for (uint i = 0; i < targets.length; i++) {
              (bool success, bytes memory result) = targets[i].staticcall(data);
              results[i] = result;
            }
            return results;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report send/transfer in loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function distribute(address payable[] memory recipients) public payable {
            uint amount = msg.value / recipients.length;
            for (uint i = 0; i < recipients.length; i++) {
              recipients[i].transfer(amount);
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

    test('should not report function without loops', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address public target;

          function execute(bytes memory data) public {
            target.delegatecall(data);
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
    test('should handle contract without delegatecalls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoDelegatecall {
          uint256 public value;

          function increment() public {
            for (uint i = 0; i < 10; i++) {
              value++;
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

    test('should handle multiple contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function bad(address[] memory targets, bytes memory data) public {
            for (uint i = 0; i < targets.length; i++) {
              targets[i].delegatecall(data);
            }
          }
        }

        contract Safe {
          function good(address target, bytes memory data) public {
            target.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Only report issue in Vulnerable contract
      expect(issues.length).toBe(1);
    });

    test('should handle delegatecall in inner function called from loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Complex {
          function executeOne(address target, bytes memory data) internal {
            target.delegatecall(data);
          }

          function executeMany(address[] memory targets, bytes memory data) public {
            for (uint i = 0; i < targets.length; i++) {
              executeOne(targets[i], data);
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should not detect (requires call graph analysis for indirect calls)
      // This is acceptable limitation - we detect direct delegatecalls in loops
      expect(issues).toHaveLength(0);
    });
  });
});
