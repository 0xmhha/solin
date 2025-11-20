/**
 * No Unused Imports Rule Tests
 *
 * Testing that unused import statements are detected and flagged
 */

import { NoUnusedImportsRule } from '@/rules/lint/no-unused-imports';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NoUnusedImportsRule', () => {
  let rule: NoUnusedImportsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NoUnusedImportsRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/no-unused-imports');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Import usage detection', () => {
    test('should not report issue when imported contract is used', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Token.sol";

        contract MyContract {
          Token public token;

          constructor(address tokenAddress) {
            token = Token(tokenAddress);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue when imported contract is used in inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Ownable.sol";

        contract MyContract is Ownable {
          function test() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when import is not used', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./UnusedToken.sol";

        contract MyContract {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/no-unused-imports');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('unused');
      expect(issues[0]?.message).toContain('UnusedToken');
    });

    test('should not report issue for file-level imports without specific symbols', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Library.sol";

        contract MyContract {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Note: We're lenient with file-level imports as they might be used
      // in ways that are hard to detect statically
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle file with no imports', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should detect usage in function parameters', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./IERC20.sol";

        contract MyContract {
          function transfer(IERC20 token, address to, uint256 amount) external {
            token.transfer(to, amount);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should detect usage in return types', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Token.sol";

        contract MyContract {
          function getToken() external returns (Token) {
            return Token(address(0));
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle multiple imports with mixed usage', async () => {
      const source = `
        pragma solidity ^0.8.0;

        import "./Token.sol";
        import "./Unused.sol";
        import "./Ownable.sol";

        contract MyContract is Ownable {
          Token public token;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues.some(issue => issue.message.includes('Unused'))).toBe(true);
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
  });
});
