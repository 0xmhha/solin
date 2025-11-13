/**
 * Unsafe Cast Security Rule Tests
 */

import { UnsafeCastRule } from '@/rules/security/unsafe-cast';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UnsafeCastRule', () => {
  let rule: UnsafeCastRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UnsafeCastRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unsafe-cast');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect unsafe downcast from uint256 to uint8', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(uint256 value) public pure returns (uint8) {
            return uint8(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('downcast');
    });

    test('should detect unsafe downcast from uint256 to uint128', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(uint256 value) public pure returns (uint128) {
            return uint128(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect unsafe downcast from int256 to int8', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(int256 value) public pure returns (int8) {
            return int8(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect unsafe cast in assignment', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(uint256 large) public pure {
            uint8 small = uint8(large);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect unsafe cast in expression', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(uint256 value) public pure returns (uint16) {
            return uint16(value) + 100;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple unsafe casts', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(uint256 a, uint256 b) public pure returns (uint8, uint16) {
            return (uint8(a), uint16(b));
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });
  });

  describe('safe patterns', () => {
    test('should not report safe upcast from uint8 to uint256', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(uint8 value) public pure returns (uint256) {
            return uint256(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report safe upcast from uint128 to uint256', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(uint128 value) public pure returns (uint256) {
            return uint256(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report address cast', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(uint160 value) public pure returns (address) {
            return address(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report same type cast', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(uint256 value) public pure returns (uint256) {
            return uint256(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report non-numeric casts', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(bytes32 value) public pure returns (bytes memory) {
            return abi.encodePacked(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without casts', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function setValue(uint _value) public {
            value = _value;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report bytes cast', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(bytes32 value) public pure returns (bytes4) {
            return bytes4(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report bool cast', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function convert(uint value) public pure returns (bool) {
            return value > 0;
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
