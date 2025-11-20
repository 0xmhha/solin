/**
 * Missing Inheritance Security Rule Tests
 *
 * Testing detection of missing inheritance declarations
 */

import { MissingInheritanceRule } from '@/rules/security/missing-inheritance';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MissingInheritanceRule', () => {
  let rule: MissingInheritanceRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MissingInheritanceRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/missing-inheritance');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('missing inheritance patterns', () => {
    test('should detect override without inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function transfer(address to, uint256 amount) public override returns (bool) {
            return true;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/override|inheritance/i);
    });

    test('should detect multiple overrides without inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function foo() public override returns (uint256) {
            return 1;
          }

          function bar() public override returns (uint256) {
            return 2;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });

    test('should detect override modifier without base contract', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          modifier onlyOwner() override {
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

  describe('valid inheritance patterns', () => {
    test('should not report override with inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          function transfer(address to, uint256 amount) public virtual returns (bool);
        }

        contract Example is Base {
          function transfer(address to, uint256 amount) public override returns (bool) {
            return true;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report functions without override', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          function transfer(address to, uint256 amount) public returns (bool) {
            return true;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report virtual functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Base {
          function transfer(address to, uint256 amount) public virtual returns (bool) {
            return true;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report override with multiple inheritance', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract A {
          function foo() public virtual returns (uint256);
        }

        contract B {
          function bar() public virtual returns (uint256);
        }

        contract Example is A, B {
          function foo() public override returns (uint256) {
            return 1;
          }

          function bar() public override returns (uint256) {
            return 2;
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
    test('should handle contracts without functions', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Empty {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle interfaces', async () => {
      const source = `
        pragma solidity ^0.8.0;

        interface IExample {
          function transfer(address to, uint256 amount) external returns (bool);
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle abstract contracts', async () => {
      const source = `
        pragma solidity ^0.8.0;

        abstract contract Example {
          function transfer(address to, uint256 amount) public virtual returns (bool);
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
