/**
 * Unchecked Calls Rule Tests
 *
 * Testing detection of unchecked low-level calls
 */

import { UncheckedCallsRule } from '@/rules/security/unchecked-calls';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UncheckedCallsRule', () => {
  let rule: UncheckedCallsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UncheckedCallsRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unchecked-calls');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('.call() detection', () => {
    test('should not report issue for checked .call()', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract SafeContract {
          function safeCall(address target) public {
            (bool success, ) = target.call("");
            require(success, "Call failed");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for unchecked .call()', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract VulnerableContract {
          function unsafeCall(address target) public {
            target.call("");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('security/unchecked-calls');
      expect(issues[0]?.severity).toBe(Severity.ERROR);
      expect(issues[0]?.message).toContain('call');
      expect(issues[0]?.message.toLowerCase()).toContain('return');
    });

    test('should not report issue for .call() checked with if statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract SafeContract {
          function safeCall(address target) public {
            (bool success, ) = target.call("");
            if (!success) {
              revert("Call failed");
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for .call() checked with assert', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract SafeContract {
          function safeCall(address target) public {
            (bool success, ) = target.call("");
            assert(success);
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

  describe('.delegatecall() detection', () => {
    test('should report issue for unchecked .delegatecall()', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract VulnerableContract {
          function unsafeDelegateCall(address target) public {
            target.delegatecall("");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('delegatecall');
    });

    test('should not report issue for checked .delegatecall()', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract SafeContract {
          function safeDelegateCall(address target) public {
            (bool success, ) = target.delegatecall("");
            require(success);
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

  describe('.send() detection', () => {
    test('should report issue for unchecked .send()', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract VulnerableContract {
          function unsafeSend(address payable recipient) public {
            recipient.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('send');
    });

    test('should not report issue for checked .send()', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract SafeContract {
          function safeSend(address payable recipient) public {
            bool success = recipient.send(1 ether);
            require(success, "Send failed");
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

  describe('Multiple violations', () => {
    test('should report multiple issues for multiple unchecked calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MultipleVulnerabilities {
          function multipleUnchecked(address target, address payable recipient) public {
            target.call("");
            target.delegatecall("");
            recipient.send(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(3);
      expect(issues.every(issue => issue.ruleId === 'security/unchecked-calls')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle .transfer() (does not need checking)', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract TransferContract {
          function useTransfer(address payable recipient) public {
            recipient.transfer(1 ether);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // .transfer() reverts on failure, so it's safe
      expect(issues).toHaveLength(0);
    });

    test('should handle return value used in expression', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract ExpressionCheck {
          function checkInExpression(address target) public returns (bool) {
            (bool success, ) = target.call("");
            return success;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Return value is used, so it's checked
      expect(issues).toHaveLength(0);
    });

    test('should handle contract without low-level calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoLowLevelCalls {
          uint256 public value;

          function setValue(uint256 newValue) public {
            value = newValue;
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
