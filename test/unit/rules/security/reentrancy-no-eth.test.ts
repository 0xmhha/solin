/**
 * Reentrancy No Eth Security Rule Tests
 *
 * Testing detection of reentrancy without ether loss (read-only reentrancy)
 */

import { ReentrancyNoEthRule } from '@/rules/security/reentrancy-no-eth';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ReentrancyNoEthRule', () => {
  let rule: ReentrancyNoEthRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ReentrancyNoEthRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/reentrancy-no-eth');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('reentrancy patterns', () => {
    test('should detect state change after external call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          mapping(address => uint256) public balances;

          function update(address target) public {
            target.call("");
            balances[msg.sender] = 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/reentrancy|external call|state/i);
    });

    test('should detect state read after external call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vulnerable {
          uint256 public totalSupply;

          function getTotalAfterCallback(address target) public returns (uint256) {
            target.call("");
            return totalSupply;
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
    test('should not report state change before external call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          mapping(address => uint256) public balances;

          function update(address target) public {
            balances[msg.sender] = 100;
            target.call("");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report functions without external calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          uint256 public value;

          function update() public {
            value = 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle empty functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {
          function empty() public {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle functions with only reads', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          uint256 public value;

          function getValue() public view returns (uint256) {
            return value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });
});
