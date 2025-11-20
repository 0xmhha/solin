/**
 * Storage Array Delete Security Rule Tests
 *
 * Tests detection of dangerous delete operations on storage arrays
 */

import { StorageArrayDeleteRule } from '@/rules/security/storage-array-delete';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('StorageArrayDeleteRule', () => {
  let rule: StorageArrayDeleteRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new StorageArrayDeleteRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/storage-array-delete');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous patterns', () => {
    test('should detect delete on storage array', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function removeData() public {
            delete data;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('delete');
    });

    test('should detect delete on storage array element', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function removeElement(uint index) public {
            delete data[index];
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect delete on struct array', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          struct Item { uint id; string name; }
          Item[] public items;

          function clearItems() public {
            delete items;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect delete on address array', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address[] public users;

          function clearUsers() public {
            delete users;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple delete operations', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;
          address[] public users;

          function clearAll() public {
            delete data;
            delete users;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('safe patterns', () => {
    test('should not report delete on single variables', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;

          function resetValue() public {
            delete value;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report delete on mappings', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          mapping(address => uint) public balances;

          function resetBalance(address user) public {
            delete balances[user];
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report pop operation', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function removeLastElement() public {
            data.pop();
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without delete', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint[] public data;

          function addData(uint value) public {
            data.push(value);
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
