/**
 * Shadowing Built-in Security Rule Tests
 */

import { ShadowingBuiltinRule } from '@/rules/security/shadowing-builtin';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ShadowingBuiltinRule', () => {
  let rule: ShadowingBuiltinRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ShadowingBuiltinRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/shadowing-builtin');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect shadowing of "now"', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(uint now) public pure returns (uint) {
            return now;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('now');
    });

    test('should detect shadowing of "msg"', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(address msg) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect shadowing of "tx"', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(uint tx) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect shadowing of "block"', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(uint block) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect shadowing of "require"', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(bool require) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect shadowing of "assert"', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(bool assert) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect shadowing of "revert"', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(bool revert) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect shadowing in local variable', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test() public pure {
            uint msg = 100;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect shadowing in state variable', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public now;
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple shadowing instances', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(uint msg, uint block) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });
  });

  describe('safe patterns', () => {
    test('should not report normal parameter names', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(uint value, address account) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report normal local variables', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test() public pure {
            uint value = 100;
            address account = address(0);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report normal state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          address public owner;
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report similar but non-builtin names', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function test(uint message, uint blocks) public pure {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without shadowing', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public data;
          function getData() public view returns (uint) {
            return data;
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
