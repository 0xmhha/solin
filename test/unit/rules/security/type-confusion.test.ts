/**
 * Type Confusion Security Rule Tests
 */

import { TypeConfusionRule } from '@/rules/security/type-confusion';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('TypeConfusionRule', () => {
  let rule: TypeConfusionRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new TypeConfusionRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/type-confusion');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect unsafe type casting', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function unsafeCast(uint256 value) public pure returns (uint8) {
            return uint8(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('type');
    });

    test('should detect uint160 downcasting', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function castAddress(uint256 value) public pure returns (uint160) {
            return uint160(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect uint32 downcasting', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function unsafeCast(uint256 value) public pure returns (uint32) {
            return uint32(value);
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
    test('should not report safe upcasting', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function safeCast(uint8 value) public pure returns (uint256) {
            return uint256(value);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report payable address conversion', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function makePayable(address addr) public pure returns (address payable) {
            return payable(addr);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report same-size casting', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          function cast(int256 value) public pure returns (uint256) {
            return uint256(value);
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
