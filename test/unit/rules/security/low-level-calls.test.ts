/**
 * Low Level Calls Security Rule Tests
 *
 * Testing detection of low-level calls (call, delegatecall, staticcall)
 */

import { LowLevelCallsRule } from '@/rules/security/low-level-calls';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('LowLevelCallsRule', () => {
  let rule: LowLevelCallsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new LowLevelCallsRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/low-level-calls');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('low-level call usage', () => {
    test('should detect .call() usage', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function sendEther(address payable target) public payable {
            (bool success, ) = target.call{value: msg.value}("");
            require(success);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/low.level|call/i);
    });

    test('should detect .delegatecall() usage', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function delegateExecute(address target, bytes memory data) public {
            (bool success, ) = target.delegatecall(data);
            require(success);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect .staticcall() usage', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function staticExecute(address target, bytes memory data) public view returns (bytes memory) {
            (bool success, bytes memory result) = target.staticcall(data);
            require(success);
            return result;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple low-level calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function multiCall(address target1, address target2) public {
            target1.call("");
            target2.delegatecall("");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('safe alternatives', () => {
    test('should not report regular function calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function regularCall(address target) public {
            OtherContract(target).someFunction();
          }
        }

        interface OtherContract {
          function someFunction() external;
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
    test('should handle empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {
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
