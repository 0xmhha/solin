/**
 * Benign Reentrancy Security Rule Tests
 */

import { ReentrancyBenignRule } from '@/rules/security/reentrancy-benign';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ReentrancyBenignRule', () => {
  let rule: ReentrancyBenignRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ReentrancyBenignRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/reentrancy-benign');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect benign reentrancy (event after call)', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          event Transfer(address to, uint amount);

          function transfer(address to, uint amount) public {
            (bool success, ) = to.call{value: amount}("");
            emit Transfer(to, amount);
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('benign');
    });
  });

  describe('safe patterns', () => {
    test('should not report event before call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Safe {
          event Transfer(address to, uint amount);

          function transfer(address to, uint amount) public {
            emit Transfer(to, amount);
            (bool success, ) = to.call{value: amount}("");
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
