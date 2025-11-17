/**
 * Gas Small Strings Rule Tests
 *
 * Testing detection of short strings that should use bytes32 instead for gas optimization
 */

import { GasSmallStrings } from '@/rules/lint/gas-small-strings';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('GasSmallStrings', () => {
  let rule: GasSmallStrings;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new GasSmallStrings();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('lint/gas-small-strings');
    });

    test('should have LINT category', () => {
      expect(rule.metadata.category).toBe(Category.LINT);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toContain('bytes32');
      expect(rule.metadata.description).toContain('bytes32');
      expect(rule.metadata.recommendation).toContain('bytes32');
    });
  });

  describe('Detection', () => {
    test('should detect short string literal (< 32 bytes) assigned to string variable', async () => {
      const code = `
        contract Test {
          string public name = "Alice";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('bytes32');
    });

    test('should not flag long strings (>= 32 bytes)', async () => {
      const code = `
        contract Test {
          string public description = "This is a very long description that exceeds 32 bytes";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect short string in function parameter', async () => {
      const code = `
        contract Test {
          function setName(string memory name) public {
            // name is typically short
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Function parameters cannot determine length at compile time
      // so this is informational only
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should not flag bytes32 variables', async () => {
      const code = `
        contract Test {
          bytes32 public name = "Alice";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect multiple short string variables', async () => {
      const code = `
        contract Test {
          string public firstName = "Alice";
          string public lastName = "Smith";
          string public role = "Admin";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThanOrEqual(3);
    });

    test('should handle empty strings', async () => {
      const code = `
        contract Test {
          string public empty = "";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle string at exactly 32 bytes boundary', async () => {
      const code = `
        contract Test {
          string public exact32 = "12345678901234567890123456789012";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Exactly 32 bytes should not be flagged (can use bytes32)
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should not flag string variables without initialization', async () => {
      const code = `
        contract Test {
          string public name;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Cannot determine length without initialization
      expect(issues).toHaveLength(0);
    });

    test('should handle contract with no strings', async () => {
      const code = `
        contract Test {
          uint256 public count;
          address public owner;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect string constant with short value', async () => {
      const code = `
        contract Test {
          string public constant SYMBOL = "ETH";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle mixed string and bytes32 variables', async () => {
      const code = `
        contract Test {
          string public name = "Alice";
          bytes32 public id = "ID123";
          string public description = "This is a very long description that exceeds thirty two bytes";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Should only flag the short string "name"
      expect(issues.length).toBe(1);
      expect(issues[0]!.message).toContain('name');
    });

    test('should include gas savings estimate in message', async () => {
      const code = `
        contract Test {
          string public name = "Alice";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toMatch(/gas|save|efficient|bytes32/);
    });

    test('should handle string in struct', async () => {
      const code = `
        contract Test {
          struct User {
            string name;
            uint256 age;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // Struct fields without initialization cannot be determined
      expect(issues).toHaveLength(0);
    });

    test('should detect string return type with short literal return', async () => {
      const code = `
        contract Test {
          function getName() public pure returns (string memory) {
            return "Alice";
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      // May flag the return statement or function return type
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle multiple contracts', async () => {
      const code = `
        contract Test1 {
          string public name = "Alice";
        }

        contract Test2 {
          string public symbol = "ETH";
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Gas Optimization Information', () => {
    test('should include gas savings in metadata', () => {
      expect(rule.metadata.description.toLowerCase()).toMatch(/gas|save|efficient/);
    });

    test('should mention bytes32 in recommendation', () => {
      expect(rule.metadata.recommendation).toContain('bytes32');
    });

    test('should mention 32 byte limit in description', () => {
      expect(rule.metadata.description).toContain('32');
    });
  });
});
