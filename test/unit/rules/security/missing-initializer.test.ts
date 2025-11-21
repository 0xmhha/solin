/**
 * Missing Initializer Security Rule Tests
 *
 * Testing detection of missing initializer in upgradeable contracts
 */

import { MissingInitializer } from '@/rules/security/missing-initializer';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MissingInitializer', () => {
  let rule: MissingInitializer;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MissingInitializer();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/missing-initializer');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect contract without constructor or initializer', async () => {
      const code = `
        contract UpgradeableContract {
          address public owner;
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toContain('initializ');
    });

    test('should not flag contract with initialize function', async () => {
      const code = `
        contract UpgradeableContract {
          address public owner;

          function initialize(address _owner) public {
            owner = _owner;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag contract with constructor', async () => {
      const code = `
        contract Contract {
          address public owner;

          constructor(address _owner) {
            owner = _owner;
          }
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
