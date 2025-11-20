/**
 * No Complex Fallback Rule Tests
 *
 * Testing disallowing complex logic in fallback functions
 */

import { NoComplexFallbackRule } from '@/rules/lint/no-complex-fallback';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NoComplexFallbackRule', () => {
  let rule: NoComplexFallbackRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NoComplexFallbackRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/no-complex-fallback');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Valid cases - simple fallback', () => {
    test('should not report issue for empty fallback', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          fallback() external payable {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for simple fallback with emit', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          event Received(address sender, uint256 amount);

          fallback() external payable {
            emit Received(msg.sender, msg.value);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for empty receive', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          receive() external payable {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for simple receive with emit', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          event Received(address sender, uint256 amount);

          receive() external payable {
            emit Received(msg.sender, msg.value);
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

  describe('Invalid cases - complex fallback', () => {
    test('should report issue for fallback with if statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public counter;

          fallback() external payable {
            if (msg.value > 0) {
              counter++;
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('lint/no-complex-fallback');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('fallback');
    });

    test('should report issue for fallback with loop', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          fallback() external payable {
            for (uint256 i = 0; i < 10; i++) {
              // complex logic
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    test('should report issue for fallback with function call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function doSomething() internal {}

          fallback() external payable {
            doSomething();
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    test('should report issue for fallback with state modification', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public balance;

          fallback() external payable {
            balance += msg.value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });

    test('should report issue for complex receive function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public counter;

          receive() external payable {
            counter++;
            if (msg.value > 1 ether) {
              counter += 10;
            }
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge cases', () => {
    test('should not flag regular functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          function regularFunction() public {
            uint256 x = 1;
            for (uint256 i = 0; i < 10; i++) {
              x++;
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

    test('should handle both fallback and receive', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public counter;

          fallback() external payable {
            counter++;
          }

          receive() external payable {
            counter += 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
