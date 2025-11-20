/**
 * Boolean Constant Security Rule Tests
 *
 * Testing detection of comparisons with boolean constants
 */

import { BooleanConstantRule } from '@/rules/security/boolean-cst';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('BooleanConstantRule', () => {
  let rule: BooleanConstantRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new BooleanConstantRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('security/boolean-cst');
      expect(rule.metadata.category).toBe(Category.SECURITY);
      expect(rule.metadata.severity).toBe(Severity.WARNING);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('boolean constant comparisons', () => {
    test('should detect comparison with true using ==', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function check() public view returns (bool) {
            return flag == true;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/boolean constant|true/i);
    });

    test('should detect comparison with false using ==', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function check() public view returns (bool) {
            return flag == false;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toMatch(/boolean constant|false/i);
    });

    test('should detect comparison with true using !=', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function check() public view returns (bool) {
            return flag != true;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect comparison with false using !=', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function check() public view returns (bool) {
            if (flag != false) {
              return true;
            }
            return false;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect boolean constant in require', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public approved;

          function execute() public {
            require(approved == true, "Not approved");
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple boolean constant comparisons', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag1;
          bool public flag2;

          function check() public view returns (bool) {
            return flag1 == true && flag2 == false;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });

    test('should detect boolean constant on left side', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function check() public view returns (bool) {
            return true == flag;
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

  describe('valid boolean usage', () => {
    test('should not report direct boolean usage', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function check() public view returns (bool) {
            return flag;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report negated boolean', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function check() public view returns (bool) {
            return !flag;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report boolean assignment', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function setFlag(bool value) public {
            flag = value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report boolean in logical operations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag1;
          bool public flag2;

          function check() public view returns (bool) {
            return flag1 && flag2;
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
    test('should handle contracts without boolean operations', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Simple {
          uint256 public value;

          function getValue() public view returns (uint256) {
            return value;
          }
        }
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle nested boolean comparisons', async () => {
      const source = `
        pragma solidity ^0.8.0;

        contract Example {
          bool public flag;

          function check() public view returns (bool) {
            return (flag == true) && (flag != false);
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
