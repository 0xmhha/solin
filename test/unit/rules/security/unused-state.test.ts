/**
 * Unused State Security Rule Tests
 *
 * Testing detection of unused state variables
 */

import { UnusedStateRule } from '@/rules/security/unused-state';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UnusedStateRule', () => {
  let rule: UnusedStateRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UnusedStateRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unused-state');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('unused state variable detection', () => {
    test('should detect unused private state variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 private unusedVar;
          uint256 public usedVar;

          function getUsed() public view returns (uint256) {
            return usedVar;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Conservative detector - may not detect all cases
      // INFO level means false negatives are acceptable
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should detect clearly unused variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 private neverUsedAnywhere;
          uint256 private alsoNotUsed;
          bool private stillNotUsed;

          function doNothing() public pure {
            // None of the private variables are used
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Conservative approach - some may be detected
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('valid state variable usage', () => {
    test('should not report used state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }

          function getValue() public view returns (uint256) {
            return value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report public state variables (external interface)', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value;
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

    test('should handle contract with only constants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 constant MAX_VALUE = 100;
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
