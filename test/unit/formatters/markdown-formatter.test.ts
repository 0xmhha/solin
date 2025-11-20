/**
 * Tests for MarkdownFormatter
 */

import { MarkdownFormatter } from '@/formatters/markdown-formatter';
import type { AnalysisResult, FileAnalysisResult, Issue } from '@core/types';
import { Severity, Category } from '@core/types';

describe('MarkdownFormatter', () => {
  let formatter: MarkdownFormatter;

  beforeEach(() => {
    formatter = new MarkdownFormatter();
  });

  describe('format', () => {
    test('should format empty results as valid Markdown', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: { errors: 0, warnings: 0, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('# Solin Analysis Report');
      expect(output).toContain('No issues found');
      expect(output).toContain('## Summary');
    });

    test('should format single issue with proper Markdown structure', () => {
      const issue: Issue = {
        ruleId: 'security/reentrancy',
        severity: Severity.ERROR,
        category: Category.SECURITY,
        message: 'Potential reentrancy vulnerability',
        filePath: 'test.sol',
        location: {
          start: { line: 10, column: 5 },
          end: { line: 10, column: 20 },
        },
      };

      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [issue],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 1,
        summary: { errors: 1, warnings: 0, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('# Solin Analysis Report');
      expect(output).toContain('## test.sol');
      expect(output).toContain('### :x: Error');
      expect(output).toContain('Potential reentrancy vulnerability');
      expect(output).toContain('Line 10:5');
      expect(output).toContain('`security/reentrancy`');
    });

    test('should format multiple issues grouped by file', () => {
      const issues1: Issue[] = [
        {
          ruleId: 'security/tx-origin',
          severity: Severity.ERROR,
          category: Category.SECURITY,
          message: 'Avoid using tx.origin',
          filePath: 'test1.sol',
          location: {
            start: { line: 5, column: 10 },
            end: { line: 5, column: 15 },
          },
        },
      ];

      const issues2: Issue[] = [
        {
          ruleId: 'lint/naming-convention',
          severity: Severity.WARNING,
          category: Category.LINT,
          message: 'Function name should be camelCase',
          filePath: 'test2.sol',
          location: {
            start: { line: 8, column: 3 },
            end: { line: 8, column: 15 },
          },
        },
      ];

      const result: AnalysisResult = {
        files: [
          {
            filePath: 'test1.sol',
            issues: issues1,
            duration: 30,
          },
          {
            filePath: 'test2.sol',
            issues: issues2,
            duration: 40,
          },
        ],
        totalIssues: 2,
        summary: { errors: 1, warnings: 1, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('## test1.sol');
      expect(output).toContain('## test2.sol');
      expect(output).toContain(':x: Error');
      expect(output).toContain(':warning: Warning');
    });

    test('should format severity levels with appropriate icons', () => {
      const issues: Issue[] = [
        {
          ruleId: 'rule1',
          severity: Severity.ERROR,
          category: Category.SECURITY,
          message: 'Error message',
          filePath: 'test.sol',
          location: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 5 },
          },
        },
        {
          ruleId: 'rule2',
          severity: Severity.WARNING,
          category: Category.LINT,
          message: 'Warning message',
          filePath: 'test.sol',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 5 },
          },
        },
        {
          ruleId: 'rule3',
          severity: Severity.INFO,
          category: Category.LINT,
          message: 'Info message',
          filePath: 'test.sol',
          location: {
            start: { line: 3, column: 1 },
            end: { line: 3, column: 5 },
          },
        },
      ];

      const result: AnalysisResult = {
        files: [
          {
            filePath: 'test.sol',
            issues,
            duration: 50,
          },
        ],
        totalIssues: 3,
        summary: { errors: 1, warnings: 1, info: 1 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain(':x: Error');
      expect(output).toContain(':warning: Warning');
      expect(output).toContain(':information_source: Info');
    });

    test('should include summary statistics', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 10,
        summary: { errors: 3, warnings: 5, info: 2 },
        duration: 250,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('## Summary');
      expect(output).toContain('**Total Issues**: 10');
      expect(output).toContain('**Errors**: 3');
      expect(output).toContain('**Warnings**: 5');
      expect(output).toContain('**Info**: 2');
      expect(output).toContain('**Duration**: 250ms');
    });

    test('should include parse errors section', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'broken.sol',
        issues: [],
        parseErrors: [
          {
            message: 'Unexpected token',
            line: 5,
            column: 10,
          },
        ],
        duration: 30,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 0,
        summary: { errors: 0, warnings: 0, info: 0 },
        duration: 50,
        hasParseErrors: true,
      };

      const output = formatter.format(result);

      expect(output).toContain('## Parse Errors');
      expect(output).toContain('### broken.sol');
      expect(output).toContain('Unexpected token');
      expect(output).toContain('Line 5:10');
    });

    test('should create tables for issues with showTable option', () => {
      const formatterWithTable = new MarkdownFormatter({ showTable: true });

      const issue: Issue = {
        ruleId: 'security/reentrancy',
        severity: Severity.ERROR,
        category: Category.SECURITY,
        message: 'Potential reentrancy',
        filePath: 'test.sol',
        location: {
          start: { line: 10, column: 5 },
          end: { line: 10, column: 20 },
        },
      };

      const result: AnalysisResult = {
        files: [
          {
            filePath: 'test.sol',
            issues: [issue],
            duration: 50,
          },
        ],
        totalIssues: 1,
        summary: { errors: 1, warnings: 0, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatterWithTable.format(result);

      expect(output).toContain('| Location | Severity | Message | Rule |');
      expect(output).toContain('| --- | --- | --- | --- |');
      expect(output).toContain('| 10:5 |');
    });
  });
});
