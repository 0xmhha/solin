/**
 * Local Variable Shadowing Security Rule Tests
 *
 * Testing detection of local variables shadowing state variables
 */

import { LocalVariableShadowing } from '@/rules/security/local-variable-shadowing';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('LocalVariableShadowing', () => {
  let rule: LocalVariableShadowing;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new LocalVariableShadowing();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/local-variable-shadowing');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect local variable shadowing state variable', async () => {
      const code = `
        contract Test {
          uint256 public value;

          function setValue(uint256 value) public {
            value = 100;
          }
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
        contract Test {
          uint256 public value;

          function setValue(uint256 newValue) public {
            value = newValue;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect shadowing in function body', async () => {
      const code = `
        contract Test {
          uint256 public amount;

          function test() public {
            uint256 amount = 50;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
