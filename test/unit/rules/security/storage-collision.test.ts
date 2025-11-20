/**
 * Storage Collision Security Rule Tests
 */

import { StorageCollisionRule } from '@/rules/security/storage-collision';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('StorageCollisionRule', () => {
  let rule: StorageCollisionRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new StorageCollisionRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/storage-collision');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect storage collision in inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Base {
          uint public value;
        }

        contract Derived is Base {
          uint public value;
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('storage collision');
    });

    test('should detect proxy pattern without EIP-1967', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Proxy {
          address public implementation;

          function upgradeImplementation(address newImplementation) public {
            implementation = newImplementation;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect delegatecall without storage collision consideration', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Proxy {
          uint public value;

          function execute(address target, bytes memory data) public {
            (bool success, ) = target.delegatecall(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple state variables with upgrade function', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract UpgradeableContract {
          uint public value1;
          uint public value2;

          function upgradeContract(address newImpl) public {
            // upgrade logic
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

  describe('safe patterns', () => {
    test('should allow minimal proxy contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract MinimalProxy {
          fallback() external payable {
            assembly {
              calldatacopy(0, 0, calldatasize())
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report storage gap pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract UpgradeableBase {
          uint public value1;
          uint public value2;
          uint[48] private __gap;
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contracts without inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Simple {
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

    test('should not report OpenZeppelin Initializable pattern', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Initializable {
          uint8 private _initialized;
          bool private _initializing;
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
