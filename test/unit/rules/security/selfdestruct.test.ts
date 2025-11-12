/**
 * Selfdestruct Security Rule Tests
 *
 * Testing detection of dangerous selfdestruct usage
 */

import { SelfdestructRule } from '@/rules/security/selfdestruct';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('SelfdestructRule', () => {
  let rule: SelfdestructRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new SelfdestructRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/selfdestruct');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous selfdestruct patterns', () => {
    test('should detect selfdestruct in public function without access control', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function destroy() public {
            selfdestruct(payable(msg.sender));
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/selfdestruct/i);
    });

    test('should detect selfdestruct in external function without access control', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function kill(address payable recipient) external {
            selfdestruct(recipient);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect selfdestruct with insufficient access control', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          bool public authorized = true;

          function destroy() public {
            if (authorized) {
              selfdestruct(payable(msg.sender));
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should still report because authorized can be modified
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple selfdestruct calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          function destroyA() public {
            selfdestruct(payable(msg.sender));
          }

          function destroyB() public {
            selfdestruct(payable(address(0)));
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });

    test('should detect selfdestruct with user-controlled recipient', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          address public owner;

          constructor() {
            owner = msg.sender;
          }

          function destroy(address payable recipient) public {
            require(msg.sender == owner, "Not owner");
            selfdestruct(recipient);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should report because recipient is user-controlled
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('safe selfdestruct patterns', () => {
    test('should not report selfdestruct with proper owner access control', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          address public immutable owner;

          constructor() {
            owner = msg.sender;
          }

          function destroy() external {
            require(msg.sender == owner, "Not owner");
            selfdestruct(payable(owner));
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // This is still dangerous but with proper access control
      // For now, we'll be conservative and still report it
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contract without selfdestruct', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoSelfDestruct {
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
  });

  describe('access control detection', () => {
    test('should detect selfdestruct with require statement access control', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WithAccessControl {
          address private owner;

          constructor() {
            owner = msg.sender;
          }

          function destroy() public {
            require(msg.sender == owner, "Not authorized");
            selfdestruct(payable(owner));
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Even with access control, selfdestruct is dangerous
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect selfdestruct with modifier access control', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WithModifier {
          address private owner;

          constructor() {
            owner = msg.sender;
          }

          modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
          }

          function destroy() public onlyOwner {
            selfdestruct(payable(owner));
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Still report because selfdestruct is inherently dangerous
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    test('should handle selfdestruct in private function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract PrivateDestroy {
          address private owner;

          constructor() {
            owner = msg.sender;
          }

          function publicFunction() public {
            require(msg.sender == owner, "Not owner");
            _destroy();
          }

          function _destroy() private {
            selfdestruct(payable(owner));
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle selfdestruct in internal function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract InternalDestroy {
          function internalDestroy() internal {
            selfdestruct(payable(msg.sender));
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
          function destroy() public {
            selfdestruct(payable(msg.sender));
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

    test('should handle suicide (deprecated alias for selfdestruct)', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract DeprecatedSuicide {
          function destroy() public {
            suicide(payable(msg.sender));
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
