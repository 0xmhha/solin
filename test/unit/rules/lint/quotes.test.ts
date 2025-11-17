/**
 * Quotes Rule Tests
 */

import { QuotesRule } from '@/rules/lint/quotes';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('QuotesRule', () => {
  let rule: QuotesRule;
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new QuotesRule();
    parser = new SolidityParser();
    config = { basePath: '/test', rules: {} };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('lint/quotes');
      expect(rule.metadata.category).toBe(Category.LINT);
      expect(rule.metadata.severity).toBe(Severity.INFO);
    });
  });

  describe('single quote preference (default)', () => {
    test('should detect double quotes when single quotes preferred', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = "Hello World";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('single quotes');
    });

    test('should not report single quotes when single quotes preferred', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = 'Hello World';
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should detect multiple double quotes', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public a = "Hello";
    string public b = "World";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues().length).toBe(2);
    });
  });

  describe('double quote preference', () => {
    test('should detect single quotes when double quotes preferred', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = 'Hello World';
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/quotes': [Severity.INFO as any, { style: 'double' }] },
      });
      const quotesRule = new QuotesRule();
      quotesRule.analyze(context);
      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.message).toContain('double quotes');
    });

    test('should not report double quotes when double quotes preferred', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = "Hello World";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/quotes': [Severity.INFO as any, { style: 'double' }] },
      });
      const quotesRule = new QuotesRule();
      quotesRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('special characters', () => {
    test('should allow double quotes for single quote escaping (avoidEscape)', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = "It's a test";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/quotes': [Severity.INFO as any, { style: 'single', avoidEscape: true }] },
      });
      const quotesRule = new QuotesRule();
      quotesRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should allow single quotes for double quote escaping (avoidEscape)', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = 'He said "Hello"';
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/quotes': [Severity.INFO as any, { style: 'double', avoidEscape: true }] },
      });
      const quotesRule = new QuotesRule();
      quotesRule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should report when avoidEscape is false', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = "It's a test";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, {
        ...config,
        rules: { 'lint/quotes': [Severity.INFO as any, { style: 'single', avoidEscape: false }] },
      });
      const quotesRule = new QuotesRule();
      quotesRule.analyze(context);
      expect(context.getIssues().length).toBeGreaterThan(0);
    });
  });

  describe('hex strings and unicode strings', () => {
    test('should not report hex strings', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    bytes public data = hex"deadbeef";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });

    test('should not report unicode strings', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public emoji = unicode"😀";
}`;
      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);
      rule.analyze(context);
      expect(context.getIssues()).toHaveLength(0);
    });
  });

  describe('location reporting', () => {
    test('should report correct location for quote mismatch', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
    string public message = "Hello";
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
