/**
 * Private Vars Leading Underscore Rule Tests
 *
 * Testing enforcement of leading underscore for private/internal variables
 */

import { PrivateVarsLeadingUnderscoreRule } from '@/rules/lint/private-vars-leading-underscore';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('PrivateVarsLeadingUnderscoreRule', () => {
  let rule: PrivateVarsLeadingUnderscoreRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new PrivateVarsLeadingUnderscoreRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/private-vars-leading-underscore');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Valid cases - private/internal vars with underscore', () => {
    test('should not report issue for private vars with leading underscore', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private _balance;
          address private _owner;
          mapping(address => uint256) private _balances;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for internal vars with leading underscore', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 internal _counter;
          address internal _admin;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for public vars without underscore', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public balance;
          address public owner;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for constants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private constant MAX_SUPPLY = 1000000;
          uint256 internal constant MIN_AMOUNT = 100;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for immutables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private immutable DEPLOYMENT_TIME;
          address private immutable OWNER;

          constructor() {
            DEPLOYMENT_TIME = block.timestamp;
            OWNER = msg.sender;
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

  describe('Invalid cases - private/internal vars without underscore', () => {
    test('should report issue for private var without leading underscore', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private balance;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('lint/private-vars-leading-underscore');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('balance');
      expect(issues[0]?.message).toContain('_');
    });

    test('should report issue for internal var without leading underscore', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 internal counter;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.message).toContain('counter');
    });

    test('should report multiple issues for multiple violations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private balance;
          address private owner;
          uint256 internal counter;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Edge cases', () => {
    test('should handle mixed visibility modifiers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public balance;
          uint256 private _privateBalance;
          uint256 internal _internalBalance;
          uint256 private missingUnderscore;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.message).toContain('missingUnderscore');
    });

    test('should handle variables with default visibility', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 defaultVisibility;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Default visibility is internal, so should require underscore
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    test('should not flag function parameters', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function test(uint256 value) private {
            // value parameter should not require underscore
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
});
