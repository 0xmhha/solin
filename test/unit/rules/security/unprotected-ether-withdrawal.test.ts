/**
 * Unprotected Ether Withdrawal Security Rule Tests
 */

import { UnprotectedEtherWithdrawalRule } from '@/rules/security/unprotected-ether-withdrawal';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UnprotectedEtherWithdrawalRule', () => {
  let rule: UnprotectedEtherWithdrawalRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UnprotectedEtherWithdrawalRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unprotected-ether-withdrawal');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect public function with transfer', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw() public {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('ether');
    });

    test('should detect external function with send', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function payout() external {
            payable(msg.sender).send(1 ether);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect public function with call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function cashout() public {
            msg.sender.call{value: address(this).balance}("");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect function with arbitrary recipient', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function sendTo(address payable recipient) public {
            recipient.transfer(1 ether);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect function sending contract balance', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function drain() external {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple unprotected withdrawals', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw1() public {
            payable(msg.sender).transfer(1 ether);
          }
          function withdraw2() external {
            payable(msg.sender).transfer(2 ether);
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
    test('should not report private function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw() private {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report internal function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw() internal {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report function with onlyOwner modifier', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          modifier onlyOwner() {
            require(msg.sender == owner);
            _;
          }
          function withdraw() public onlyOwner {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report function with require check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          function withdraw() public {
            require(msg.sender == owner, "Not owner");
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report function without ether transfer', async () => {
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

    test('should not report view/pure functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function getBalance() public view returns (uint) {
            return address(this).balance;
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
