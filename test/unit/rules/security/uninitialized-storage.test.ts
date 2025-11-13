/**
 * Uninitialized Storage Security Rule Tests
 *
 * Testing detection of uninitialized local storage pointers
 */

import { UninitializedStorageRule } from '@/rules/security/uninitialized-storage';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UninitializedStorageRule', () => {
  let rule: UninitializedStorageRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UninitializedStorageRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/uninitialized-storage');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous uninitialized storage patterns', () => {
    test('should detect uninitialized storage struct', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Vulnerable {
          struct User {
            address addr;
            uint256 balance;
          }

          User[] public users;

          function addUser() public {
            User storage user;
            user.addr = msg.sender;
            user.balance = 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/uninitialized/i);
      expect(issues[0]?.message).toMatch(/storage/i);
    });

    test('should detect uninitialized storage array', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Vulnerable {
          uint256[] public data;

          function manipulateArray() public {
            uint256[] storage arr;
            arr.push(100);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect storage pointer without initialization', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Vulnerable {
          struct Item {
            uint256 id;
            string name;
          }

          mapping(uint256 => Item) public items;

          function updateItem(uint256 itemId) public {
            Item storage item;
            item.id = itemId;
            item.name = "Updated";
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple uninitialized storage variables', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Vulnerable {
          struct Data {
            uint256 value;
          }

          Data[] public dataArray;

          function process() public {
            Data storage data1;
            Data storage data2;
            data1.value = 1;
            data2.value = 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });

    test('should detect uninitialized storage in private function', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Vulnerable {
          struct Config {
            bool enabled;
          }

          Config public config;

          function _updateConfig() private {
            Config storage cfg;
            cfg.enabled = true;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect uninitialized storage in internal function', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Vulnerable {
          uint256[] internal numbers;

          function internalProcess() internal {
            uint256[] storage nums;
            nums.push(42);
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

  describe('safe storage patterns', () => {
    test('should not report memory variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          struct User {
            address addr;
            uint256 balance;
          }

          function createUser() public pure returns (User memory) {
            User memory user;
            user.addr = address(0);
            user.balance = 0;
            return user;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report initialized storage pointers', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Safe {
          struct Item {
            uint256 id;
          }

          mapping(uint256 => Item) public items;

          function updateItem(uint256 itemId) public {
            Item storage item = items[itemId];
            item.id = itemId;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report storage pointers with explicit initialization', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Safe {
          uint256[] public data;

          function process() public {
            uint256[] storage arr = data;
            arr.push(100);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle contract without storage pointers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoStorage {
          uint256 public value;

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
  });

  describe('edge cases', () => {
    test('should handle multiple contracts', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract ContractA {
          struct Data {
            uint256 value;
          }

          Data[] public dataArray;

          function process() public {
            Data storage data;
            data.value = 1;
          }
        }

        contract ContractB {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(1); // Only in ContractA
    });

    test('should handle complex struct types', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract Complex {
          struct Inner {
            uint256 value;
          }

          struct Outer {
            Inner inner;
            uint256 data;
          }

          Outer[] public items;

          function update() public {
            Outer storage item;
            item.data = 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle storage variables in loops', async () => {
      const source = `
        pragma solidity ^0.4.24;

        contract LoopStorage {
          struct Item {
            uint256 value;
          }

          Item[] public items;

          function processItems() public {
            for (uint i = 0; i < 10; i++) {
              Item storage item;
              item.value = i;
            }
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
});
