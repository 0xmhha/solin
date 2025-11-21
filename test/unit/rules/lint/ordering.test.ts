/**
 * Ordering Rule Tests
 *
 * Testing comprehensive contract member ordering enforcement
 */

import { OrderingRule } from '@/rules/lint/ordering';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('OrderingRule', () => {
  let rule: OrderingRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new OrderingRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/ordering');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Contract member ordering', () => {
    test('should not report issue when members are correctly ordered', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            uint256 public count;
            address private owner;

            event Transfer(address indexed from, address indexed to);

            constructor() {
            }

            modifier onlyOwner() {
                _;
            }

            function transfer() public {
            }

            function getData() external view returns (uint256) {
                return count;
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when function comes before constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function test() public {
            }

            constructor() {
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should report issue when modifier comes before constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            modifier onlyOwner() {
                _;
            }

            constructor() {
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should report issue when constructor comes before state variables', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            constructor() {
            }

            uint256 public count;
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should report issue when events come after functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function test() public {
            }

            event Transfer(address indexed from);
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle contract with minimal members', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            uint256 public count;
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

        contract MyContract {
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
