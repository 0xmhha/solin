/**
 * Tx.Origin Rule Tests
 *
 * Testing detection of dangerous tx.origin usage
 */

import { TxOriginRule } from '@/rules/security/tx-origin';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('TxOriginRule', () => {
  let rule: TxOriginRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new TxOriginRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/tx-origin');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('tx.origin detection', () => {
    test('should not report issue for code without tx.origin', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract SafeContract {
          address public owner;

          modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
          }

          function setOwner(address newOwner) public onlyOwner {
            owner = newOwner;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue for tx.origin in authorization', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract VulnerableContract {
          address public owner;

          modifier onlyOwner() {
            require(tx.origin == owner, "Not owner");
            _;
          }

          function dangerous() public onlyOwner {
            // vulnerable to phishing attacks
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('security/tx-origin');
      expect(issues[0]?.severity).toBe(Severity.ERROR);
      expect(issues[0]?.message).toContain('tx.origin');
      expect(issues[0]?.message.toLowerCase()).toContain('msg.sender');
    });

    test('should report issue for tx.origin in if statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract VulnerableContract {
          address public owner;

          function withdraw() public {
            if (tx.origin == owner) {
              payable(msg.sender).transfer(address(this).balance);
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('security/tx-origin');
    });

    test('should report multiple issues for multiple tx.origin usages', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MultipleVulnerabilities {
          address public owner;

          function check1() public view returns (bool) {
            return tx.origin == owner;
          }

          function check2() public {
            require(tx.origin == owner);
          }

          function check3() public {
            if (tx.origin != owner) {
              revert("Unauthorized");
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(3);
      expect(issues.every((issue) => issue.ruleId === 'security/tx-origin')).toBe(true);
    });
  });

  describe('tx.origin in different contexts', () => {
    test('should report issue for tx.origin in comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Comparison {
          function isOwner(address addr) public view returns (bool) {
            return tx.origin == addr;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should report issue for tx.origin in assignment', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Assignment {
          address public caller;

          function storeCaller() public {
            caller = tx.origin;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should report issue for tx.origin in return statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract ReturnOrigin {
          function getOrigin() public view returns (address) {
            return tx.origin;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should report issue for tx.origin in function call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract FunctionCall {
          function transfer(address to, uint256 amount) internal {}

          function withdraw() public {
            transfer(tx.origin, 100);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    test('should handle contract without tx.origin', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoTxOrigin {
          uint256 public value;

          function setValue(uint256 newValue) public {
            value = newValue;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle empty contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });
});
