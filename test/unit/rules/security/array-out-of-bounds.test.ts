/**
 * Array Out of Bounds Security Rule Tests
 *
 * Tests detection of potential array access out of bounds
 */

import { ArrayOutOfBoundsRule } from '@/rules/security/array-out-of-bounds';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ArrayOutOfBoundsRule', () => {
  let rule: ArrayOutOfBoundsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ArrayOutOfBoundsRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/array-out-of-bounds');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous patterns', () => {
    test('should detect array access without bounds check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function getElement(uint index) public view returns (uint) {
            return data[index];
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('bounds');
    });

    test('should detect unchecked array write', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function setElement(uint index, uint value) public {
            data[index] = value;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect array access with user input', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address[] public users;

          function getUser(uint userId) public view returns (address) {
            return users[userId];
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple unchecked accesses', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function multiAccess(uint i, uint j) public view returns (uint) {
            return data[i] + data[j];
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThanOrEqual(2);
    });

    test('should detect array access in loop without check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;
          uint[] public indices;

          function processData() public view returns (uint sum) {
            for (uint i = 0; i < indices.length; i++) {
              sum += data[indices[i]];
            }
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
    test('should not report array access with bounds check using require', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function getElement(uint index) public view returns (uint) {
            require(index < data.length, "Index out of bounds");
            return data[index];
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report array access with if check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function getElement(uint index) public view returns (uint) {
            if (index < data.length) {
              return data[index];
            }
            return 0;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report loop with length check', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function sumAll() public view returns (uint sum) {
            for (uint i = 0; i < data.length; i++) {
              sum += data[i];
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without array access', async () => {
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

    test('should not report mapping access', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) public balances;

          function getBalance(address user) public view returns (uint) {
            return balances[user];
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
