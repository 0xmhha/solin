/**
 * Max Line Length Rule Tests
 */

import { MaxLineLengthRule } from '@/rules/lint/max-line-length';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('MaxLineLengthRule', () => {
  let rule: MaxLineLengthRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new MaxLineLengthRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/max-line-length');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('line length violations', () => {
    test('should detect lines exceeding default 120 characters', async () => {
      const longLine = 'a'.repeat(121);
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint ${longLine} = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('exceeds maximum');
    });

    test('should detect multiple long lines', async () => {
      const longLine1 = 'a'.repeat(121);
      const longLine2 = 'b'.repeat(121);
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test1() public { uint ${longLine1} = 1; }
    function test2() public { uint ${longLine2} = 2; }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });

    test('should detect lines exceeding custom max length', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function testWithLongName() public pure returns (uint) { return 1234567890; }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/max-line-length': [Severity.INFO as any, { max: 80 }] },
      });
      const maxLineLengthRule = new MaxLineLengthRule();
      maxLineLengthRule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('acceptable line lengths', () => {
    test('should not report lines within limit', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint x = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report lines exactly at limit', async () => {
      // Line 4 has: "        uint " (13 chars) + variable name + " = 1;" (5 chars)
      // So: 13 + varname + 5 = 120 -> varname = 102
      const exactLine = 'a'.repeat(102);
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint ${exactLine} = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('ignore options', () => {
    test('should ignore comment lines when configured', async () => {
      const longComment = 'x'.repeat(121);
      const source = `pragma solidity ^0.8.0;
// This is a very long comment: ${longComment}
contract Test {
    function test() public {
        uint x = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/max-line-length': [Severity.INFO as any, { ignoreComments: true }] },
      });
      const maxLineLengthRule = new MaxLineLengthRule();
      maxLineLengthRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should ignore lines with long strings when configured', async () => {
      const longString = 'x'.repeat(100);
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = "This is a very long string: ${longString}";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/max-line-length': [Severity.INFO as any, { ignoreStrings: true }] },
      });
      const maxLineLengthRule = new MaxLineLengthRule();
      maxLineLengthRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should still report non-comment lines exceeding limit', async () => {
      const longComment = 'x'.repeat(121);
      const longLine = 'a'.repeat(121);
      const source = `pragma solidity ^0.8.0;
// This is a very long comment: ${longComment}
contract Test {
    function test() public { uint ${longLine} = 1; }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/max-line-length': [Severity.INFO as any, { ignoreComments: true }] },
      });
      const maxLineLengthRule = new MaxLineLengthRule();
      maxLineLengthRule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.message).toContain('exceeds maximum');
    });
  });

  describe('multi-line comments', () => {
    test('should ignore block comment lines when configured', async () => {
      const longComment = 'x'.repeat(121);
      const source = `pragma solidity ^0.8.0;
/*
 * This is a very long comment in a block: ${longComment}
 */
contract Test {
    function test() public {
        uint x = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/max-line-length': [Severity.INFO as any, { ignoreComments: true }] },
      });
      const maxLineLengthRule = new MaxLineLengthRule();
      maxLineLengthRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });
});
