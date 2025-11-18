/**
 * Avoid Suicide Security Rule Tests
 *
 * Testing detection of deprecated suicide() function usage
 */

import { AvoidSuicide } from '@/rules/security/avoid-suicide';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('AvoidSuicide', () => {
  let rule: AvoidSuicide;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new AvoidSuicide();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/avoid-suicide');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have WARNING severity', () => {
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('suicide');
      expect(rule.metadata.description).toContain('suicide');
      expect(rule.metadata.recommendation).toContain('selfdestruct');
    });
  });

  describe('Detection', () => {
    test('should detect suicide() function call', async () => {
      const code = `
        contract Test {
          address public owner;

          function destroy() public {
            suicide(owner);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('suicide');
      expect(issues[0]!.message).toContain('selfdestruct');
    });

    test('should not flag selfdestruct() function call', async () => {
      const code = `
        contract Test {
          address public owner;

          function destroy() public {
            selfdestruct(payable(owner));
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect suicide() with payable address', async () => {
      const code = `
        contract Test {
          address payable public owner;

          function destroy() public {
            suicide(payable(owner));
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple suicide() calls', async () => {
      const code = `
        contract Test {
          address public owner;
          address public backup;

          function destroy() public {
            if (owner != address(0)) {
              suicide(owner);
            } else {
              suicide(backup);
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

    test('should detect suicide() in constructor', async () => {
      const code = `
        contract Test {
          constructor(address owner) {
            suicide(owner);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contract with no suicide calls', async () => {
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

    test('should detect suicide() in conditional statement', async () => {
      const code = `
        contract Test {
          address public owner;

          function conditionalDestroy(bool shouldDestroy) public {
            if (shouldDestroy) {
              suicide(owner);
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

    test('should detect suicide() with msg.sender', async () => {
      const code = `
        contract Test {
          function destroy() public {
            suicide(msg.sender);
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
          function destroy(address owner) public {
            suicide(owner);
          }
        }

        contract Test2 {
          function destroy(address payable owner) public {
            selfdestruct(owner);
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
          function destroy(address owner) public {
            suicide(owner);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/deprecate|avoid|selfdestruct/);
    });

    test('should detect suicide() in modifier', async () => {
      const code = `
        contract Test {
          modifier onlyInEmergency(address recipient) {
            suicide(recipient);
            _;
          }

          function doSomething() public onlyInEmergency(msg.sender) {
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

    test('should detect suicide() with address literal', async () => {
      const code = `
        contract Test {
          function destroy() public {
            suicide(0x1234567890123456789012345678901234567890);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect suicide() in nested function calls', async () => {
      const code = `
        contract Test {
          function destroy(address owner) public {
            require(owner != address(0), "Invalid owner");
            suicide(owner);
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

    test('should recommend selfdestruct in recommendation', () => {
      expect(rule.metadata.recommendation).toContain('selfdestruct');
    });
  });
});
