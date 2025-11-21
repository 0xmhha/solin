import { OracleManipulationRule } from '@/rules/security/oracle-manipulation';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('OracleManipulationRule', () => {
  let rule: OracleManipulationRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new OracleManipulationRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  test('should have correct metadata', () => {
    expect(rule.metadata.id).toBe('security/oracle-manipulation');
    expect(rule.metadata.category).toBe(Category.SECURITY);
    expect(rule.metadata.severity).toBe(Severity.ERROR);
  });

  test('should detect price query', async () => {
    const source = `
      pragma solidity ^0.8.0;
      interface Oracle {
        function getPrice() external view returns (uint);
      }
      contract Test {
        Oracle oracle;
        function check() public view returns (uint) {
          return oracle.getPrice();
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues().length).toBeGreaterThan(0);
  });

  test('should not report contract without price queries', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        uint public value;
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues()).toHaveLength(0);
  });
});
