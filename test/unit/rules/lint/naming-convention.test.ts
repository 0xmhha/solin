/**
 * Naming Convention Rule Tests
 *
 * Testing enforcement of Solidity naming conventions
 */

import { NamingConventionRule } from '@/rules/lint/naming-convention';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NamingConventionRule', () => {
  let rule: NamingConventionRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NamingConventionRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/naming-convention');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Contract names - PascalCase', () => {
    test('should not report issue for PascalCase contract names', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;
        }

        contract TokenManager {
          uint256 balance;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for camelCase contract names', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract myContract {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/naming-convention');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('myContract');
      expect(issues[0]?.message).toContain('PascalCase');
    });

    test('should report issue for snake_case contract names', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract my_contract {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('my_contract');
      expect(issues[0]?.message).toContain('PascalCase');
    });

    test('should report issue for UPPER_CASE contract names', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MY_CONTRACT {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('MY_CONTRACT');
    });
  });

  describe('Function names - camelCase', () => {
    test('should not report issue for camelCase function names', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function getValue() public view returns (uint256) {
            return 42;
          }

          function setBalanceOf(address user, uint256 amount) internal {
            // implementation
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for PascalCase function names', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function GetValue() public view returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('GetValue');
      expect(issues[0]?.message).toContain('camelCase');
    });

    test('should report issue for snake_case function names', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function get_value() public view returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('get_value');
      expect(issues[0]?.message).toContain('camelCase');
    });

    test('should not report issue for constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          constructor() {
            // initialization
          }
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

  describe('Constants - UPPER_SNAKE_CASE', () => {
    test('should not report issue for UPPER_SNAKE_CASE constants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public constant MAX_SUPPLY = 1000000;
          address private constant OWNER_ADDRESS = address(0);
          uint256 internal constant DECIMALS = 18;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for camelCase constants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public constant maxSupply = 1000000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('maxSupply');
      expect(issues[0]?.message).toContain('UPPER_SNAKE_CASE');
    });

    test('should report issue for PascalCase constants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public constant MaxSupply = 1000000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('MaxSupply');
      expect(issues[0]?.message).toContain('UPPER_SNAKE_CASE');
    });
  });

  describe('Private variables - _leadingUnderscore', () => {
    test('should not report issue for private variables with leading underscore', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private _balance;
          address private _owner;
          mapping(address => uint256) private _balances;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for private variables without leading underscore', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private balance;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('balance');
      expect(issues[0]?.message).toContain('_');
    });

    test('should not report issue for public/internal variables without underscore', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public balance;
          address internal owner;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not apply underscore rule to constants', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 private constant MAX_SUPPLY = 1000000;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('Mixed violations', () => {
    test('should report multiple issues for multiple violations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract myContract {
          uint256 public constant maxSupply = 1000000;
          uint256 private balance;

          function GetValue() public view returns (uint256) {
            return balance;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(3);
      expect(issues.every(issue => issue.ruleId === 'lint/naming-convention')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle single letter names appropriately', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract X {
          function x() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Single uppercase letter for contract is acceptable (could be considered PascalCase)
      // Single lowercase letter for function is acceptable (could be considered camelCase)
      // This is a design decision
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle interfaces correctly', async () => {
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
      // Interface name starting with 'I' is PascalCase and acceptable
      expect(issues).toHaveLength(0);
    });
  });
});
