/**
 * Assembly Usage Security Rule Tests
 *
 * Testing detection of inline assembly usage (informational)
 */

import { AssemblyUsage } from '@/rules/security/assembly-usage';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('AssemblyUsage', () => {
  let rule: AssemblyUsage;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new AssemblyUsage();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('security/assembly-usage');
    });

    test('should have SECURITY category', () => {
      expect(rule.metadata.category).toBe(Category.SECURITY);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title).toBeTruthy();
      expect(rule.metadata.description).toContain('assembly');
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Detection', () => {
    test('should detect inline assembly block', async () => {
      const code = `
        contract Test {
          function getCodeSize(address addr) public view returns (uint256 size) {
            assembly {
              size := extcodesize(addr)
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
      expect(issues[0]!.ruleId).toBe('security/assembly-usage');
      expect(issues[0]!.severity).toBe(Severity.INFO);
      expect(issues[0]!.message).toContain('assembly');
    });

    test('should not flag contract without assembly', async () => {
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

    test('should detect multiple assembly blocks', async () => {
      const code = `
        contract Test {
          function func1() public pure {
            assembly { let x := 1 }
          }

          function func2() public pure {
            assembly { let y := 2 }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(2);
    });

    test('should detect assembly in constructor', async () => {
      const code = `
        contract Test {
          constructor() {
            assembly {
              let ptr := mload(0x40)
            }
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBe(1);
    });

    test('should detect assembly in library', async () => {
      const code = `
        library Utils {
          function isContract(address addr) internal view returns (bool) {
            uint256 size;
            assembly {
              size := extcodesize(addr)
            }
            return size > 0;
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
