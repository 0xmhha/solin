/**
 * Boolean Equality Lint Rule Tests
 */

import { BooleanEqualityRule } from '@/rules/lint/boolean-equality';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('BooleanEqualityRule', () => {
  let rule: BooleanEqualityRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new BooleanEqualityRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/boolean-equality');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('unnecessary patterns', () => {
    test('should detect == true comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure returns (bool) {
            return flag == true;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('boolean');
    });

    test('should detect == false comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure returns (bool) {
            return flag == false;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect != true comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure returns (bool) {
            return flag != true;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect != false comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure returns (bool) {
            return flag != false;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect true == variable comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure returns (bool) {
            return true == flag;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect in if condition', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure {
            if (flag == true) {
              // do something
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect in require statement', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure {
            require(flag == true, "Flag must be true");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });
  });

  describe('acceptable patterns', () => {
    test('should not report direct boolean usage', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure returns (bool) {
            return flag;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report negated boolean', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure returns (bool) {
            return !flag;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report direct boolean in if', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(bool flag) public pure {
            if (flag) {
              // do something
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report non-boolean comparisons', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check(uint value) public pure returns (bool) {
            return value == 10;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without boolean comparisons', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public value;
          function test() public view returns (uint) {
            return value;
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
