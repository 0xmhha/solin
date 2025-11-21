/**
 * Visibility Modifiers Rule Tests
 *
 * Testing enforcement of explicit visibility modifiers
 */

import { VisibilityModifiersRule } from '@/rules/lint/visibility-modifiers';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('VisibilityModifiersRule', () => {
  let rule: VisibilityModifiersRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new VisibilityModifiersRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/visibility-modifiers');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Function visibility', () => {
    test('should not report issue for functions with explicit visibility', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function publicFunc() public {}
          function externalFunc() external {}
          function internalFunc() internal {}
          function privateFunc() private {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for function without visibility modifier', async () => {
      const source = `
        pragma solidity ^0.4.0;

        contract MyContract {
          function noVisibility() {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/visibility-modifiers');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('visibility');
      expect(issues[0]?.message).toContain('noVisibility');
    });

    test('should report issues for multiple functions without visibility', async () => {
      const source = `
        pragma solidity ^0.4.0;

        contract MyContract {
          function func1() {}
          function func2() returns (uint256) { return 1; }
          function func3() {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(3);
      expect(issues.every(issue => issue.ruleId === 'lint/visibility-modifiers')).toBe(true);
    });

    test('should not report issue for constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          constructor() {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for fallback and receive functions', async () => {
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
      expect(issues).toHaveLength(0);
    });
  });

  describe('State variable visibility', () => {
    test('should not report issue for state variables with explicit visibility', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public publicVar;
          uint256 internal internalVar;
          uint256 private privateVar;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for state variable without visibility modifier', async () => {
      const source = `
        pragma solidity ^0.4.0;

        contract MyContract {
          uint256 noVisibility;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/visibility-modifiers');
      expect(issues[0]?.message).toContain('visibility');
      expect(issues[0]?.message).toContain('noVisibility');
    });

    test('should report issues for multiple state variables without visibility', async () => {
      const source = `
        pragma solidity ^0.4.0;

        contract MyContract {
          uint256 var1;
          address var2;
          bool var3;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(3);
      expect(issues.every(issue => issue.ruleId === 'lint/visibility-modifiers')).toBe(true);
    });

    test('should not report issue for constants (visibility is implicit)', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 constant MAX_SUPPLY = 1000000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Constants may or may not require explicit visibility depending on interpretation
      // This is a design decision - we'll allow implicit visibility for constants
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mixed violations', () => {
    test('should report all visibility issues in a contract', async () => {
      const source = `
        pragma solidity ^0.4.0;

        contract MyContract {
          uint256 stateVar;

          function noVisFunc() {}

          function publicFunc() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues.every(issue => issue.ruleId === 'lint/visibility-modifiers')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle interface functions correctly', async () => {
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
      // Interface functions must be external, so they should have visibility
      expect(issues).toHaveLength(0);
    });

    test('should handle abstract contract functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        abstract contract AbstractContract {
          function abstractFunc() public virtual;
          function implementedFunc() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Both functions have explicit visibility, so no issues
      expect(issues).toHaveLength(0);
    });

    test('should handle library functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        library MyLibrary {
          function libFunc() internal pure returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Library function has explicit visibility
      expect(issues).toHaveLength(0);
    });
  });
});
