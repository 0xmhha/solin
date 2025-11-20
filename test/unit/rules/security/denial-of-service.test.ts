import { DenialOfServiceRule } from '@/rules/security/denial-of-service';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('DenialOfServiceRule', () => {
  let rule: DenialOfServiceRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new DenialOfServiceRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  test('should have correct metadata', () => {
    expect(rule.metadata.id).toBe('security/denial-of-service');
    expect(rule.metadata.category).toBe(Category.SECURITY);
    expect(rule.metadata.severity).toBe(Severity.ERROR);
  });

  test('should detect unbounded loop', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        uint[] public data;
        function process() public {
          for (uint i = 0; i < data.length; i++) {}
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues().length).toBeGreaterThan(0);
  });

  test('should not report contract without loops', async () => {
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
