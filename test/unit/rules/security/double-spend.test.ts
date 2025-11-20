import { DoubleSpendRule } from '@/rules/security/double-spend';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('DoubleSpendRule', () => {
  let rule: DoubleSpendRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new DoubleSpendRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  test('should have correct metadata', () => {
    expect(rule.metadata.id).toBe('security/double-spend');
    expect(rule.metadata.category).toBe(Category.SECURITY);
    expect(rule.metadata.severity).toBe(Severity.ERROR);
  });

  test('should detect transfer before balance update', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        mapping(address => uint) balances;
        function withdraw() public {
          payable(msg.sender).transfer(balances[msg.sender]);
          balances[msg.sender] = 0;
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues().length).toBeGreaterThan(0);
  });

  test('should not report safe pattern', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        mapping(address => uint) balances;
        function withdraw() public {
          balances[msg.sender] = 0;
          payable(msg.sender).transfer(100);
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues()).toHaveLength(0);
  });
});
