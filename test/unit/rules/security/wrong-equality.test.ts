/**
 * Wrong Equality Security Rule Tests
 *
 * Testing detection of == usage with contract addresses
 */

import { WrongEqualityRule } from '@/rules/security/wrong-equality';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('WrongEqualityRule', () => {
  let rule: WrongEqualityRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new WrongEqualityRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/wrong-equality');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('strict equality with balance', () => {
    test('should detect == with balance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check() public view returns (bool) {
            return address(this).balance == 1 ether;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/balance|equality|==/i);
    });

    test('should detect == 0 with balance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function isEmpty() public view returns (bool) {
            return address(this).balance == 0;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect balance == value', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function checkExact(uint256 amount) public view returns (bool) {
            return address(this).balance == amount;
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

  describe('safe comparisons', () => {
    test('should not report >= with balance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function hasSufficientBalance() public view returns (bool) {
            return address(this).balance >= 1 ether;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report <= with balance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function isLowBalance() public view returns (bool) {
            return address(this).balance <= 1 ether;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report other == comparisons', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function check(uint256 a, uint256 b) public pure returns (bool) {
            return a == b;
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
    test('should handle empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should detect != with balance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function notEqual() public view returns (bool) {
            return address(this).balance != 0;
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
});
