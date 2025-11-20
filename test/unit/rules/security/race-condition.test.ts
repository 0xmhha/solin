/**
 * Race Condition Security Rule Tests
 */

import { RaceConditionRule } from '@/rules/security/race-condition';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('RaceConditionRule', () => {
  let rule: RaceConditionRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new RaceConditionRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/race-condition');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect race condition with approve function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Token {
          mapping(address => mapping(address => uint256)) public allowance;

          function approve(address spender, uint256 amount) public returns (bool) {
            allowance[msg.sender][spender] = amount;
            return true;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('race condition');
    });

    test('should detect TOD (Transaction Order Dependence)', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Auction {
          address public highestBidder;
          uint public highestBid;

          function bid() public payable {
            require(msg.value > highestBid);
            highestBidder = msg.sender;
            highestBid = msg.value;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect race in state variable read-write pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Counter {
          uint public count;

          function increment() public {
            uint temp = count;
            count = temp + 1;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect race in multi-step state changes', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Race {
          uint public balance;
          uint public count;

          function withdraw() public {
            uint temp = balance;
            balance = temp - 1;
            count = count + 1;
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
    test('should not report increaseAllowance pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract SafeToken {
          mapping(address => mapping(address => uint256)) public allowance;

          function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
            allowance[msg.sender][spender] += addedValue;
            return true;
          }

          function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
            require(allowance[msg.sender][spender] >= subtractedValue);
            allowance[msg.sender][spender] -= subtractedValue;
            return true;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report atomic operations', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          uint public count;

          function increment() public {
            count++;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report view functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          uint public value;

          function getValue() public view returns (uint) {
            return value;
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
