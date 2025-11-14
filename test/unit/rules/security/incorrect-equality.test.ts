/**
 * Incorrect Equality Security Rule Tests
 */

import { IncorrectEqualityRule } from '@/rules/security/incorrect-equality';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('IncorrectEqualityRule', () => {
  let rule: IncorrectEqualityRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new IncorrectEqualityRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/incorrect-equality');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
    });
  });

  describe('dangerous patterns', () => {
    test('should detect strict equality with balance', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check() public view returns (bool) {
            return address(this).balance == 10 ether;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message.toLowerCase()).toContain('balance');
    });

    test('should detect strict equality with block.timestamp', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function checkTime(uint deadline) public view returns (bool) {
            return block.timestamp == deadline;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect strict equality with now (deprecated)', async () => {
      const source = `
        pragma solidity ^0.4.0;
        contract Test {
          function checkTime(uint deadline) public view returns (bool) {
            return now == deadline;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect inequality with balance', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check() public view {
            require(address(this).balance != 0, "No balance");
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect balance check in if statement', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function process() public view {
            if (address(this).balance == 100) {
              // do something
            }
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });

    test('should detect multiple strict equality issues', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check() public view returns (bool) {
            bool b1 = address(this).balance == 10 ether;
            bool b2 = block.timestamp == 12345;
            return b1 && b2;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });
  });

  describe('safe patterns', () => {
    test('should not report comparison operators', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function check() public view returns (bool) {
            return address(this).balance >= 10 ether;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report timestamp with comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          function checkTime(uint deadline) public view returns (bool) {
            return block.timestamp > deadline;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report equality with constants', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint constant MAX = 100;
          function check(uint x) public pure returns (bool) {
            return x == MAX;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report equality with state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {
          uint public counter;
          function check(uint x) public view returns (bool) {
            return x == counter;
          }
        }
      `;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report contract without dangerous equality', async () => {
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
});
