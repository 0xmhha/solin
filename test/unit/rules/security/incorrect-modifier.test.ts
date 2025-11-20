import { IncorrectModifierRule } from '@/rules/security/incorrect-modifier';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('IncorrectModifierRule', () => {
  let rule: IncorrectModifierRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new IncorrectModifierRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  test('should have correct metadata', () => {
    expect(rule.metadata.id).toBe('security/incorrect-modifier');
    expect(rule.metadata.category).toBe(Category.SECURITY);
    expect(rule.metadata.severity).toBe(Severity.ERROR);
  });

  test('should detect modifier without underscore', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        modifier onlyOwner() {
          require(msg.sender == address(this));
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues().length).toBeGreaterThan(0);
  });

  test('should not report correct modifier', async () => {
    const source = `
      pragma solidity ^0.8.0;
      contract Test {
        modifier onlyOwner() {
          require(msg.sender == address(this));
          _;
        }
      }
    `;
    const { ast } = await parser.parse(source);
    const context = new AnalysisContext('test.sol', source, ast, config);
    rule.analyze(context);
    expect(context.getIssues()).toHaveLength(0);
  });
});
