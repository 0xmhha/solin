/**
 * Block Timestamp Security Rule Tests
 *
 * Testing detection of dangerous block.timestamp usage in time-sensitive operations
 */

import { BlockTimestampRule } from '@/rules/security/block-timestamp';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('BlockTimestampRule', () => {
  let rule: BlockTimestampRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new BlockTimestampRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/block-timestamp');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous timestamp usage', () => {
    test('should detect timestamp in critical require statement', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Auction {
          uint256 public deadline;

          function bid() public payable {
            require(block.timestamp == deadline, "Not exact time");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/timestamp|time-sensitive/i);
    });

    test('should detect timestamp for access control', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract TimeLock {
          function executeExactly(uint256 time) public {
            if (block.timestamp != time) {
              revert("Wrong time");
            }
            // Critical operation
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect timestamp for randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Lottery {
          function random() public view returns (uint256) {
            return uint256(keccak256(abi.encodePacked(block.timestamp))) % 100;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/random/i);
    });

    test('should detect timestamp in equality comparison', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Voting {
          uint256 votingEnd;

          function canVote() public view returns (bool) {
            return block.timestamp == votingEnd;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect timestamp with modulo operator', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Game {
          function roll() public view returns (uint256) {
            return block.timestamp % 6;
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

  describe('safe timestamp usage', () => {
    test('should not report safe comparison with >=', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Timelock {
          uint256 public unlockTime;

          function canUnlock() public view returns (bool) {
            return block.timestamp >= unlockTime;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report safe comparison with <', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Auction {
          uint256 deadline;

          function isActive() public view returns (bool) {
            return block.timestamp < deadline;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report timestamp for duration calculation', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Staking {
          mapping(address => uint256) startTime;

          function getDuration(address user) public view returns (uint256) {
            return block.timestamp - startTime[user];
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report timestamp in addition', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Lock {
          function setLockTime(uint256 duration) public view returns (uint256) {
            return block.timestamp + duration;
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
    test('should handle contracts without timestamp usage', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Simple {
          function getValue() public pure returns (uint256) {
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

    test('should handle nested timestamp in hashing', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Random {
          function getHash() public view returns (bytes32) {
            return keccak256(abi.encodePacked(block.timestamp, msg.sender));
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
