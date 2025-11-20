/**
 * Array Length Manipulation Security Rule Tests
 *
 * Testing detection of direct manipulation of array.length
 */

import { ArrayLengthManipulationRule } from '@/rules/security/array-length-manipulation';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ArrayLengthManipulationRule', () => {
  let rule: ArrayLengthManipulationRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ArrayLengthManipulationRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/array-length-manipulation');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('direct array.length manipulation', () => {
    test('should detect direct assignment to array.length', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256[] public data;

          function shrinkArray(uint256 newLength) public {
            data.length = newLength; // Direct manipulation
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/array.length|manipulation/i);
    });

    test('should detect array.length decrement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          address[] public users;

          function removeLastUser() public {
            users.length--; // Direct manipulation
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect array.length increment', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256[] public numbers;

          function addSlot() public {
            numbers.length++; // Direct manipulation
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

  describe('valid array operations', () => {
    test('should not report array.push()', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256[] public data;

          function addData(uint256 value) public {
            data.push(value);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report array.pop()', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256[] public data;

          function removeData() public {
            data.pop();
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report reading array.length', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256[] public data;

          function getLength() public view returns (uint256) {
            return data.length; // Reading is OK
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

    test('should detect multiple array.length manipulations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256[] public data1;
          uint256[] public data2;

          function manipulate() public {
            data1.length = 0;
            data2.length = 10;
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
});
