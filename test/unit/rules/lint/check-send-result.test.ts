/**
 * Check Send Result Rule Tests
 *
 * Testing that send() call results are properly checked (lint version)
 */

import { CheckSendResultRule } from '@/rules/lint/check-send-result';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('CheckSendResultRule', () => {
  let rule: CheckSendResultRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new CheckSendResultRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/check-send-result');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Send result validation', () => {
    test('should not report issue when send result is checked with require', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function transfer(address payable recipient) public {
                bool success = recipient.send(100);
                require(success, "Transfer failed");
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue when send result is used in if statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function transfer(address payable recipient) public {
                if (recipient.send(100)) {
                    // success
                } else {
                    revert("Transfer failed");
                }
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when send result is not checked', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function transfer(address payable recipient) public {
                recipient.send(100);
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.ruleId).toBe('lint/check-send-result');
      expect(issues[0]?.message).toContain('send()');
    });

    test('should not report issue for transfer() calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function transfer(address payable recipient) public {
                recipient.transfer(100);
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue when send result is assigned and later checked', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function transfer(address payable recipient) public {
                bool success = recipient.send(100);
                assert(success);
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle multiple send calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function transfer(address payable recipient1, address payable recipient2) public {
                recipient1.send(100);
                bool success = recipient2.send(200);
                require(success);
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contract without send calls', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function getData() public view returns (uint256) {
                return 42;
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
