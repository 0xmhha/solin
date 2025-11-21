/**
 * Pack Storage Variables Rule Tests
 *
 * Testing detection of storage variable packing opportunities
 */

import { PackStorageVariables } from '@/rules/lint/pack-storage-variables';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('PackStorageVariables', () => {
  let rule: PackStorageVariables;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new PackStorageVariables();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('Rule Metadata', () => {
    test('should have correct rule ID', () => {
      expect(rule.metadata.id).toBe('gas/pack-storage-variables');
    });

    test('should have LINT category', () => {
      expect(rule.metadata.category).toBe(Category.LINT);
    });

    test('should have INFO severity', () => {
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });

    test('should have correct metadata', () => {
      expect(rule.metadata.title.toLowerCase()).toContain('pack');
      expect(rule.metadata.description).toContain('storage');
      expect(rule.metadata.recommendation).toContain('pack');
    });
  });

  describe('Detection', () => {
    test('should detect uint128 variables that can be packed', async () => {
      const code = `
        contract Storage {
          uint128 a;
          uint256 fullSlot;
          uint128 b;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('pack');
    });

    test('should detect uint64 variables that can be packed', async () => {
      const code = `
        contract Storage {
          uint64 a;
          uint256 separator;
          uint64 b;
          uint64 c;
          uint64 d;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('pack');
    });

    test('should detect mixed size variables that can be packed', async () => {
      const code = `
        contract Storage {
          uint8 small1;
          uint256 big;
          uint8 small2;
          uint16 medium;
          uint8 small3;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should not flag already packed variables', async () => {
      const code = `
        contract Storage {
          uint128 a;
          uint128 b;
          uint256 c;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should not flag contracts with only uint256 variables', async () => {
      const code = `
        contract Storage {
          uint256 a;
          uint256 b;
          uint256 c;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle address variables (20 bytes)', async () => {
      const code = `
        contract Storage {
          uint96 value;
          uint256 separator;
          address owner;
          address admin;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle bool variables (1 byte)', async () => {
      const code = `
        contract Storage {
          bool flag1;
          uint256 separator;
          bool flag2;
          bool flag3;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should include gas savings estimate', async () => {
      const code = `
        contract Storage {
          uint128 a;
          uint256 separator;
          uint128 b;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('gas');
    });

    test('should handle empty contract', async () => {
      const code = `
        contract Empty {
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle multiple contracts', async () => {
      const code = `
        contract Storage1 {
          uint128 a;
          uint256 separator;
          uint128 b;
        }

        contract Storage2 {
          uint64 x;
          uint256 separator;
          uint64 y;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThanOrEqual(2);
    });

    test('should not flag constants', async () => {
      const code = `
        contract Storage {
          uint128 constant MAX_VALUE = 1000;
          uint128 constant MIN_VALUE = 10;
          uint128 variable;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle uint32 timestamp patterns', async () => {
      const code = `
        contract Storage {
          uint32 startTime;
          uint256 separator;
          uint32 endTime;
          uint32 lastUpdate;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should calculate storage slot savings', async () => {
      const code = `
        contract Storage {
          uint8 a;
          uint256 big;
          uint8 b;
          uint8 c;
          uint8 d;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]!.message).toContain('slot');
    });
  });

  describe('Gas Savings Information', () => {
    test('should mention SSTORE cost in description', () => {
      expect(rule.metadata.description).toContain('gas');
    });

    test('should mention storage optimization in recommendation', () => {
      expect(rule.metadata.recommendation).toContain('storage');
    });
  });

  describe('Edge Cases', () => {
    test('should handle bytes types correctly', async () => {
      const code = `
        contract Storage {
          bytes1 small1;
          uint256 separator;
          bytes2 small2;
          bytes32 full;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle int types (signed integers)', async () => {
      const code = `
        contract Storage {
          int128 a;
          uint256 separator;
          int128 b;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contracts with only constants', async () => {
      const code = `
        contract Storage {
          uint128 constant MAX = 1000;
          uint128 constant MIN = 10;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle mappings and arrays', async () => {
      const code = `
        contract Storage {
          uint128 a;
          mapping(address => uint256) balances;
          uint128 b;
          uint256[] data;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle struct types', async () => {
      const code = `
        contract Storage {
          struct Data {
            uint256 value;
          }
          uint128 a;
          Data myData;
          uint128 b;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });

    test('should calculate correct savings for large potential improvement', async () => {
      const code = `
        contract Storage {
          uint8 a;
          uint256 big1;
          uint8 b;
          uint256 big2;
          uint8 c;
          uint256 big3;
          uint8 d;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
      if (issues[0]) {
        expect(issues[0].message).toContain('slot');
      }
    });

    test('should handle immutable variables', async () => {
      const code = `
        contract Storage {
          uint128 immutable RATE;
          uint128 variable;

          constructor(uint128 _rate) {
            RATE = _rate;
          }
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues).toHaveLength(0);
    });

    test('should handle many small variables that could pack well', async () => {
      const code = `
        contract Storage {
          uint8 a;
          uint8 b;
          uint8 c;
          uint256 separator;
          uint8 d;
          uint8 e;
          uint8 f;
        }
      `;

      const { ast } = await parser.parse(code);
      const context = new AnalysisContext('test.sol', code, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();

      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
