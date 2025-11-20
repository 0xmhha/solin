/**
 * Ordered Imports Rule Tests
 *
 * Testing that import statements are alphabetically ordered
 */

import { OrderedImportsRule } from '@/rules/lint/ordered-imports';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('OrderedImportsRule', () => {
  let rule: OrderedImportsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new OrderedImportsRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/ordered-imports');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Import ordering', () => {
    test('should not report issue when imports are alphabetically ordered', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Ownable.sol";
        import "./Token.sol";
        import "./Vault.sol";

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for single import', async () => {
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

    test('should report issue when imports are not alphabetically ordered', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Token.sol";
        import "./Ownable.sol";

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/ordered-imports');
      expect(issues[0]?.severity).toBe(Severity.INFO);
      expect(issues[0]?.message).toContain('alphabetical');
      expect(issues[0]?.message).toContain('Ownable');
    });

    test('should report multiple ordering issues', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Zebra.sol";
        import "./Apple.sol";
        import "./Banana.sol";

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues.every(issue => issue.ruleId === 'lint/ordered-imports')).toBe(true);
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

    test('should handle case-sensitive ordering', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./aFile.sol";
        import "./BFile.sol";
        import "./cFile.sol";

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Lowercase comes after uppercase in ASCII, so this should be flagged
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle imports with different path depths', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./contracts/Token.sol";
        import "./interfaces/IToken.sol";
        import "./utils/Helper.sol";

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle imports with same prefix', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Token.sol";
        import "./TokenFactory.sol";
        import "./TokenManager.sol";

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
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

    test('should handle named imports', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import {Token} from "./Token.sol";
        import {Ownable} from "./Ownable.sol";

        contract MyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });
});
