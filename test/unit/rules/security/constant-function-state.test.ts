/**
 * Constant Function State Change Security Rule Tests
 *
 * Tests detection of state changes in constant/pure/view functions
 */

import { ConstantFunctionStateRule } from '@/rules/security/constant-function-state';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ConstantFunctionStateRule', () => {
  let rule: ConstantFunctionStateRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ConstantFunctionStateRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/constant-function-state');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous patterns', () => {
    test('should detect state change in view function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;

          function getValue() public view returns (uint) {
            value = 100;
            return value;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('view');
    });

    test('should detect state change in pure function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;

          function calculate(uint x) public pure returns (uint) {
            value = x;
            return x * 2;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect assignment in view function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) public balances;

          function getBalance(address user) public view returns (uint) {
            balances[user] = 100;
            return balances[user];
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect compound assignment in view function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public counter;

          function getCounter() public view returns (uint) {
            counter += 1;
            return counter;
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
    test('should not report pure function without state changes', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function add(uint a, uint b) public pure returns (uint) {
            return a + b;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report view function reading state', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
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

    test('should not report local variable assignment in pure function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function calculate(uint x) public pure returns (uint) {
            uint result = x * 2;
            return result;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report non-view/pure function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
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

    test('should not report contract without view/pure functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;

          function doSomething() public {
            value = 42;
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
