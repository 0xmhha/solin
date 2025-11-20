/**
 * Function Init State Security Rule Tests
 *
 * Testing detection of functions that initialize state
 */

import { FunctionInitState } from '@/rules/security/function-init-state';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('FunctionInitState', () => {
  let rule: FunctionInitState;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new FunctionInitState();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/function-init-state');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('Detection', () => {
    test('should detect initialize function', async () => {
      const code = `
        contract Upgradeable {
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

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message.toLowerCase()).toContain('initializ');
    });

    test('should detect init function', async () => {
      const code = `
        contract Contract {
          uint256 public value;

          function init() public {
            value = 100;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should not flag regular functions', async () => {
      const code = `
        contract Contract {
          function transfer(address to, uint256 amount) public {
            // transfer logic
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should detect setup function', async () => {
      const code = `
        contract Contract {
          function setup() public {
            // setup logic
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
