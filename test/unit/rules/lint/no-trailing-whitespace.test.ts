/**
 * No Trailing Whitespace Rule Tests
 */

import { NoTrailingWhitespaceRule } from '@/rules/lint/no-trailing-whitespace';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('NoTrailingWhitespaceRule', () => {
  let rule: NoTrailingWhitespaceRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new NoTrailingWhitespaceRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/no-trailing-whitespace');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('trailing whitespace detection', () => {
    test('should detect single trailing space', async () => {
      // Using explicit concatenation to add trailing space
      const source =
        'pragma solidity ^0.8.0; \n' +
        'contract Test {\n' +
        '    function test() public {\n' +
        '        uint x = 1;\n' +
        '    }\n' +
        '}';
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('1 trailing whitespace character');
    });

    test('should detect multiple trailing spaces', async () => {
      // Using explicit concatenation to add trailing spaces
      const source =
        'pragma solidity ^0.8.0;   \n' +
        'contract Test {\n' +
        '    function test() public {\n' +
        '        uint x = 1;\n' +
        '    }\n' +
        '}';
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('3 trailing whitespace characters');
    });

    test('should detect trailing tabs', async () => {
      const source = `pragma solidity ^0.8.0;\t
contract Test {
    function test() public {
        uint x = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('trailing whitespace');
    });

    test('should detect mixed trailing whitespace', async () => {
      const source = `pragma solidity ^0.8.0; \t
contract Test {
    function test() public {
        uint x = 1;
    }
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should detect multiple lines with trailing whitespace', async () => {
      const source =
        'pragma solidity ^0.8.0; \n' +
        'contract Test { \n' +
        '    function test() public {\n' +
        '        uint x = 1; \n' +
        '    }\n' +
        '}';
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(3);
    });
  });

  describe('clean code', () => {
    test('should not report lines without trailing whitespace', async () => {
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

    test('should not report empty lines', async () => {
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
  });

  describe('blank lines with whitespace', () => {
    test('should detect blank lines with only whitespace by default', async () => {
      const source =
        'pragma solidity ^0.8.0;\n' +
        '   \n' + // Blank line with spaces
        'contract Test {\n' +
        '    function test() public {\n' +
        '        uint x = 1;\n' +
        '    }\n' +
        '}';
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
    });

    test('should skip blank lines with whitespace when configured', async () => {
      const source =
        'pragma solidity ^0.8.0;\n' +
        '   \n' + // Blank line with spaces
        'contract Test {\n' +
        '    function test() public {\n' +
        '        uint x = 1;\n' +
        '    }\n' +
        '}';
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/no-trailing-whitespace': [Severity.INFO as any, { skipBlankLines: true }] },
      });
      const noTrailingWhitespaceRule = new NoTrailingWhitespaceRule();
      noTrailingWhitespaceRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should still detect trailing whitespace on non-blank lines when skipBlankLines is true', async () => {
      const source =
        'pragma solidity ^0.8.0; \n' + // Trailing space on non-blank line
        '   \n' + // Blank line with spaces (should be skipped)
        'contract Test {\n' +
        '    function test() public {\n' +
        '        uint x = 1;\n' +
        '    }\n' +
        '}';
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/no-trailing-whitespace': [Severity.INFO as any, { skipBlankLines: true }] },
      });
      const noTrailingWhitespaceRule = new NoTrailingWhitespaceRule();
      noTrailingWhitespaceRule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.location.start.line).toBe(1);
    });
  });

  describe('location reporting', () => {
    test('should report correct column positions for trailing whitespace', async () => {
      const source =
        'pragma solidity ^0.8.0;  \n' + // Line length 25, 2 trailing spaces
        'contract Test {\n' +
        '    function test() public {\n' +
        '        uint x = 1;\n' +
        '    }\n' +
        '}';
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBe(1);
      expect(issues[0]?.location.start.column).toBe(23); // Start of trailing whitespace
      expect(issues[0]?.location.end.column).toBe(25); // End of line
    });
  });
});
