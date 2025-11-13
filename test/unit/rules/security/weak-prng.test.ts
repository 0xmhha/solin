/**
 * Weak PRNG Security Rule Tests
 *
 * Testing detection of weak pseudo-random number generation using block properties
 */

import { WeakPrngRule } from '@/rules/security/weak-prng';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('WeakPrngRule', () => {
  let rule: WeakPrngRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new WeakPrngRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/weak-prng');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.ERROR);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous randomness patterns', () => {
    test('should detect block.timestamp with modulo for randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WeakRandom {
          function generateRandom() public view returns (uint256) {
            return block.timestamp % 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/random/i);
      expect(issues[0]?.message).toMatch(/block\.timestamp/i);
    });

    test('should detect blockhash with modulo for randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WeakRandom {
          function pickWinner(uint256 blockNumber) public view returns (uint256) {
            return uint256(blockhash(blockNumber)) % 10;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/blockhash/i);
    });

    test('should detect block.number with modulo for randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WeakRandom {
          function getRandomNumber() public view returns (uint256) {
            return block.number % 256;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/block\.number/i);
    });

    test('should detect keccak256 with block.timestamp for randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WeakRandom {
          function random() public view returns (uint256) {
            return uint256(keccak256(abi.encodePacked(block.timestamp)));
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect combined block properties for randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WeakRandom {
          function complexRandom() public view returns (uint256) {
            return uint256(keccak256(abi.encodePacked(
              block.timestamp,
              block.difficulty,
              msg.sender
            ))) % 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect now (deprecated) with modulo', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WeakRandom {
          function randomWithNow() public view returns (uint256) {
            return now % 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect block.prevrandao (post-merge) for randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WeakRandom {
          function randomPrevrandao() public view returns (uint256) {
            return block.prevrandao % 1000;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple weak randomness uses', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract WeakRandom {
          function random1() public view returns (uint256) {
            return block.timestamp % 10;
          }

          function random2() public view returns (uint256) {
            return uint256(blockhash(block.number - 1)) % 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });

    test('should detect randomness in lottery contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Lottery {
          address[] public players;

          function pickWinner() public view returns (address) {
            uint256 index = uint256(keccak256(abi.encodePacked(
              block.timestamp,
              block.difficulty,
              players.length
            ))) % players.length;
            return players[index];
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
    test('should not report block.timestamp for time comparisons', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          uint256 public deadline;

          function isExpired() public view returns (bool) {
            return block.timestamp > deadline;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report block.number for block range checks', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Safe {
          function checkBlockRange(uint256 start, uint256 end) public view returns (bool) {
            return block.number >= start && block.number <= end;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle contract without randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract NoRandom {
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
  });

  describe('edge cases', () => {
    test('should handle randomness in private function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract EdgeCase {
          function publicFunction() public view returns (uint256) {
            return _privateRandom();
          }

          function _privateRandom() private view returns (uint256) {
            return block.timestamp % 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle randomness in internal function', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract EdgeCase {
          function internalRandom() internal view returns (uint256) {
            return uint256(blockhash(block.number - 1)) % 10;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle multiple contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract ContractA {
          function random() public view returns (uint256) {
            return block.timestamp % 100;
          }
        }

        contract ContractB {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBe(1); // Only in ContractA
    });

    test('should handle nested expressions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Complex {
          function complexRandom(uint256 seed) public view returns (uint256) {
            return (block.timestamp + seed) % 1000;
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
});
