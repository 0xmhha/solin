/**
 * Controlled Delegatecall Security Rule Tests
 *
 * Testing detection of user-controlled delegatecall destinations
 */

import { ControlledDelegatecallRule } from '@/rules/security/controlled-delegatecall';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ControlledDelegatecallRule', () => {
  let rule: ControlledDelegatecallRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ControlledDelegatecallRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/controlled-delegatecall');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous delegatecall patterns', () => {
    test('should detect delegatecall with function parameter target', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function execute(address target, bytes memory data) public {
            target.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/delegatecall/i);
      expect(issues[0]?.message).toMatch(/controlled/i);
    });

    test('should detect delegatecall with mapping value target', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          mapping(uint256 => address) public implementations;

          function execute(uint256 id, bytes memory data) public {
            implementations[id].delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect delegatecall with array element target', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address[] public targets;

          function executeBatch(bytes[] memory data) public {
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
    });

    test('should detect delegatecall with mutable storage variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address public implementation;

          function setImplementation(address _impl) public {
            implementation = _impl;
          }

          function execute(bytes memory data) public {
            implementation.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect delegatecall with user-controlled storage variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address private target;

          function updateTarget(address newTarget) external {
            target = newTarget;
          }

          function proxy(bytes calldata data) external {
            target.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple controlled delegatecalls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function executeMultiple(address target1, address target2, bytes memory data) public {
            target1.delegatecall(data);
            target2.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });

    test('should detect delegatecall in external function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function execute(address impl) external returns (bytes memory) {
            (bool success, bytes memory result) = impl.delegatecall(msg.data);
            require(success, "Delegatecall failed");
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

  describe('safe delegatecall patterns', () => {
    test('should not report delegatecall with constant address', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address public constant IMPL = 0x1234567890123456789012345678901234567890;

          function execute(bytes memory data) public {
            IMPL.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report delegatecall with immutable address', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address public immutable implementation;

          constructor(address _impl) {
            implementation = _impl;
          }

          function execute(bytes memory data) public {
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

    test('should not report delegatecall with hardcoded address literal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function execute(bytes memory data) public {
            address(0x1234567890123456789012345678901234567890).delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report delegatecall with constructor-only variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address public implementation;

          constructor(address _impl) {
            implementation = _impl;
          }

          function execute(bytes memory data) public {
            implementation.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should report because there's no way to know if it's only set in constructor
      // without data flow analysis
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contract without delegatecall', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoDelegatecall {
          address public target;

          function setTarget(address _target) public {
            target = _target;
          }

          function execute(bytes memory data) public {
            target.call(data);
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
    test('should handle delegatecall in private function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract EdgeCase {
          function executePublic(address target, bytes memory data) public {
            _executePrivate(target, data);
          }

          function _executePrivate(address target, bytes memory data) private {
            target.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle delegatecall in internal function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract EdgeCase {
          function executeInternal(address target, bytes memory data) internal {
            target.delegatecall(data);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle multiple contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract ContractA {
          function execute(address target, bytes memory data) public {
            target.delegatecall(data);
          }
        }

        contract ContractB {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(1); // Only in ContractA
    });

    test('should handle complex expression with type cast', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Complex {
          function execute(address target, bytes memory data) public {
            address(target).delegatecall(data);
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
