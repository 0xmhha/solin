/**
 * Locked Ether Security Rule Tests
 *
 * Testing detection of contracts that can receive Ether but cannot withdraw it
 */

import { LockedEtherRule } from '@/rules/security/locked-ether';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('LockedEtherRule', () => {
  let rule: LockedEtherRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new LockedEtherRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/locked-ether');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous locked ether patterns', () => {
    test('should detect payable function without withdrawal mechanism', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract LockedEther {
          function deposit() public payable {
            // Accepts ether but no way to withdraw
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/locked/i);
      expect(issues[0]?.message).toMatch(/ether/i);
    });

    test('should detect receive function without withdrawal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract LockedEther {
          receive() external payable {
            // Can receive ether but cannot withdraw
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect fallback function without withdrawal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract LockedEther {
          fallback() external payable {
            // Accepts ether but no withdrawal
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple payable functions without withdrawal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract LockedEther {
          function depositA() public payable {}
          function depositB() public payable {}

          receive() external payable {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect constructor payable without withdrawal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract LockedEther {
          constructor() payable {
            // Can receive ether in constructor but no way to withdraw
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

  describe('safe ether handling patterns', () => {
    test('should not report contract with transfer withdrawal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function deposit() public payable {}

          function withdraw() public {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report contract with send withdrawal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          receive() external payable {}

          function withdraw() public {
            payable(msg.sender).send(address(this).balance);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report contract with call withdrawal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function deposit() public payable {}

          function withdraw() public {
            payable(msg.sender).call("");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report contract with selfdestruct', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          receive() external payable {}

          function destroy(address payable recipient) public {
            selfdestruct(recipient);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report contract without payable functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoPay {
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

    test('should not report contract with private withdrawal function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function deposit() public payable {}

          function publicWithdraw() public {
            _withdraw();
          }

          function _withdraw() private {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report contract with internal withdrawal function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          receive() external payable {}

          function withdraw() public {
            internalWithdraw();
          }

          function internalWithdraw() internal {
            payable(msg.sender).transfer(address(this).balance);
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
    test('should handle multiple contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract LockedEther {
          function deposit() public payable {}
        }

        contract SafeEther {
          function deposit() public payable {}
          function withdraw() public {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(1); // Only LockedEther
    });

    test('should handle contract with only constructor payable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract OnlyConstructor {
          constructor() payable {}

          function withdraw() public {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle complex withdrawal logic', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Complex {
          mapping(address => uint256) public balances;

          function deposit() public payable {
            balances[msg.sender] += msg.value;
          }

          function withdraw(uint256 amount) public {
            require(balances[msg.sender] >= amount);
            balances[msg.sender] -= amount;
            payable(msg.sender).transfer(amount);
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
