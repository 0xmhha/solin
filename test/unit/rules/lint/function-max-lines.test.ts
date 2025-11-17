/**
 * Function Max Lines Rule Tests
 */

import { FunctionMaxLinesRule } from '@/rules/lint/function-max-lines';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('FunctionMaxLinesRule', () => {
  let rule: FunctionMaxLinesRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new FunctionMaxLinesRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/function-max-lines');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('default max lines (50)', () => {
    test('should not report function with less than 50 lines', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint a = 1;
        uint b = 2;
        uint c = 3;
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should detect function exceeding 50 lines', async () => {
      // Create a function with 52 lines (opening brace to closing brace)
      const functionLines = Array(50).fill('        uint x = 1;').join('\n');
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
${functionLines}
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('50');
    });
  });

  describe('custom max lines', () => {
    test('should respect custom max lines configuration', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint a = 1;
        uint b = 2;
        uint c = 3;
        uint d = 4;
        uint e = 5;
        uint f = 6;
        uint g = 7;
        uint h = 8;
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/function-max-lines': [Severity.INFO as any, { max: 10 }] },
      });
      const functionMaxLinesRule = new FunctionMaxLinesRule();
      functionMaxLinesRule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('10');
    });

    test('should not report when under custom max lines', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        uint a = 1;
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/function-max-lines': [Severity.INFO as any, { max: 100 }] },
      });
      const functionMaxLinesRule = new FunctionMaxLinesRule();
      functionMaxLinesRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('multiple functions', () => {
    test('should detect multiple long functions', async () => {
      const functionLines = Array(50).fill('        uint x = 1;').join('\n');
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test1() public {
${functionLines}
    }

    function test2() public {
${functionLines}
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });

    test('should only report functions exceeding limit', async () => {
      const longFunctionLines = Array(50).fill('        uint x = 1;').join('\n');
      const source = `pragma solidity ^0.8.0;
contract Test {
    function shortFunc() public {
        uint a = 1;
    }

    function longFunc() public {
${longFunctionLines}
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.message).toContain('longFunc');
    });
  });

  describe('edge cases', () => {
    test('should handle single-line functions', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public { return; }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should handle empty functions', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should handle constructors', async () => {
      const functionLines = Array(50).fill('        uint x = 1;').join('\n');
      const source = `pragma solidity ^0.8.0;
contract Test {
    constructor() {
${functionLines}
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('location reporting', () => {
    test('should report correct function name and line count', async () => {
      const functionLines = Array(50).fill('        uint x = 1;').join('\n');
      const source = `pragma solidity ^0.8.0;
contract Test {
    function myFunction() public {
${functionLines}
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.message).toContain('myFunction');
      expect(issues[0]?.message).toContain('52'); // 52 lines total
    });
  });
});
