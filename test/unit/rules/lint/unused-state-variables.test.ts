/**
 * Unused State Variables Rule Tests
 *
 * Testing detection of unused state variables (gas waste + code quality)
 */

import { UnusedStateVariablesRule } from '@/rules/lint/unused-state-variables';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UnusedStateVariablesRule', () => {
  let rule: UnusedStateVariablesRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UnusedStateVariablesRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/unused-state-variables');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('unused state variables', () => {
    test('should detect completely unused private state variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private unusedVar;  // Never used

          function getValue() public pure returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('unusedVar');
      expect(issues[0]?.message).toMatch(/unused/i);
    });

    test('should detect multiple unused state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private unused1;
          address private unused2;
          bool private unused3;

          function test() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(3);
      expect(issues.some((i) => i.message.includes('unused1'))).toBe(true);
      expect(issues.some((i) => i.message.includes('unused2'))).toBe(true);
      expect(issues.some((i) => i.message.includes('unused3'))).toBe(true);
    });

    test('should detect unused constant variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private constant UNUSED_CONST = 100;

          function test() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('UNUSED_CONST');
    });
  });

  describe('used state variables', () => {
    test('should not report variable used in function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private counter;

          function increment() public {
            counter++;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report variable read in function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private value = 100;

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

    test('should not report public variable (auto-generated getter)', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 public value;  // Has automatic getter

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report variable used in event', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private counter;

          event CounterChanged(uint256 newValue);

          function setCounter(uint256 _value) public {
            counter = _value;
            emit CounterChanged(counter);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report variable used in modifier', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          address private owner;

          modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
          }

          function restricted() public onlyOwner {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report variable used in constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          address private owner;

          constructor() {
            owner = msg.sender;
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

  describe('complex usage patterns', () => {
    test('should handle struct member variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          struct Data {
            uint256 value;
            address owner;
          }

          Data private data;  // Used

          function setData(uint256 _value) public {
            data.value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle mapping variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          mapping(address => uint256) private balances;  // Used

          function getBalance(address user) public view returns (uint256) {
            return balances[user];
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle array variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256[] private items;  // Used

          function addItem(uint256 item) public {
            items.push(item);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should detect unused among multiple variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private used1;
          uint256 private unused;  // This one is unused
          uint256 private used2;

          function test() public {
            used1 = 1;
            used2 = 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('unused');
    });
  });

  describe('edge cases', () => {
    test('should handle contract with no state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function test() public pure returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle variable used in return statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private constant MAX_VALUE = 1000;

          function getMax() public pure returns (uint256) {
            return MAX_VALUE;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle variable used in require statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private constant MIN_VALUE = 10;

          function validate(uint256 value) public pure {
            require(value >= MIN_VALUE, "Too small");
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
