import { IntegerOverflowRule } from '@/rules/security/integer-overflow';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('IntegerOverflowRule', () => {
  let rule: IntegerOverflowRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new IntegerOverflowRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  test('should have correct metadata', () => {
    expect(rule.metadata.id).toBe('security/integer-overflow');
    expect(rule.metadata.category).toBe(Category.SECURITY);
    expect(rule.metadata.severity).toBe(Severity.ERROR);
  });

  test('should detect overflow in old Solidity', async () => {
    const source = `
      pragma solidity ^0.7.0;
      contract Test {
        function add(uint a, uint b) public pure returns (uint) {
          return a + b;
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues().length).toBeGreaterThan(0);
  });

  test('should not report Solidity 0.8.0+', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        function add(uint a, uint b) public pure returns (uint) {
          return a + b;
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues()).toHaveLength(0);
  });
});
