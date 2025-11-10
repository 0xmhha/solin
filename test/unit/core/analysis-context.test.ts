/**
 * Analysis Context Tests
 *
 * Testing the analysis context provided to rules
 */

import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('AnalysisContext', () => {
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('constructor', () => {
    test('should create AnalysisContext instance', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      expect(context).toBeInstanceOf(AnalysisContext);
      expect(context.filePath).toBe('test.sol');
      expect(context.sourceCode).toBe(source);
      expect(context.ast).toBe(ast);
      expect(context.config).toBe(config);
    });
  });

  describe('report', () => {
    test('should collect reported issues', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      context.report({
        ruleId: 'test/rule',
        severity: Severity.ERROR,
        category: Category.LINT,
        message: 'Test issue',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 },
        },
      });

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]?.ruleId).toBe('test/rule');
      expect(issues[0]?.message).toBe('Test issue');
      expect(issues[0]?.filePath).toBe('test.sol');
    });

    test('should collect multiple issues', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      context.report({
        ruleId: 'test/rule1',
        severity: Severity.ERROR,
        category: Category.LINT,
        message: 'Issue 1',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 },
        },
      });

      context.report({
        ruleId: 'test/rule2',
        severity: Severity.WARNING,
        category: Category.SECURITY,
        message: 'Issue 2',
        location: {
          start: { line: 2, column: 0 },
          end: { line: 2, column: 10 },
        },
      });

      const issues = context.getIssues();
      expect(issues).toHaveLength(2);
    });
  });

  describe('getSourceText', () => {
    test('should return source text for a range', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
  uint256 value;
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      const text = context.getSourceText({
        start: { line: 1, column: 0 },
        end: { line: 1, column: 6 },
      });

      expect(text).toBe('pragma');
    });

    test('should handle multi-line ranges', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
  uint256 value;
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      const text = context.getSourceText({
        start: { line: 2, column: 0 },
        end: { line: 3, column: 16 },
      });

      expect(text).toContain('contract Test');
      expect(text).toContain('uint256 value');
    });
  });

  describe('getLineText', () => {
    test('should return text for a specific line', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {
  uint256 value;
}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      const line1 = context.getLineText(1);
      expect(line1).toBe('pragma solidity ^0.8.0;');

      const line2 = context.getLineText(2);
      expect(line2).toBe('contract Test {');
    });

    test('should return empty string for invalid line', async () => {
      const source = `pragma solidity ^0.8.0;
contract Test {}`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      const line = context.getLineText(100);
      expect(line).toBe('');
    });
  });

  describe('getIssues', () => {
    test('should return empty array initially', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      expect(context.getIssues()).toEqual([]);
    });

    test('should return all reported issues', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      context.report({
        ruleId: 'test/rule',
        severity: Severity.ERROR,
        category: Category.LINT,
        message: 'Test issue',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 },
        },
      });

      const issues = context.getIssues();
      expect(issues).toHaveLength(1);
      expect(issues[0]).toHaveProperty('filePath', 'test.sol');
    });
  });

  describe('helper methods', () => {
    test('should provide access to parser and walker', async () => {
      const source = `
        pragma solidity ^0.8.0;
        contract Test {}
      `;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      expect(context.ast).toBeDefined();
      expect(context.sourceCode).toBeDefined();
    });
  });
});
