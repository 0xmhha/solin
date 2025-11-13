/**
 * Reentrancy Security Rule Tests
 */

import { ReentrancyRule } from '@/rules/security/reentrancy';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ReentrancyRule', () => {
  let rule: ReentrancyRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ReentrancyRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/reentrancy');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect basic reentrancy (external call before state update)', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          mapping(address => uint) public balances;

          function withdraw() public {
            uint amount = balances[msg.sender];
            msg.sender.call{value: amount}("");
            balances[msg.sender] = 0;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('reentrancy');
    });

    test('should detect reentrancy with .call()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) balances;

          function withdraw(uint amount) public {
            (bool success, ) = msg.sender.call{value: amount}("");
            balances[msg.sender] -= amount;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect reentrancy with .transfer()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) balances;

          function withdraw() public {
            uint amount = balances[msg.sender];
            payable(msg.sender).transfer(amount);
            balances[msg.sender] = 0;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect reentrancy with .send()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) balances;

          function withdraw() public {
            uint amount = balances[msg.sender];
            payable(msg.sender).send(amount);
            balances[msg.sender] = 0;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect reentrancy with external contract call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract External {
          function notify(address user) external {}
        }

        contract Test {
          mapping(address => uint) balances;
          External externalContract;

          function withdraw() public {
            uint amount = balances[msg.sender];
            externalContract.notify(msg.sender);
            balances[msg.sender] = 0;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect cross-function reentrancy', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) balances;

          function withdraw() public {
            uint amount = balances[msg.sender];
            (bool success, ) = msg.sender.call{value: amount}("");
            _updateBalance(msg.sender, 0);
          }

          function _updateBalance(address user, uint newBalance) internal {
            balances[user] = newBalance;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect reentrancy with multiple state changes after call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) balances;
          uint public totalSupply;

          function withdraw() public {
            uint amount = balances[msg.sender];
            msg.sender.call{value: amount}("");
            balances[msg.sender] = 0;
            totalSupply -= amount;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect reentrancy in conditional branches', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) balances;

          function withdraw(bool useCall) public {
            uint amount = balances[msg.sender];
            if (useCall) {
              msg.sender.call{value: amount}("");
            }
            balances[msg.sender] = 0;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });
  });

  describe('safe patterns', () => {
    test('should not report checks-effects-interactions pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          mapping(address => uint) public balances;

          function withdraw() public {
            uint amount = balances[msg.sender];
            balances[msg.sender] = 0;
            msg.sender.call{value: amount}("");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report state update before external call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          mapping(address => uint) balances;

          function withdraw(uint amount) public {
            require(balances[msg.sender] >= amount);
            balances[msg.sender] -= amount;
            payable(msg.sender).transfer(amount);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report reentrancy guard pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          mapping(address => uint) balances;
          bool private locked;

          modifier nonReentrant() {
            require(!locked);
            locked = true;
            _;
            locked = false;
          }

          function withdraw() public nonReentrant {
            uint amount = balances[msg.sender];
            msg.sender.call{value: amount}("");
            balances[msg.sender] = 0;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report pure external calls without state changes', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function notify(address recipient) public {
            (bool success, ) = recipient.call("");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report view/pure functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract External {
          function getData() external view returns (uint) {
            return 42;
          }
        }

        contract Safe {
          mapping(address => uint) balances;
          External externalContract;

          function getBalance() public {
            uint data = externalContract.getData();
            balances[msg.sender] = data;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report internal calls', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          mapping(address => uint) balances;

          function withdraw() public {
            uint amount = balances[msg.sender];
            _transfer(msg.sender, amount);
            balances[msg.sender] = 0;
          }

          function _transfer(address to, uint amount) internal {
            // internal logic
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without external calls', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          uint public value;

          function setValue(uint newValue) public {
            value = newValue;
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
