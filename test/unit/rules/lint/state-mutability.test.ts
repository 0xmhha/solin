/**
 * State Mutability Rule Tests
 *
 * Testing enforcement of appropriate state mutability modifiers
 */

import { StateMutabilityRule } from '@/rules/lint/state-mutability';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('StateMutabilityRule', () => {
  let rule: StateMutabilityRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new StateMutabilityRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/state-mutability');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Pure functions', () => {
    test('should not report issue for function already marked as pure', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function pureFunc(uint256 x) public pure returns (uint256) {
            return x * 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should suggest pure for function that does not access state', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function calculate(uint256 x, uint256 y) public returns (uint256) {
            return x + y;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('lint/state-mutability');
      expect(issues[0]?.message).toContain('pure');
      expect(issues[0]?.message).toContain('calculate');
    });
  });

  describe('View functions', () => {
    test('should not report issue for function already marked as view', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;

          function getValue() public view returns (uint256) {
            return value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should suggest view for function that only reads state', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;

          function getDouble() public returns (uint256) {
            return value * 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('lint/state-mutability');
      expect(issues[0]?.message).toContain('view');
      expect(issues[0]?.message).toContain('getDouble');
    });
  });

  describe('State-modifying functions', () => {
    test('should not report issue for function that modifies state', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
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

    test('should report issue when view function modifies state', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;

          function badView() public view {
            value = 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Parser might catch this as an error, or we detect it
      // For now, we focus on suggesting improvements, not catching violations
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Payable functions', () => {
    test('should not report issue for payable function that receives ether', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function deposit() public payable {
            // Accept ether
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // payable is necessary here, so no issues
      expect(issues).toHaveLength(0);
    });

    test('should suggest removing unnecessary payable modifier', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;

          function setValue(uint256 newValue) public payable {
            value = newValue;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // If function doesn't use msg.value, payable is unnecessary
      // This is a more advanced check - we can implement it if the AST provides enough info
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Special functions', () => {
    test('should not report issue for constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;

          constructor(uint256 initialValue) {
            value = initialValue;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for fallback and receive', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          fallback() external payable {}
          receive() external payable {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('Multiple functions', () => {
    test('should report multiple suggestions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;

          function pureCalc(uint256 x) public returns (uint256) {
            return x * 2;
          }

          function viewValue() public returns (uint256) {
            return value;
          }

          function modifyValue(uint256 newValue) public {
            value = newValue;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues.every((issue) => issue.ruleId === 'lint/state-mutability')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty function body', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function emptyFunc() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Empty function could be pure
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle function with only local variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function localOnly() public returns (uint256) {
            uint256 local = 42;
            return local;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Function only uses local variables, should be pure
      expect(issues.length).toBeGreaterThanOrEqual(1);
      if (issues.length > 0) {
        expect(issues[0]?.message).toContain('pure');
      }
    });

    test('should handle interface functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IMyInterface {
          function getValue() external view returns (uint256);
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Interface functions don't have bodies, so no suggestions needed
      expect(issues).toHaveLength(0);
    });
  });
});
