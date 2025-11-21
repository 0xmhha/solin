/**
 * Void Constructor Call Security Rule Tests
 */

import { VoidConstructorCallRule } from '@/rules/security/void-constructor-call';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('VoidConstructorCallRule', () => {
  let rule: VoidConstructorCallRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new VoidConstructorCallRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/void-constructor-call');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect void constructor call', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Base {
          constructor() {}
        }

        contract Derived is Base {
          constructor() {
            Base();
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('safe patterns', () => {
    test('should not report proper constructor chaining', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Base {
          constructor() {}
        }

        contract Derived is Base {
          constructor() Base() {}
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
