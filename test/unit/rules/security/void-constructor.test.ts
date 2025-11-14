/**
 * Void Constructor Security Rule Tests
 */

import { VoidConstructorRule } from '@/rules/security/void-constructor';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('VoidConstructorRule', () => {
  let rule: VoidConstructorRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new VoidConstructorRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/void-constructor');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect constructor function that is not marked', async () => {
      const source = `
        pragma solidity ^0.4.22;
        contract Test {
          function Test() public {
            // Constructor logic
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('constructor');
    });

    test('should detect constructor with same name as contract', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract MyContract {
          uint public value;
          function MyContract(uint v) public {
            value = v;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect typo in constructor name', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Token {
          function Tokne() public {
            // Typo: Tokne instead of Token
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect similar name constructor', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract MyToken {
          function MyTokne() public {
            // Similar name but not exact
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
    test('should not report modern constructor keyword', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          constructor(uint v) {
            value = v;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report regular functions', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function setValue(uint v) public {
            // Regular function
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without constructor', async () => {
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

    test('should not report interface', async () => {
      const source = `
        pragma solidity ^0.8.0;
        interface ITest {
          function getValue() external view returns (uint);
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report library', async () => {
      const source = `
        pragma solidity ^0.8.0;
        library MathLib {
          function add(uint a, uint b) internal pure returns (uint) {
            return a + b;
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
