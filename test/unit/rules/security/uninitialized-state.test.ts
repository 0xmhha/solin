/**
 * Uninitialized State Variables Security Rule Tests
 *
 * Testing detection of uninitialized state variables that may lead to unexpected behavior
 */

import { UninitializedStateRule } from '@/rules/security/uninitialized-state';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UninitializedStateRule', () => {
  let rule: UninitializedStateRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UninitializedStateRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/uninitialized-state');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('uninitialized state variables', () => {
    test('should detect uninitialized state variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Uninitialized {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/uninitialized/i);
      expect(issues[0]?.message).toMatch(/value/i);
    });

    test('should detect multiple uninitialized variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Multiple {
          uint256 public count;
          address public owner;
          bool public active;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(3);
    });

    test('should detect uninitialized address variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract AddressTest {
          address public owner;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/owner/i);
    });

    test('should detect uninitialized bool variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract BoolTest {
          bool public flag;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect uninitialized struct variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract StructTest {
          struct Data {
            uint256 value;
            address owner;
          }

          Data public data;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect variable not initialized in constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoConstructorInit {
          uint256 public value;
          address public owner;

          constructor() {
            // value is not initialized
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });

    test('should detect partially initialized variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract PartialInit {
          uint256 public value;
          address public owner;

          constructor() {
            owner = msg.sender;
            // value is not initialized
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.message).toMatch(/value/i);
    });
  });

  describe('properly initialized variables', () => {
    test('should not report variable initialized at declaration', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Initialized {
          uint256 public value = 100;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report variable initialized in constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract ConstructorInit {
          uint256 public value;

          constructor() {
            value = 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report constant variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Constants {
          uint256 public constant MAX_VALUE = 1000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report immutable variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Immutables {
          uint256 public immutable deployTime;

          constructor() {
            deployTime = block.timestamp;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report all variables initialized', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract AllInitialized {
          uint256 public value = 100;
          address public owner;
          bool public active = true;

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

  describe('edge cases', () => {
    test('should handle contract without state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoState {
          function getValue() public pure returns (uint256) {
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

    test('should handle contract without constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoConstructor {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle multiple contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract First {
          uint256 public value;
        }

        contract Second {
          address public owner = address(0x123);
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(1); // Only First.value
    });

    test('should handle array and mapping variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Collections {
          uint256[] public numbers;
          mapping(address => uint256) public balances;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Arrays and mappings have default initialization, but still report as uninitialized
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
