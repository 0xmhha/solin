/**
 * Too Many Digits Security Rule Tests
 *
 * Testing detection of numbers with too many digits
 */

import { TooManyDigitsRule } from '@/rules/security/too-many-digits';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('TooManyDigitsRule', () => {
  let rule: TooManyDigitsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new TooManyDigitsRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/too-many-digits');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('numbers with too many digits', () => {
    test('should detect number with more than 20 digits', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 123456789012345678901234567890;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/digits|readability/i);
    });

    test('should detect large number in function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function setValue() public pure returns (uint256) {
            return 10000000000000000000000;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect very large constant', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 constant LARGE_VALUE = 999999999999999999999999;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect number in arithmetic operation', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function calculate() public pure returns (uint256) {
            return 100000000000000000000 * 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple numbers with too many digits', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value1 = 1000000000000000000000;
          uint256 public value2 = 2000000000000000000000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('valid number usage', () => {
    test('should not report numbers with underscores', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 1_000_000_000_000_000_000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report numbers with fewer than 15 digits', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 1000000000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report scientific notation', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 1e18;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report hex numbers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 0xFFFFFFFFFFFFFFFFFFFFFFFF;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report small numbers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 42;
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
    test('should handle contracts without number literals', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Simple {
          string public name = "Test";
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should detect extremely long number', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 12345678901234567890123456789012345;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
