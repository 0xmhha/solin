/**
 * Timestamp Dependence Security Rule Tests
 *
 * Testing detection of dangerous block.timestamp usage patterns
 */

import { TimestampDependenceRule } from '@/rules/security/timestamp-dependence';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('TimestampDependenceRule', () => {
  let rule: TimestampDependenceRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new TimestampDependenceRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/timestamp-dependence');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('dangerous timestamp usage', () => {
    test('should detect timestamp used for randomness', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Lottery {
          function pickWinner(address[] memory players) public view returns (address) {
            uint256 random = block.timestamp % players.length;
            return players[random];
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/timestamp/i);
      expect(issues[0]?.message).toMatch(/random/i);
    });

    test('should detect equality comparison with timestamp', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Auction {
          uint256 public deadline;

          function checkDeadline() public view returns (bool) {
            return block.timestamp == deadline;  // Dangerous exact match
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/equality/i);
    });

    test('should detect inequality comparison with timestamp', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Timer {
          uint256 startTime;

          function isRunning() public view returns (bool) {
            return block.timestamp != startTime;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/inequality/i);
    });

    test('should detect now keyword usage', async () => {
      const source = `
        pragma solidity ^0.7.0;

        contract Legacy {
          function getTime() public view returns (uint256) {
            return now;  // Deprecated, but still detectable
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/now|timestamp/i);
    });

    test('should detect timestamp in modulo operation', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Game {
          function roll() public view returns (uint256) {
            return block.timestamp % 6 + 1;  // Dice roll
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple timestamp issues', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Casino {
          function playRoulette(uint256 bet) public view returns (bool) {
            uint256 random = block.timestamp % 36;
            bool exactTime = block.timestamp == bet;
            return random == bet || exactTime;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(1);
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

    test('should not report safe comparison with <=', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Auction {
          uint256 public deadline;

          function isActive() public view returns (bool) {
            return block.timestamp <= deadline;
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

        contract Voting {
          uint256 votingEnd;

          function canVote() public view returns (bool) {
            return block.timestamp < votingEnd;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report safe comparison with >', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Vesting {
          uint256 cliffTime;

          function afterCliff() public view returns (bool) {
            return block.timestamp > cliffTime;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report timestamp used for time difference', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Staking {
          mapping(address => uint256) public stakingTime;

          function getStakingDuration(address user) public view returns (uint256) {
            return block.timestamp - stakingTime[user];
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

        contract Timelock {
          function setUnlockTime(uint256 duration) public view returns (uint256) {
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
    test('should handle function without timestamp', async () => {
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

    test('should handle nested timestamp expressions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Complex {
          function randomize(uint256 seed) public view returns (uint256) {
            return (block.timestamp + seed) % 100;
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
