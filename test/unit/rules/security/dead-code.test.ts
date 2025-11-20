/**
 * Dead Code Security Rule Tests
 *
 * Testing detection of unreachable code
 */

import { DeadCode } from '@/rules/security/dead-code';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('DeadCode', () => {
  let rule: DeadCode;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new DeadCode();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/dead-code');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toBeTruthy();
      expect(rule.metadata.description).toContain('unreachable');
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Detection', () => {
    test('should detect code after return statement', async () => {
      const code = `
        contract Test {
          function test() public pure returns (uint256) {
            return 1;
            uint256 x = 2;  // Dead code
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
      expect(issues[0]!.ruleId).toBe('security/dead-code');
      expect(issues[0]!.message.toLowerCase()).toContain('unreachable');
    });

    test('should detect code after revert', async () => {
      const code = `
        contract Test {
          function test() public pure {
            revert("Error");
            uint256 x = 1;  // Dead code
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
    });

    test('should detect code after throw', async () => {
      const code = `
        contract Test {
          function test() public pure {
            throw;
            uint256 x = 1;  // Dead code
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
    });

    test('should not flag code after conditional return', async () => {
      const code = `
        contract Test {
          function test(bool condition) public pure returns (uint256) {
            if (condition) {
              return 1;
            }
            return 2;  // Reachable
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect multiple dead code blocks', async () => {
      const code = `
        contract Test {
          function test1() public pure {
            return;
            uint256 x = 1;
          }

          function test2() public pure {
            revert();
            uint256 y = 2;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(2);
    });

    test('should not flag empty function after return', async () => {
      const code = `
        contract Test {
          function test() public pure returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect code after require(false)', async () => {
      const code = `
        contract Test {
          function test() public pure {
            require(false, "Always fails");
            uint256 x = 1;  // Dead code
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
    });

    test('should detect code after assert(false)', async () => {
      const code = `
        contract Test {
          function test() public pure {
            assert(false);
            uint256 x = 1;  // Dead code
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
    });
  });
});
