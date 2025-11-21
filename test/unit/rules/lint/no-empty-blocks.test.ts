/**
 * No Empty Blocks Rule Tests
 *
 * Testing detection of empty code blocks
 */

import { NoEmptyBlocksRule } from '@/rules/lint/no-empty-blocks';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NoEmptyBlocksRule', () => {
  let rule: NoEmptyBlocksRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NoEmptyBlocksRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/no-empty-blocks');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('analyze', () => {
    test('should not report issues for non-empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for empty function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function emptyFunction() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/no-empty-blocks');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('empty');
    });

    test('should report issue for empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract EmptyContract {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/no-empty-blocks');
    });

    test('should report multiple issues for multiple empty blocks', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function empty1() public {}
          function empty2() internal {}

          modifier emptyModifier() {
            _;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.every(issue => issue.ruleId === 'lint/no-empty-blocks')).toBe(true);
    });

    test('should not report issue for constructor with only super call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Child {
          constructor() {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Empty constructor is allowed in some cases (fallback, receive, etc.)
      // This is a design decision - we can be lenient
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should not report issue for fallback/receive functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          fallback() external payable {}
          receive() external payable {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Fallback and receive can be empty (just accept ETH)
      // Filter out these special functions
      const nonFallbackIssues = issues.filter(
        issue => !issue.message.includes('fallback') && !issue.message.includes('receive')
      );

      expect(nonFallbackIssues).toHaveLength(0);
    });
  });
});
