/**
 * Shadowing Variables Security Rule Tests
 *
 * Testing detection of variable shadowing in inheritance chains
 */

import { ShadowingVariablesRule } from '@/rules/security/shadowing-variables';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ShadowingVariablesRule', () => {
  let rule: ShadowingVariablesRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ShadowingVariablesRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/shadowing-variables');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('state variable shadowing', () => {
    test('should detect state variable shadowing parent state variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Parent {
          uint256 public value;
        }

        contract Child is Parent {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/shadow/i);
      expect(issues[0]?.message).toMatch(/value/i);
    });

    test('should detect multiple shadowed variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          uint256 public count;
          address public owner;
        }

        contract Derived is Base {
          uint256 public count;
          address public owner;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });

    test('should detect shadowing across multiple inheritance levels', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract GrandParent {
          uint256 public data;
        }

        contract Parent is GrandParent {
          // No shadowing here
        }

        contract Child is Parent {
          uint256 public data;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/data/i);
    });

    test('should detect shadowing with different visibility', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          uint256 public value;
        }

        contract Derived is Base {
          uint256 private value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('local variable shadowing', () => {
    test('should detect local variable shadowing parent state variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          uint256 public value;
        }

        contract Derived is Base {
          function test() public {
            uint256 value = 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect function parameter shadowing parent state variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          address public owner;
        }

        contract Derived is Base {
          function setOwner(address owner) public {
            // parameter shadows state variable
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/owner/i);
    });

    test('should detect multiple local variables shadowing', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          uint256 public count;
          address public addr;
        }

        contract Derived is Base {
          function process(uint256 count) public {
            address addr = msg.sender;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });
  });

  describe('safe patterns', () => {
    test('should not report when no inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Standalone {
          uint256 public value;

          function test() public {
            uint256 value = 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Local variable shadowing own state variable is acceptable
      expect(issues).toHaveLength(0);
    });

    test('should not report when no name conflicts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          uint256 public value;
        }

        contract Derived is Base {
          uint256 public amount;

          function test(uint256 price) public {
            uint256 total = value + amount + price;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report for different contracts without inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract ContractA {
          uint256 public value;
        }

        contract ContractB {
          uint256 public value;
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
    test('should handle contract without state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          function getValue() public pure returns (uint256) {
            return 42;
          }
        }

        contract Derived is Base {
          function test() public pure returns (uint256) {
            return getValue();
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle multiple inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract BaseA {
          uint256 public valueA;
        }

        contract BaseB {
          uint256 public valueB;
        }

        contract Derived is BaseA, BaseB {
          uint256 public valueA;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle deep inheritance chains', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Level1 {
          uint256 public data;
        }

        contract Level2 is Level1 {
        }

        contract Level3 is Level2 {
        }

        contract Level4 is Level3 {
          uint256 public data;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contracts with no inheritance specified', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Simple {
          uint256 public value;
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
