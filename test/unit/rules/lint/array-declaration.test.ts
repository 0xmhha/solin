/**
 * Array Declaration Rule Tests
 *
 * Testing consistent array declaration style enforcement
 */

import { ArrayDeclarationRule } from '@/rules/lint/array-declaration';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ArrayDeclarationRule', () => {
  let rule: ArrayDeclarationRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ArrayDeclarationRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/array-declaration');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Array declaration style', () => {
    test('should not report issue for consistent type[] style', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            uint256[] public items;
            address[] private users;

            function test() public {
                string[] memory names;
                bytes32[] storage data;
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for multi-dimensional arrays', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            uint256[][] public matrix;
            address[][][] public cube;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle dynamic and fixed-size arrays', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            uint256[10] public fixedArray;
            uint256[] public dynamicArray;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle arrays in function parameters', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function process(uint256[] memory items) public {
            }

            function getItems() public returns (uint256[] memory) {
                return new uint256[](10);
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle array of structs', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            struct Item {
                uint256 id;
                string name;
            }

            Item[] public items;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle complex nested arrays', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            mapping(address => uint256[][]) public nestedData;
            mapping(bytes32 => address[]) public addressData;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle arrays in returns', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function getArray() external pure returns (uint256[] memory) {
                return new uint256[](5);
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle arrays without location info', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            mapping(uint256 => uint256[]) public data;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      // Should not crash
      const issues = context.getIssues();
      expect(Array.isArray(issues)).toBe(true);
    });
  });
});
