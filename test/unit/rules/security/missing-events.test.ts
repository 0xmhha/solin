/**
 * Missing Events Security Rule Tests
 */

import { MissingEventsRule } from '@/rules/security/missing-events';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MissingEventsRule', () => {
  let rule: MissingEventsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MissingEventsRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/missing-events');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect missing event in owner change', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          function setOwner(address _owner) external {
            owner = _owner;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('event');
    });

    test('should detect missing event in configuration change', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public fee;
          function setFee(uint _fee) external {
            fee = _fee;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect missing event in admin assignment', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public admin;
          constructor(address _admin) {
            admin = _admin;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect missing event with multiple state changes', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          address public admin;
          function updateAddresses(address _owner, address _admin) external {
            owner = _owner;
            admin = _admin;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(1); // Report once per function
    });

    test('should detect missing event in pause state change', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          bool public paused;
          function pause() external {
            paused = true;
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
    test('should not report when event is emitted', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          event OwnerChanged(address indexed newOwner);
          function setOwner(address _owner) external {
            owner = _owner;
            emit OwnerChanged(_owner);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report when event is emitted in constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          address public owner;
          event OwnerSet(address indexed owner);
          constructor(address _owner) {
            owner = _owner;
            emit OwnerSet(_owner);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report view functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function getValue() external view returns (uint) {
            return value;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report pure functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function calculate(uint a, uint b) external pure returns (uint) {
            return a + b;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report internal functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint internal value;
          function _setValue(uint _value) internal {
            value = _value;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report private functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint private data;
          function _updateData(uint _data) private {
            data = _data;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report functions without state changes', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          event Log(string message);
          function log(string memory message) external {
            emit Log(message);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report functions with only local variable assignments', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function process(uint amount) external pure returns (uint) {
            uint result = amount * 2;
            return result;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without state changes', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public constant MAX = 100;
          function getMax() external pure returns (uint) {
            return MAX;
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
