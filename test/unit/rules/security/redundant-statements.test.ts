/**
 * Redundant Statements Security Rule Tests
 *
 * Testing detection of redundant or no-op statements
 */

import { RedundantStatements } from '@/rules/security/redundant-statements';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('RedundantStatements', () => {
  let rule: RedundantStatements;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new RedundantStatements();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/redundant-statements');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect self-assignment', async () => {
      const code = `
        contract Test {
          uint256 public value;

          function test() public {
            value = value;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/redundant|self-assignment/);
    });

    test('should not flag normal assignments', async () => {
      const code = `
        contract Test {
          uint256 public value;

          function test(uint256 newValue) public {
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

    test('should detect empty block', async () => {
      const code = `
        contract Test {
          function test() public {
            if (true) {
            }
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
