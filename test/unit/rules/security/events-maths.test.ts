/**
 * Events Math Security Rule Tests
 *
 * Testing detection of mathematical operations in event emissions
 */

import { EventsMathRule } from '@/rules/security/events-maths';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('EventsMathRule', () => {
  let rule: EventsMathRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new EventsMathRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/events-maths');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('mathematical operations in events', () => {
    test('should detect addition in event emission', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event ValueUpdated(uint256 newValue);

          uint256 public value;

          function increment() public {
            value++;
            emit ValueUpdated(value + 1);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/event|math|calculation/i);
    });

    test('should detect subtraction in event emission', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event BalanceChanged(uint256 balance);

          uint256 public balance;

          function withdraw(uint256 amount) public {
            balance -= amount;
            emit BalanceChanged(balance - amount);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiplication in event emission', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event Calculated(uint256 result);

          function calculate(uint256 a, uint256 b) public {
            emit Calculated(a * b);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect division in event emission', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event RateUpdated(uint256 rate);

          function updateRate(uint256 total, uint256 count) public {
            emit RateUpdated(total / count);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect modulo in event emission', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event Remainder(uint256 value);

          function compute(uint256 n) public {
            emit Remainder(n % 10);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect exponentiation in event emission', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event Power(uint256 result);

          function power(uint256 base, uint256 exp) public {
            emit Power(base ** exp);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect complex expression in event', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event Result(uint256 value);

          function calculate(uint256 a, uint256 b, uint256 c) public {
            emit Result((a + b) * c / 100);
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

  describe('valid event usage', () => {
    test('should not report event with variable', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event ValueUpdated(uint256 newValue);

          uint256 public value;

          function update(uint256 newValue) public {
            value = newValue;
            emit ValueUpdated(value);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report event with literal', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event Status(uint256 code);

          function setStatus() public {
            emit Status(1);
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report event with function call', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event BalanceUpdated(uint256 balance);

          function getBalance() public view returns (uint256) {
            return 100;
          }

          function update() public {
            emit BalanceUpdated(getBalance());
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report event with multiple variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event Transfer(address from, address to, uint256 amount);

          function transfer(address to, uint256 amount) public {
            emit Transfer(msg.sender, to, amount);
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
    test('should handle contracts without events', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Simple {
          uint256 public value;

          function setValue(uint256 _value) public {
            value = _value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle nested math in event parameters', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          event Data(uint256 value1, uint256 value2);

          function emitData() public {
            emit Data(1 + 2, 3 * 4);
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
});
