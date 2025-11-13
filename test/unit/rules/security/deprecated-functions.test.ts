/**
 * Deprecated Functions Security Rule Tests
 */

import { DeprecatedFunctionsRule } from '@/rules/security/deprecated-functions';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('DeprecatedFunctionsRule', () => {
  let rule: DeprecatedFunctionsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new DeprecatedFunctionsRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/deprecated-functions');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect suicide() usage', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Test {
          function destroy() public {
            suicide(msg.sender);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('suicide');
    });

    test('should detect throw usage', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Test {
          function check(uint x) public {
            if (x == 0) {
              throw;
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect sha3() usage', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Test {
          function hash(bytes memory data) public pure returns (bytes32) {
            return sha3(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect callcode() usage', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Test {
          function execute(address target, bytes memory data) public {
            target.callcode(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect constant function modifier', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Test {
          function getValue() public constant returns (uint) {
            return 42;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple deprecated functions', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Test {
          function hash1(bytes memory data) public pure returns (bytes32) {
            return sha3(data);
          }
          function hash2(bytes memory data) public pure returns (bytes32) {
            return sha3(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });

    test('should detect mixed deprecated patterns', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Test {
          function destroy() public {
            suicide(msg.sender);
          }
          function hash(bytes memory data) public pure returns (bytes32) {
            return sha3(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(1);
    });
  });

  describe('safe patterns', () => {
    test('should not report selfdestruct()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function destroy() public {
            selfdestruct(payable(msg.sender));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report revert()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(uint x) public pure {
            if (x == 0) {
              revert("Invalid value");
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report keccak256()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function hash(bytes memory data) public pure returns (bytes32) {
            return keccak256(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report delegatecall()', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function execute(address target, bytes memory data) public {
            target.delegatecall(data);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report view modifier', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function getValue() public view returns (uint) {
            return 42;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report pure modifier', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function calculate(uint x) public pure returns (uint) {
            return x * 2;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without deprecated functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function setValue(uint v) public {
            value = v;
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
