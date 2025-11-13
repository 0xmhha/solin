/**
 * Msg Value in Loop Security Rule Tests
 */

import { MsgValueLoopRule } from '@/rules/security/msg-value-loop';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MsgValueLoopRule', () => {
  let rule: MsgValueLoopRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MsgValueLoopRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/msg-value-loop');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect msg.value in for loop', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function distribute(address[] memory recipients) public payable {
            for (uint i = 0; i < recipients.length; i++) {
              payable(recipients[i]).transfer(msg.value);
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('msg.value');
      expect(issues[0]?.message).toContain('loop');
    });

    test('should detect msg.value in while loop', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function process(address[] memory addrs) public payable {
            uint i = 0;
            while (i < addrs.length) {
              payable(addrs[i]).transfer(msg.value);
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
    });

    test('should detect msg.value in do-while loop', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function send(address[] memory recipients) public payable {
            uint i = 0;
            do {
              payable(recipients[i]).transfer(msg.value);
              i++;
            } while (i < recipients.length);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect msg.value in nested expression within loop', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function distribute(address[] memory recipients) public payable {
            for (uint i = 0; i < recipients.length; i++) {
              uint amount = msg.value / 10;
              payable(recipients[i]).transfer(amount);
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

    test('should detect msg.value in loop with .call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function sendMultiple(address[] memory recipients) public payable {
            for (uint i = 0; i < recipients.length; i++) {
              recipients[i].call{value: msg.value}("");
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

    test('should detect msg.value in nested loops', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function nested(address[][] memory groups) public payable {
            for (uint i = 0; i < groups.length; i++) {
              for (uint j = 0; j < groups[i].length; j++) {
                payable(groups[i][j]).transfer(msg.value);
              }
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

  describe('safe patterns', () => {
    test('should not report msg.value outside loop', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function single(address recipient) public payable {
            payable(recipient).transfer(msg.value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report loop without msg.value', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function distribute(address[] memory recipients, uint amount) public {
            for (uint i = 0; i < recipients.length; i++) {
              payable(recipients[i]).transfer(amount);
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report msg.value stored before loop', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function distribute(address[] memory recipients) public payable {
            uint totalValue = msg.value;
            uint share = totalValue / recipients.length;
            for (uint i = 0; i < recipients.length; i++) {
              payable(recipients[i]).transfer(share);
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report msg.value in condition only', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(address[] memory recipients) public payable {
            for (uint i = 0; i < recipients.length && msg.value > 0; i++) {
              // No msg.value usage in body
              recipients[i];
            }
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
          function simple() public payable {
            uint value = msg.value;
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
