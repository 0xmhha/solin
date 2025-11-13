/**
 * Unchecked Send Security Rule Tests
 */

import { UncheckedSendRule } from '@/rules/security/unchecked-send';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UncheckedSendRule', () => {
  let rule: UncheckedSendRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UncheckedSendRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unchecked-send');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect unchecked send in statement', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw(address payable recipient, uint amount) public {
            recipient.send(amount);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('send');
    });

    test('should detect unchecked send with value', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw() public {
            payable(msg.sender).send(100 ether);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect unchecked send in expression', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address payable addr) public {
            uint x = 1;
            addr.send(1 ether);
            x = 2;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect unchecked send assigned to variable but not checked', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw(address payable recipient) public {
            bool success = recipient.send(1 ether);
            // success is not checked - should warn, but requires tracking variable usage
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple unchecked sends', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function multiSend(address payable a, address payable b) public {
            a.send(1 ether);
            b.send(2 ether);
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
    test('should not report send with require check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw(address payable recipient, uint amount) public {
            require(recipient.send(amount), "Send failed");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report send with assert check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw(address payable recipient) public {
            assert(recipient.send(1 ether));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report send with if statement check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw(address payable recipient) public {
            if (recipient.send(1 ether)) {
              // success
            } else {
              revert("Send failed");
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report send checked with boolean variable', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw(address payable recipient) public {
            bool success = recipient.send(1 ether);
            require(success, "Send failed");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report send in ternary expression', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address payable addr) public pure returns (string memory) {
            return addr.send(1 ether) ? "success" : "failed";
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report transfer (different method)', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function withdraw(address payable recipient) public {
            recipient.transfer(1 ether);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without send calls', async () => {
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
