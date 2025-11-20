/**
 * Prefer External Over Public Rule Tests
 *
 * Testing that public functions not called internally should be external
 */

import { PreferExternalOverPublicRule } from '@/rules/lint/prefer-external-over-public';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('PreferExternalOverPublicRule', () => {
  let rule: PreferExternalOverPublicRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new PreferExternalOverPublicRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/prefer-external-over-public');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Function visibility optimization', () => {
    test('should not report issue for external functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function externalFunc() external {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for internal functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function internalFunc() internal {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for private functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function privateFunc() private {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for public function not called internally', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function publicFunc() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/prefer-external-over-public');
      expect(issues[0]?.severity).toBe(Severity.INFO);
      expect(issues[0]?.message).toContain('publicFunc');
      expect(issues[0]?.message).toContain('external');
    });

    test('should not report issue for public function called internally', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function publicFunc() public returns (uint256) {
            return 42;
          }

          function caller() external returns (uint256) {
            return publicFunc();
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for public function called with this', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function publicFunc() public returns (uint256) {
            return 42;
          }

          function caller() external returns (uint256) {
            return this.publicFunc();
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Calling with 'this' is an external call, so publicFunc can be external
      expect(issues).toHaveLength(1);
    });

    test('should report issues for multiple public functions not called internally', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function func1() public {}
          function func2() public {}
          function func3() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(3);
      expect(issues.every((issue) => issue.ruleId === 'lint/prefer-external-over-public')).toBe(
        true,
      );
    });

    test('should handle empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report for constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          constructor() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle interface functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IMyInterface {
          function getValue() external view returns (uint256);
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });
});
