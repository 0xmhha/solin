/**
 * Reason String Rule Tests
 *
 * Testing requirement of reason strings in require/revert statements
 */

import { ReasonStringRule } from '@/rules/lint/reason-string';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ReasonStringRule', () => {
  let rule: ReasonStringRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ReasonStringRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/reason-string');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Valid cases - require with reason', () => {
    test('should not report issue for require with string reason', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 value) public {
            require(value > 0, "Value must be positive");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for multiple requires with reasons', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 a, uint256 b) public {
            require(a > 0, "A must be positive");
            require(b > 0, "B must be positive");
            require(a < b, "A must be less than B");
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

  describe('Invalid cases - require without reason', () => {
    test('should report issue for require without reason string', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 value) public {
            require(value > 0);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('lint/reason-string');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('require');
    });

    test('should report issue for require with empty string', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 value) public {
            require(value > 0, "");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.message).toContain('empty');
    });
  });

  describe('Valid cases - revert with reason', () => {
    test('should not report issue for revert with string reason', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 value) public {
            if (value == 0) {
              revert("Value cannot be zero");
            }
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

  describe('Invalid cases - revert without reason', () => {
    test('should report issue for revert without reason string', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 value) public {
            if (value == 0) {
              revert();
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('lint/reason-string');
      expect(issues[0]?.message).toContain('revert');
    });

    test('should report issue for revert with empty string', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 value) public {
            if (value == 0) {
              revert("");
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.message).toContain('empty');
    });
  });

  describe('Edge cases', () => {
    test('should not flag assert statements', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 value) public {
            assert(value > 0);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle mixed require statements', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 a, uint256 b) public {
            require(a > 0, "A must be positive");
            require(b > 0);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });
});
