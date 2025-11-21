/**
 * State Variable Shadowing Security Rule Tests
 *
 * Testing detection of state variables shadowing inherited variables
 */

import { StateVariableShadowing } from '@/rules/security/state-variable-shadowing';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('StateVariableShadowing', () => {
  let rule: StateVariableShadowing;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new StateVariableShadowing();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/state-variable-shadowing');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect state variable shadowing in inheritance', async () => {
      const code = `
        contract Base {
          uint256 public value;
        }

        contract Derived is Base {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toContain('shadow');
    });

    test('should not flag non-shadowing variables', async () => {
      const code = `
        contract Base {
          uint256 public value;
        }

        contract Derived is Base {
          uint256 public amount;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag contracts without inheritance', async () => {
      const code = `
        contract A {
          uint256 public value;
        }

        contract B {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });
  });
});
