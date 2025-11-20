/**
 * Import On Top Rule Tests
 *
 * Testing that all import statements are at the file top (strict version)
 */

import { ImportOnTopRule } from '@/rules/lint/import-on-top';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ImportOnTopRule', () => {
  let rule: ImportOnTopRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ImportOnTopRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/import-on-top');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Import placement validation', () => {
    test('should not report issue when all imports are at top', async () => {
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

    test('should report issue when import is after contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {}

        import "./Token.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.ruleId).toBe('lint/import-on-top');
    });

    test('should report issue when import is between contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract First {}

        import "./Token.sol";

        contract Second {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
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

    test('should handle file with only pragma and imports', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Token.sol";
        import "./Ownable.sol";
        import "./SafeMath.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should check imports before interfaces', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IToken {}

        import "./Ownable.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should check imports before libraries', async () => {
      const source = `
        pragma solidity ^0.8.0;

        library Math {}

        import "./SafeMath.sol";
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
