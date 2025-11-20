/**
 * One Contract Per File Rule Tests
 *
 * Testing that only one contract/interface/library per file is enforced
 */

import { OneContractPerFileRule } from '@/rules/lint/one-contract-per-file';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('OneContractPerFileRule', () => {
  let rule: OneContractPerFileRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new OneContractPerFileRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/one-contract-per-file');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Contract per file enforcement', () => {
    test('should not report issue for single contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for single interface', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IMyInterface {
          function getValue() external view returns (uint256);
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for single library', async () => {
      const source = `
        pragma solidity ^0.8.0;

        library MyLibrary {
          function helper() internal pure returns (uint256) {
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

    test('should report issue for multiple contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract FirstContract {
          uint256 public value;
        }

        contract SecondContract {
          uint256 public value;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('lint/one-contract-per-file');
      expect(issues[0]?.severity).toBe(Severity.WARNING);
      expect(issues[0]?.message).toContain('one contract');
    });

    test('should report issue for multiple interfaces', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IFirst {
          function getValue() external view returns (uint256);
        }

        interface ISecond {
          function getValue() external view returns (uint256);
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should report issue for multiple libraries', async () => {
      const source = `
        pragma solidity ^0.8.0;

        library FirstLibrary {
          function helper() internal pure returns (uint256) {
            return 42;
          }
        }

        library SecondLibrary {
          function helper() internal pure returns (uint256) {
            return 43;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should report issue for mixed contract types', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IMyInterface {
          function getValue() external view returns (uint256);
        }

        contract MyContract {
          uint256 public value;
        }

        library MyLibrary {
          function helper() internal pure returns (uint256) {
            return 42;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should handle empty file', async () => {
      const source = `
        pragma solidity ^0.8.0;
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report correct count for three contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract First {}
        contract Second {}
        contract Third {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('3');
    });

    test('should handle abstract contracts as regular contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        abstract contract AbstractContract {
          function abstractFunc() public virtual;
        }

        contract ConcreteContract is AbstractContract {
          function abstractFunc() public override {}
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
    });

    test('should count all top-level definitions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        library Helper {
          function add(uint256 a, uint256 b) internal pure returns (uint256) {
            return a + b;
          }
        }

        interface ICounter {
          function increment() external;
        }

        contract Counter {
          uint256 public count;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Should report issue because we have 3 top-level definitions
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });
});
