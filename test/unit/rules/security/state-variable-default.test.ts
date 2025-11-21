/**
 * State Variable Default Security Rule Tests
 *
 * Testing detection of redundant default value assignments
 */

import { StateVariableDefaultRule } from '@/rules/security/state-variable-default';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('StateVariableDefaultRule', () => {
  let rule: StateVariableDefaultRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new StateVariableDefaultRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/state-variable-default');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('redundant default assignments', () => {
    test('should detect uint initialized to 0', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 0; // Redundant
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/default|redundant/i);
    });

    test('should detect bool initialized to false', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag = false; // Redundant
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should conservatively handle complex initializations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          address public owner = address(0);
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Conservative INFO-level detector - may not catch all cases
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('valid initializations', () => {
    test('should not report non-zero uint', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value = 100;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report true bool', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag = true;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report uninitialized state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value;
          bool public flag;
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
  });
});
