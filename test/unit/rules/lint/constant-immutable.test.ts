/**
 * Constant Immutable Rule Tests
 *
 * Testing detection of state variables that should be constant or immutable
 */

import { ConstantImmutableRule } from '@/rules/lint/constant-immutable';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ConstantImmutableRule', () => {
  let rule: ConstantImmutableRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ConstantImmutableRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/constant-immutable');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('constant suggestions', () => {
    test('should suggest constant for variable initialized at declaration', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 fee = 100;  // Should be constant

          function getFee() public view returns (uint256) {
            return fee;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/constant/i);
      expect(issues[0]?.message).toContain('fee');
    });

    test('should suggest constant for multiple initialized variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 fee = 100;
          uint256 rate = 50;
          address owner = 0x1234567890123456789012345678901234567890;

          function getValues() public view returns (uint256, uint256, address) {
            return (fee, rate, owner);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(3);
      expect(issues.every(i => i.message.includes('constant'))).toBe(true);
    });

    test('should not suggest constant for already constant variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 constant FEE = 100;

          function getFee() public pure returns (uint256) {
            return FEE;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not suggest constant for variables modified in functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 counter = 0;

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
  });

  describe('immutable suggestions', () => {
    test('should suggest immutable for variable assigned only in constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          address owner;  // Should be immutable

          constructor(address _owner) {
            owner = _owner;
          }

          function getOwner() public view returns (address) {
            return owner;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/immutable/i);
      expect(issues[0]?.message).toContain('owner');
    });

    test('should suggest immutable for multiple constructor-assigned variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          address owner;
          uint256 createdAt;

          constructor(address _owner) {
            owner = _owner;
            createdAt = block.timestamp;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(2);
      expect(issues.every(i => i.message.includes('immutable'))).toBe(true);
    });

    test('should not suggest immutable for already immutable variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          address immutable owner;

          constructor(address _owner) {
            owner = _owner;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not suggest immutable for variables modified in functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          address owner;

          constructor(address _owner) {
            owner = _owner;
          }

          function transferOwnership(address newOwner) public {
            owner = newOwner;
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
    test('should not suggest for uninitialized variables without constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 value;

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

    test('should handle contract without state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          function calculate(uint256 a, uint256 b) public pure returns (uint256) {
            return a + b;
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

        contract Test {
          uint256 fee = 100;

          function getFee() public view returns (uint256) {
            return fee;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toMatch(/constant/i);
    });

    test('should handle private and public variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 private privateFee = 100;
          uint256 public publicFee = 200;

          function getFees() public view returns (uint256, uint256) {
            return (privateFee, publicFee);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(2);
    });

    test('should handle variables with complex expressions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 fee = 100 * 2;
          uint256 rate = 50 + 25;

          function getValues() public view returns (uint256, uint256) {
            return (fee, rate);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(2);
      expect(issues.every(i => i.message.includes('constant'))).toBe(true);
    });
  });

  describe('mixed scenarios', () => {
    test('should distinguish between constant, immutable, and mutable variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 alreadyConstant = 100;  // Already constant in real usage
          address shouldBeImmutable;       // Should be immutable
          uint256 mutableValue;            // Should remain mutable

          constructor(address _owner) {
            shouldBeImmutable = _owner;
          }

          function updateValue(uint256 newValue) public {
            mutableValue = newValue;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(2); // alreadyConstant and shouldBeImmutable

      const constantIssue = issues.find(i => i.message.includes('alreadyConstant'));
      const immutableIssue = issues.find(i => i.message.includes('shouldBeImmutable'));

      expect(constantIssue?.message).toMatch(/constant/i);
      expect(immutableIssue?.message).toMatch(/immutable/i);
    });

    test('should handle multiple assignments in constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          address owner;
          uint256 createdAt;

          constructor(address _owner) {
            owner = _owner;
            createdAt = block.timestamp;

            // Multiple statements, but only one assignment per variable
            require(owner != address(0), "Invalid owner");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(2);
      expect(issues.every(i => i.message.includes('immutable'))).toBe(true);
    });

    test('should not suggest immutable for variables with declaration initialization and constructor assignment', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 value = 100;

          constructor() {
            value = 200;  // Modified in constructor, so not constant/immutable
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should not suggest anything because it's assigned in both places
      expect(issues).toHaveLength(0);
    });
  });

  describe('gas optimization guidance', () => {
    test('should provide gas optimization information in messages', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Test {
          uint256 fee = 100;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/gas/i);
    });
  });
});
