/**
 * Avoid Call Value Rule Tests
 *
 * Testing flagging of deprecated .call.value() syntax
 */

import { AvoidCallValueRule } from '@/rules/lint/avoid-call-value';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('AvoidCallValueRule', () => {
  let rule: AvoidCallValueRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new AvoidCallValueRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/avoid-call-value');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Valid cases - modern syntax', () => {
    test('should not report issue for modern .call{value: }() syntax', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(address payable target) public payable {
            (bool success, ) = target.call{value: msg.value}("");
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

    test('should not report issue for transfer', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(address payable target) public payable {
            target.transfer(msg.value);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for send', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(address payable target) public payable {
            bool success = target.send(msg.value);
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

    test('should not report issue for regular call without value', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(address target) public {
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
  });

  describe('Invalid cases - deprecated .call.value() syntax', () => {
    test('should report issue for .call.value() syntax', async () => {
      const source = `
        pragma solidity ^0.5.0;

        contract MyContract {
          function test(address target) public payable {
            bool success = target.call.value(msg.value)("");
            require(success, "Call failed");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('lint/avoid-call-value');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('call.value');
    });

    test('should report issue for .call.gas().value() syntax', async () => {
      const source = `
        pragma solidity ^0.5.0;

        contract MyContract {
          function test(address target) public payable {
            bool success = target.call.gas(100000).value(msg.value)("");
            require(success, "Call failed");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge cases', () => {
    test('should handle contracts with both old and new syntax', async () => {
      const source = `
        pragma solidity ^0.5.0;

        contract MyContract {
          function oldWay(address target) public payable {
            target.call.value(msg.value)("");
          }

          function newWay(address target) public payable {
            target.call{value: msg.value}("");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should only flag the old syntax
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    test('should not flag .value in other contexts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          struct Data {
            uint256 value;
          }

          function test() public {
            Data memory data;
            uint256 x = data.value;
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
