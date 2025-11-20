import { DelegatecallToUntrustedRule } from '@/rules/security/delegatecall-to-untrusted';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('DelegatecallToUntrustedRule', () => {
  let rule: DelegatecallToUntrustedRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new DelegatecallToUntrustedRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  test('should have correct metadata', () => {
    expect(rule.metadata.id).toBe('security/delegatecall-to-untrusted');
    expect(rule.metadata.category).toBe(Category.SECURITY);
    expect(rule.metadata.severity).toBe(Severity.ERROR);
  });

  test('should detect delegatecall', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        function execute(address target) public {
          target.delegatecall("");
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues().length).toBeGreaterThan(0);
  });

  test('should not report contract without delegatecall', async () => {
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
