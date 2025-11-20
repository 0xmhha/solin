/**
 * State Change After External Call Security Rule Tests
 */

import { StateChangeExternalCallRule } from '@/rules/security/state-change-external-call';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('StateChangeExternalCallRule', () => {
  let rule: StateChangeExternalCallRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new StateChangeExternalCallRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/state-change-external-call');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect state change after external call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          mapping(address => uint) public balances;

          function withdraw() public {
            uint amount = balances[msg.sender];
            (bool success, ) = msg.sender.call{value: amount}("");
            balances[msg.sender] = 0;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('state change');
    });

    test('should detect state change after transfer', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          mapping(address => uint) public balances;
          uint public totalSupply;

          function withdraw() public {
            uint amount = balances[msg.sender];
            payable(msg.sender).transfer(amount);
            totalSupply -= amount;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect state change after external contract call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        interface IExternal {
          function notify(address user) external;
        }

        contract Vulnerable {
          IExternal public externalContract;
          mapping(address => bool) public hasVoted;

          function vote() public {
            externalContract.notify(msg.sender);
            hasVoted[msg.sender] = true;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple state changes after call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          uint public balance;
          uint public count;

          function process() public {
            (bool success, ) = msg.sender.call("");
            balance = 0;
            count++;
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
    test('should not report checks-effects-interactions pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          mapping(address => uint) public balances;

          function withdraw() public {
            uint amount = balances[msg.sender];
            balances[msg.sender] = 0;
            (bool success, ) = msg.sender.call{value: amount}("");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report when no external calls', async () => {
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

    test('should not report view/pure functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function getValue() public pure returns (uint) {
            return 42;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report local variable changes after call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function process() public {
            (bool success, ) = msg.sender.call("");
            uint localVar = 42;
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
