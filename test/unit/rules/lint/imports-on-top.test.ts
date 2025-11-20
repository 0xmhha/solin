/**
 * Imports On Top Rule Tests
 *
 * Testing that import statements are at the top of files
 */

import { ImportsOnTopRule } from '@/rules/lint/imports-on-top';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ImportsOnTopRule', () => {
  let rule: ImportsOnTopRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ImportsOnTopRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/imports-on-top');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Import statement placement', () => {
    test('should not report issue when imports are at the top after pragma', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Token.sol";
        import "./Ownable.sol";

        contract MyContract {
          function test() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue when imports are immediately after pragma', async () => {
      const source = `
        pragma solidity ^0.8.0;
        import "./Token.sol";

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when import comes after contract definition', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {}

        import "./Token.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/imports-on-top');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('Import');
      expect(issues[0]?.message).toContain('top');
    });

    test('should report issue when import comes after interface definition', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IMyInterface {
          function getValue() external view returns (uint256);
        }

        import "./Token.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should report issue when import comes after library definition', async () => {
      const source = `
        pragma solidity ^0.8.0;

        library MyLibrary {
          function helper() internal pure returns (uint256) {
            return 42;
          }
        }

        import "./Token.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should handle file with no imports', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle file with only imports', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Token.sol";
        import "./Ownable.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report multiple misplaced imports', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract First {}

        import "./First.sol";

        contract Second {}

        import "./Second.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues.every((issue) => issue.ruleId === 'lint/imports-on-top')).toBe(true);
    });

    test('should handle empty file', async () => {
      const source = `
        pragma solidity ^0.8.0;
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });
});
