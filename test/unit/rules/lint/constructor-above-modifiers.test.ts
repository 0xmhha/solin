/**
 * Constructor Above Modifiers Rule Tests
 *
 * Testing that constructor is placed before modifier definitions
 */

import { ConstructorAboveModifiersRule } from '@/rules/lint/constructor-above-modifiers';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('ConstructorAboveModifiersRule', () => {
  let rule: ConstructorAboveModifiersRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ConstructorAboveModifiersRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/constructor-above-modifiers');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Constructor placement validation', () => {
    test('should not report issue when constructor is before modifiers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            constructor() {
            }

            modifier onlyOwner() {
                _;
            }

            function test() public {
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should report issue when constructor is after modifiers', async () => {
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
      expect(issues[0]?.ruleId).toBe('lint/constructor-above-modifiers');
      expect(issues[0]?.message).toContain('constructor');
      expect(issues[0]?.message).toContain('modifier');
    });

    test('should handle contract with only constructor', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            constructor() {
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle contract with only modifiers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            modifier onlyOwner() {
                _;
            }

            modifier whenNotPaused() {
                _;
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle contract without constructor or modifiers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            function test() public {
            }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle multiple modifiers with constructor after all of them', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            modifier onlyOwner() {
                _;
            }

            modifier whenNotPaused() {
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

    test('should handle constructor between modifiers', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract MyContract {
            modifier onlyOwner() {
                _;
            }

            constructor() {
            }

            modifier whenNotPaused() {
                _;
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
