/**
 * Brace Style Rule Tests
 */

import { BraceStyleRule } from '@/rules/lint/brace-style';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('BraceStyleRule', () => {
  let rule: BraceStyleRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new BraceStyleRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/brace-style');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('1tbs style (default)', () => {
    test('should not report opening brace on same line', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        if (true) {
            return;
        }
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should detect opening brace on new line', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test
{
    function test() public {
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('same line');
    });

    test('should detect function with opening brace on new line', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public
    {
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect if statement with opening brace on new line', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        if (true)
        {
            return;
        }
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('allman style', () => {
    test('should not report opening brace on new line with allman style', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test
{
    function test() public
    {
        if (true)
        {
            return;
        }
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/brace-style': [Severity.INFO as any, { style: 'allman' }] },
      });
      const braceStyleRule = new BraceStyleRule();
      braceStyleRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should detect opening brace on same line with allman style', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/brace-style': [Severity.INFO as any, { style: 'allman' }] },
      });
      const braceStyleRule = new BraceStyleRule();
      braceStyleRule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('new line');
    });
  });

  describe('edge cases', () => {
    test('should handle empty blocks', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public {}
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should handle single-line blocks', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    function test() public { return; }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should handle multiple violations', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test
{
    function test() public
    {
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(2);
    });
  });

  describe('location reporting', () => {
    test('should report correct location for brace style violation', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test
{
    function test() public {
        return;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.location.start.line).toBe(3);
    });
  });
});
