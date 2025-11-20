import { FrontRunningRule } from '@/rules/security/front-running';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('FrontRunningRule', () => {
  let rule: FrontRunningRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new FrontRunningRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  test('should have correct metadata', () => {
    expect(rule.metadata.id).toBe('security/front-running');
    expect(rule.metadata.category).toBe(Category.SECURITY);
    expect(rule.metadata.severity).toBe(Severity.ERROR);
  });

  test('should detect front-running pattern', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        mapping(address => uint) balances;
        function buy() public payable {
          uint price = balances[address(this)];
          balances[msg.sender] = msg.value;
          payable(msg.sender).transfer(price);
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues().length).toBeGreaterThan(0);
  });

  test('should not report simple functions', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        uint public value;
        function setValue(uint v) public {
          value = v;
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues()).toHaveLength(0);
  });
});
