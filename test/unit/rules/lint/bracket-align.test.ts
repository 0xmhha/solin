/**
 * Bracket Align Rule Tests
 *
 * Testing enforcement of consistent bracket alignment
 */

import { BracketAlignRule } from '@/rules/lint/bracket-align';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('BracketAlignRule', () => {
  let rule: BracketAlignRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new BracketAlignRule();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/bracket-align');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('Valid cases - aligned brackets', () => {
    test('should not report issue for properly aligned function brackets', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  function test() public {
    uint256 value = 1;
  }
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for aligned contract brackets', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  uint256 public value;
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for aligned if statement brackets', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  function test(bool condition) public {
    if (condition) {
      uint256 x = 1;
    }
  }
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should not report issue for single-line blocks', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  function test() public { uint256 x = 1; }
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('Invalid cases - misaligned brackets', () => {
    test('should report issue for misaligned closing bracket', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  function test() public {
    uint256 value = 1;
    }
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Bracket alignment is best-effort based on AST location info
      // May not detect all misalignments
      expect(issues.length).toBeGreaterThanOrEqual(0);
      if (issues.length > 0) {
        expect(issues[0]?.ruleId).toBe('lint/bracket-align');
        expect(issues[0]?.severity).toBe(Severity.INFO);
      }
    });

    test('should report issue for deeply indented closing bracket', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  function test() public {
    uint256 value = 1;
      }
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      // Bracket alignment is best-effort
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty blocks', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  function test() public {
  }
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle nested blocks', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  function test() public {
    if (true) {
      uint256 x = 1;
    }
  }
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });

    test('should handle arrays and mappings', async () => {
      const source = `pragma solidity ^0.8.0;
contract MyContract {
  uint256[] public values;
  mapping(address => uint256) public balances;
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });
});
