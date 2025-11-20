/**
 * Too Many Functions Security Rule Tests
 *
 * Testing detection of contracts with excessive number of functions
 */

import { TooManyFunctionsRule } from '@/rules/security/too-many-functions';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('TooManyFunctionsRule', () => {
  let rule: TooManyFunctionsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new TooManyFunctionsRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/too-many-functions');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('contracts with too many functions', () => {
    test('should detect contract with more than 50 functions', async () => {
      // Generate a contract with 51 functions
      const functions = Array.from(
        { length: 51 },
        (_, i) => `function func${i}() public pure returns (uint256) { return ${i}; }`
      ).join('\n    ');

      const source = `
        pragma solidity ^0.8.0;

        contract LargeContract {
          ${functions}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/too many functions|complexity|maintainability/i);
    });

    test('should detect contract with 75 functions', async () => {
      const functions = Array.from(
        { length: 75 },
        (_, i) => `function method${i}() public { }`
      ).join('\n    ');

      const source = `
        pragma solidity ^0.8.0;

        contract VeryLargeContract {
          ${functions}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('valid contracts', () => {
    test('should not report contract with reasonable number of functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract ReasonableContract {
          function func1() public {}
          function func2() public {}
          function func3() public {}
          function func4() public {}
          function func5() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report contract with exactly 50 functions', async () => {
      const functions = Array.from({ length: 50 }, (_, i) => `function func${i}() public {}`).join(
        '\n    '
      );

      const source = `
        pragma solidity ^0.8.0;

        contract MaxAllowedContract {
          ${functions}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract EmptyContract {
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
    test('should handle multiple contracts with different function counts', async () => {
      const manyFunctions = Array.from(
        { length: 51 },
        (_, i) => `function func${i}() public {}`
      ).join('\n    ');

      const source = `
        pragma solidity ^0.8.0;

        contract SmallContract {
          function func1() public {}
        }

        contract LargeContract {
          ${manyFunctions}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should only report LargeContract
      expect(issues.length).toBe(1);
    });

    test('should count all function types (public, private, internal, external)', async () => {
      const functions = Array.from({ length: 51 }, (_, i) => {
        const visibility = ['public', 'private', 'internal', 'external'][i % 4];
        return `function func${i}() ${visibility} {}`;
      }).join('\n    ');

      const source = `
        pragma solidity ^0.8.0;

        contract MixedVisibilityContract {
          ${functions}
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
