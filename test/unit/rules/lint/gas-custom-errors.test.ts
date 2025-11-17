/**
 * Gas Custom Errors Rule Tests
 *
 * Testing detection of require() and revert() with string literals for gas optimization
 */

import { GasCustomErrors } from '@/rules/lint/gas-custom-errors';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('GasCustomErrors', () => {
  let rule: GasCustomErrors;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new GasCustomErrors();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('lint/gas-custom-errors');
    });

    test('should have LINT category', () => {
      expect(rule.metadata.category).toBe(Category.LINT);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toBe('Use custom errors instead of revert strings');
      expect(rule.metadata.description).toContain('custom errors');
      expect(rule.metadata.recommendation).toContain('Custom error');
    });
  });

  describe('Detection', () => {
    test('should detect require() with string literal', async () => {
      const code = `
        contract Test {
          address owner;
          function foo() public {
            require(msg.sender == owner, "Not authorized");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('require()');
      expect(issues[0]!.message).toContain('custom error');
    });

    test('should detect revert() with string literal', async () => {
      const code = `
        contract Test {
          address owner;
          function foo() public {
            if (msg.sender != owner) {
              revert("Not authorized");
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('revert()');
      expect(issues[0]!.message).toContain('custom error');
    });

    test('should detect multiple require() calls', async () => {
      const code = `
        contract Test {
          address owner;
          uint256 balance;
          function foo(uint256 amount) public {
            require(msg.sender == owner, "Not authorized");
            require(amount > 0, "Invalid amount");
            require(amount <= balance, "Insufficient balance");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(3);
      issues.forEach((issue) => {
        expect(issue.message).toContain('require()');
      });
    });

    test('should not flag require() without error message', async () => {
      const code = `
        contract Test {
          address owner;
          function foo() public {
            require(msg.sender == owner);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag custom error usage', async () => {
      const code = `
        contract Test {
          error NotAuthorized();
          error InvalidAmount(uint256 amount);
          address owner;

          function foo() public {
            if (msg.sender != owner) {
              revert NotAuthorized();
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

    test('should handle assert() statements (no gas benefit)', async () => {
      const code = `
        contract Test {
          uint256 balance;
          function foo() public {
            assert(balance >= 0);
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect revert in complex conditional', async () => {
      const code = `
        contract Test {
          address owner;
          uint256 balance;
          function foo() public {
            if (msg.sender != owner) {
              revert("Unauthorized");
            } else if (balance == 0) {
              revert("No balance");
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(2);
    });

    test('should detect require in nested function calls', async () => {
      const code = `
        contract Test {
          address owner;
          function foo() public {
            _checkOwner();
          }

          function _checkOwner() internal {
            require(msg.sender == owner, "Not owner");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should handle empty contract', async () => {
      const code = `
        contract Test {
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should include gas savings estimate in message', async () => {
      const code = `
        contract Test {
          address owner;
          function foo() public {
            require(msg.sender == owner, "Not authorized");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toContain('gas');
    });

    test('should handle revert with empty string', async () => {
      const code = `
        contract Test {
          address owner;
          function foo() public {
            if (msg.sender != owner) {
              revert("");
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should handle multiple contracts in one file', async () => {
      const code = `
        contract Test1 {
          address owner;
          function foo() public {
            require(msg.sender == owner, "Not authorized");
          }
        }

        contract Test2 {
          uint256 balance;
          function bar() public {
            require(balance > 0, "Insufficient balance");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(2);
    });

    test('should detect require in constructor', async () => {
      const code = `
        contract Test {
          constructor() {
            require(msg.sender != address(0), "Invalid owner");
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });

    test('should detect require in modifier', async () => {
      const code = `
        contract Test {
          address owner;
          modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(1);
    });
  });

  describe('Gas Savings Information', () => {
    test('should include deployment cost savings in metadata', () => {
      expect(rule.metadata.description).toContain('deployment');
    });

    test('should include runtime cost savings in metadata', () => {
      expect(rule.metadata.description).toContain('runtime');
    });
  });
});
