/**
 * Unprotected Selfdestruct Security Rule Tests
 */

import { UnprotectedSelfdestructRule } from '@/rules/security/unprotected-selfdestruct';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('UnprotectedSelfdestructRule', () => {
  let rule: UnprotectedSelfdestructRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new UnprotectedSelfdestructRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/unprotected-selfdestruct');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect unprotected selfdestruct', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function destroy(address payable recipient) public {
            selfdestruct(recipient);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('selfdestruct');
    });
  });

  describe('safe patterns', () => {
    test('should not report owner-protected selfdestruct', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          address public owner;

          constructor() {
            owner = msg.sender;
          }

          function destroy(address payable recipient) public {
            require(msg.sender == owner, "Not owner");
            selfdestruct(recipient);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
