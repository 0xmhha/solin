/**
 * No Public Vars Rule Tests
 *
 * Testing that public state variables are disallowed
 */

import { NoPublicVarsRule } from '@/rules/lint/no-public-vars';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NoPublicVarsRule', () => {
  let rule: NoPublicVarsRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NoPublicVarsRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/no-public-vars');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('State variable visibility', () => {
    test('should not report issue for private state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private balance;
          address private owner;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for internal state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 internal balance;
          address internal owner;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for public state variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public balance;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/no-public-vars');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('public');
      expect(issues[0]?.message).toContain('balance');
    });

    test('should report issues for multiple public state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public balance;
          address public owner;
          bool public isActive;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(3);
      expect(issues.every((issue) => issue.ruleId === 'lint/no-public-vars')).toBe(true);
    });

    test('should not report issue for public constants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public constant MAX_SUPPLY = 1000000;
          string public constant NAME = "MyToken";
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for public immutable variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public immutable deployTime;

          constructor() {
            deployTime = block.timestamp;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle mixed visibility state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private _balance;
          uint256 public balance;
          uint256 internal _internalBalance;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('balance');
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

    test('should handle interface with public functions', async () => {
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
