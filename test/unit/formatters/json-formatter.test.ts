/**
 * Tests for JSONFormatter
 */

import { JSONFormatter } from '@/formatters/json-formatter';
import type { AnalysisResult, FileAnalysisResult, Issue } from '@core/types';
import { Severity, Category } from '@core/types';

describe('JSONFormatter', () => {
  let formatter: JSONFormatter;

  beforeEach(() => {
    formatter = new JSONFormatter();
  });

  describe('format', () => {
    test('should format empty results as valid JSON', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: { errors: 0, warnings: 0, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('files');
      expect(parsed).toHaveProperty('totalIssues');
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('duration');
      expect(parsed.totalIssues).toBe(0);
    });

    test('should format single issue as valid JSON', () => {
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
      const parsed = JSON.parse(output);

      expect(parsed.totalIssues).toBe(1);
      expect(parsed.files).toHaveLength(1);
      expect(parsed.files[0].filePath).toBe('test.sol');
      expect(parsed.files[0].issues).toHaveLength(1);
      expect(parsed.files[0].issues[0].ruleId).toBe('security/reentrancy');
      expect(parsed.files[0].issues[0].severity).toBe('error');
      expect(parsed.files[0].issues[0].message).toBe('Potential reentrancy vulnerability');
    });

    test('should format multiple issues as valid JSON', () => {
      const issues: Issue[] = [
        {
          ruleId: 'security/tx-origin',
          severity: Severity.ERROR,
          category: Category.SECURITY,
          message: 'Avoid using tx.origin',
          filePath: 'test.sol',
          location: {
            start: { line: 5, column: 10 },
            end: { line: 5, column: 15 },
          },
        },
        {
          ruleId: 'lint/naming-convention',
          severity: Severity.WARNING,
          category: Category.LINT,
          message: 'Function name should be camelCase',
          filePath: 'test.sol',
          location: {
            start: { line: 8, column: 3 },
            end: { line: 8, column: 15 },
          },
        },
      ];

      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues,
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 2,
        summary: { errors: 1, warnings: 1, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);

      expect(parsed.totalIssues).toBe(2);
      expect(parsed.files[0].issues).toHaveLength(2);
      expect(parsed.summary.errors).toBe(1);
      expect(parsed.summary.warnings).toBe(1);
    });

    test('should use pretty print by default', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: { errors: 0, warnings: 0, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      // Pretty printed JSON should have newlines and indentation
      expect(output).toContain('\n');
      expect(output).toContain('  ');
    });

    test('should support compact mode', () => {
      const formatterCompact = new JSONFormatter({ pretty: false });

      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: { errors: 0, warnings: 0, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatterCompact.format(result);

      // Compact JSON should not have newlines (except at end)
      const lines = output.split('\n').filter((line) => line.trim());
      expect(lines.length).toBe(1);
    });

    test('should include parse errors in JSON', () => {
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
      const parsed = JSON.parse(output);

      expect(parsed.hasParseErrors).toBe(true);
      expect(parsed.files[0].parseErrors).toHaveLength(1);
      expect(parsed.files[0].parseErrors[0].message).toBe('Unexpected token');
      expect(parsed.files[0].parseErrors[0].line).toBe(5);
      expect(parsed.files[0].parseErrors[0].column).toBe(10);
    });

    test('should map severity enum to string', () => {
      const issues: Issue[] = [
        {
          ruleId: 'rule1',
          severity: Severity.ERROR,
          category: Category.SECURITY,
          message: 'Error',
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
          message: 'Warning',
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
          message: 'Info',
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
      const parsed = JSON.parse(output);

      expect(parsed.files[0].issues[0].severity).toBe('error');
      expect(parsed.files[0].issues[1].severity).toBe('warning');
      expect(parsed.files[0].issues[2].severity).toBe('info');
    });
  });
});
