/**
 * Return Bomb Security Rule Tests
 */

import { ReturnBombRule } from '@/rules/security/return-bomb';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ReturnBombRule', () => {
  let rule: ReturnBombRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ReturnBombRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/return-bomb');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect external call with return data copy', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function callExternal(address target) public {
            (bool success, bytes memory data) = target.call("");
            require(success);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('return');
    });

    test('should detect delegatecall with return data', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function delegateCall(address target, bytes memory data) public {
            (bool success, bytes memory returnData) = target.delegatecall(data);
            require(success);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect staticcall with return data', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function staticCall(address target) public view {
            (bool success, bytes memory result) = target.staticcall("");
            require(success);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect call with used return data', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function execute(address target) public returns (bytes memory) {
            (bool success, bytes memory data) = target.call("");
            require(success);
            return data;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple vulnerable calls', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function call1(address a) public {
            (bool s1, bytes memory d1) = a.call("");
            require(s1);
          }
          function call2(address b) public {
            (bool s2, bytes memory d2) = b.delegatecall("");
            require(s2);
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
    test('should not report call without return data capture', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function execute(address target) public {
            (bool success, ) = target.call("");
            require(success);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report call with only success check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function execute(address target) public {
            bool success = target.call("");
            require(success);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report transfer/send', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function send(address payable recipient) public {
            recipient.transfer(1 ether);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report external function call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        interface IToken {
          function balanceOf(address) external view returns (uint);
        }
        contract Test {
          function getBalance(IToken token, address user) public view returns (uint) {
            return token.balanceOf(user);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without low-level calls', async () => {
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
