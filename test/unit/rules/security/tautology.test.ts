/**
 * Tautology Security Rule Tests
 *
 * Testing detection of tautological comparisons (always true/false)
 */

import { TautologyRule } from '@/rules/security/tautology';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('TautologyRule', () => {
  let rule: TautologyRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new TautologyRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/tautology');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('tautological comparisons', () => {
    test('should detect unsigned >= 0', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 value) public pure returns (bool) {
            return value >= 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/tautology|always true/i);
    });

    test('should detect unsigned > type(uint).max', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint8 value) public pure returns (bool) {
            return value > 255;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect x == x comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 value) public pure returns (bool) {
            return value == value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect x >= x comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 value) public pure returns (bool) {
            return value >= value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect x <= x comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 value) public pure returns (bool) {
            return value <= value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect unsigned < 0', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 value) public pure returns (bool) {
            return value < 0;
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

  describe('valid comparisons', () => {
    test('should not report signed >= 0', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(int256 value) public pure returns (bool) {
            return value >= 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report normal comparisons', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 a, uint256 b) public pure returns (bool) {
            return a >= b;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report valid range check', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 value) public pure returns (bool) {
            return value >= 10 && value <= 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report comparison with max minus one', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint8 value) public pure returns (bool) {
            return value > 254;
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
    test('should handle contracts without comparisons', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Simple {
          uint256 public value = 42;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should detect multiple tautologies', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 a, uint256 b) public pure returns (bool) {
            return a >= 0 && b >= 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
