/**
 * Avoid Throw Security Rule Tests
 *
 * Testing detection of deprecated throw statement usage
 */

import { AvoidThrow } from '@/rules/security/avoid-throw';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('AvoidThrow', () => {
  let rule: AvoidThrow;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new AvoidThrow();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/avoid-throw');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have WARNING severity', () => {
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('throw');
      expect(rule.metadata.description).toContain('throw');
      expect(rule.metadata.recommendation).toContain('revert');
    });
  });

  describe('Detection', () => {
    test('should detect throw statement', async () => {
      const code = `
        contract Test {
          function checkValue(uint256 value) public pure {
            if (value == 0) {
              throw;
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('throw');
      expect(issues[0]!.message).toContain('revert');
    });

    test('should not flag revert() function call', async () => {
      const code = `
        contract Test {
          function checkValue(uint256 value) public pure {
            if (value == 0) {
              revert("Invalid value");
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag require() function call', async () => {
      const code = `
        contract Test {
          function checkValue(uint256 value) public pure {
            require(value != 0, "Invalid value");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect multiple throw statements', async () => {
      const code = `
        contract Test {
          function check(uint256 value) public pure {
            if (value == 0) {
              throw;
            }
            if (value > 100) {
              throw;
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(2);
    });

    test('should detect throw in constructor', async () => {
      const code = `
        contract Test {
          constructor(uint256 value) {
            if (value == 0) {
              throw;
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

    test('should handle contract with no throw statements', async () => {
      const code = `
        contract Test {
          function add(uint256 a, uint256 b) public pure returns (uint256) {
            return a + b;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect throw in else block', async () => {
      const code = `
        contract Test {
          function checkValue(uint256 value) public pure {
            if (value != 0) {
              // do something
            } else {
              throw;
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

    test('should detect throw in nested conditions', async () => {
      const code = `
        contract Test {
          function complex(uint256 a, uint256 b) public pure {
            if (a > 0) {
              if (b == 0) {
                throw;
              }
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

    test('should handle multiple contracts', async () => {
      const code = `
        contract Test1 {
          function check1(uint256 value) public pure {
            if (value == 0) {
              throw;
            }
          }
        }

        contract Test2 {
          function check2(uint256 value) public pure {
            require(value != 0, "Invalid");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
    });

    test('should include deprecation warning in message', async () => {
      const code = `
        contract Test {
          function check(uint256 value) public pure {
            if (value == 0) {
              throw;
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/deprecate|avoid|revert|require/);
    });

    test('should detect throw in modifier', async () => {
      const code = `
        contract Test {
          modifier nonZero(uint256 value) {
            if (value == 0) {
              throw;
            }
            _;
          }

          function doSomething(uint256 value) public nonZero(value) {
            // do something
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect throw in loop', async () => {
      const code = `
        contract Test {
          function checkArray(uint256[] memory values) public pure {
            for (uint256 i = 0; i < values.length; i++) {
              if (values[i] == 0) {
                throw;
              }
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

    test('should detect throw after other statements', async () => {
      const code = `
        contract Test {
          function process(uint256 value) public pure {
            uint256 result = value * 2;
            if (result > 100) {
              throw;
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

  describe('Deprecation Information', () => {
    test('should mention deprecation in metadata', () => {
      expect(rule.metadata.description.toLowerCase()).toMatch(/deprecate|avoid/);
    });

    test('should recommend revert in recommendation', () => {
      expect(rule.metadata.recommendation.toLowerCase()).toMatch(/revert|require/);
    });
  });
});
