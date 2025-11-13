/**
 * Assert State Change Security Rule Tests
 */

import { AssertStateChangeRule } from '@/rules/security/assert-state-change';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('AssertStateChangeRule', () => {
  let rule: AssertStateChangeRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new AssertStateChangeRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/assert-state-change');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect assert with assignment', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function test() public {
            assert(value = 5);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('assert');
      expect(issues[0]?.message).toContain('state change');
    });

    test('should detect assert with transfer', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address payable recipient) public payable {
            assert(recipient.transfer(1 ether));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assert with send', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address payable recipient) public payable {
            assert(recipient.send(1 ether));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assert with function call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function changeState() internal returns (bool) {
            return true;
          }
          function test() public {
            assert(changeState());
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assert with increment', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public counter;
          function test() public {
            assert(counter++ < 10);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect assert with decrement', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public counter;
          function test() public {
            assert(--counter > 0);
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
    test('should not report assert with pure comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function test() public view {
            assert(value > 0);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report assert with equality check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function test() public view {
            assert(value == 10);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should report assert with any function call (conservative approach)', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function isPure(uint x) internal pure returns (bool) {
            return x > 0;
          }
          function test(uint x) public pure {
            assert(isPure(x));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      // Conservative: report all function calls as potentially state-changing
      // Users should verify if function is truly pure
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should not report assert with boolean literal', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test() public pure {
            assert(true);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without assert', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function test() public {
            require(value > 0, "Invalid value");
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
