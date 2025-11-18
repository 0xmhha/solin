/**
 * Tests for StylishFormatter
 */

import { StylishFormatter } from '@/formatters/stylish-formatter';
import type { AnalysisResult, FileAnalysisResult, Issue } from '@core/types';
import { Severity, Category } from '@core/types';

describe('StylishFormatter', () => {
  let formatter: StylishFormatter;

  beforeEach(() => {
    formatter = new StylishFormatter();
  });

  describe('format', () => {
    test('should format empty results', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: { errors: 0, warnings: 0, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('No issues found');
      expect(output).toContain('0 errors');
      expect(output).toContain('0 warnings');
    });

    test('should format single issue', () => {
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

      expect(output).toContain('test.sol');
      expect(output).toContain('10:5');
      expect(output).toContain('error');
      expect(output).toContain('Potential reentrancy vulnerability');
      expect(output).toContain('security/reentrancy');
      expect(output).toContain('1 error');
    });

    test('should format multiple issues', () => {
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

      expect(output).toContain('test.sol');
      expect(output).toContain('5:10');
      expect(output).toContain('error');
      expect(output).toContain('Avoid using tx.origin');
      expect(output).toContain('8:3');
      expect(output).toContain('warning');
      expect(output).toContain('Function name should be camelCase');
      expect(output).toContain('1 error');
      expect(output).toContain('1 warning');
    });

    test('should format multiple files', () => {
      const fileResult1: FileAnalysisResult = {
        filePath: 'contract1.sol',
        issues: [
          {
            ruleId: 'security/reentrancy',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Reentrancy detected',
            filePath: 'contract1.sol',
            location: {
              start: { line: 10, column: 5 },
              end: { line: 10, column: 20 },
            },
          },
        ],
        duration: 50,
      };

      const fileResult2: FileAnalysisResult = {
        filePath: 'contract2.sol',
        issues: [
          {
            ruleId: 'lint/no-console',
            severity: Severity.WARNING,
            category: Category.LINT,
            message: 'Avoid console.log in production',
            filePath: 'contract2.sol',
            location: {
              start: { line: 15, column: 8 },
              end: { line: 15, column: 25 },
            },
          },
        ],
        duration: 40,
      };

      const result: AnalysisResult = {
        files: [fileResult1, fileResult2],
        totalIssues: 2,
        summary: { errors: 1, warnings: 1, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('contract1.sol');
      expect(output).toContain('contract2.sol');
      expect(output).toContain('Reentrancy detected');
      expect(output).toContain('Avoid console.log');
      expect(output).toContain('1 error');
      expect(output).toContain('1 warning');
    });

    test('should format with parse errors', () => {
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

      expect(output).toContain('broken.sol');
      expect(output).toContain('Parse Error');
      expect(output).toContain('5:10');
      expect(output).toContain('Unexpected token');
    });

    test('should sort issues by severity', () => {
      const issues: Issue[] = [
        {
          ruleId: 'lint/naming',
          severity: Severity.INFO,
          category: Category.LINT,
          message: 'Info message',
          filePath: 'test.sol',
          location: {
            start: { line: 3, column: 1 },
            end: { line: 3, column: 5 },
          },
        },
        {
          ruleId: 'security/issue',
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
          ruleId: 'lint/style',
          severity: Severity.WARNING,
          category: Category.LINT,
          message: 'Warning message',
          filePath: 'test.sol',
          location: {
            start: { line: 2, column: 1 },
            end: { line: 2, column: 5 },
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
        totalIssues: 3,
        summary: { errors: 1, warnings: 1, info: 1 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);
      const lines = output.split('\n');

      // Error should appear before warning, warning before info
      const errorIndex = lines.findIndex((line) => line.includes('Error message'));
      const warningIndex = lines.findIndex((line) => line.includes('Warning message'));
      const infoIndex = lines.findIndex((line) => line.includes('Info message'));

      expect(errorIndex).toBeLessThan(warningIndex);
      expect(warningIndex).toBeLessThan(infoIndex);
    });
  });

  describe('color codes', () => {
    test('should use red for errors', () => {
      const issue: Issue = {
        ruleId: 'security/error',
        severity: Severity.ERROR,
        category: Category.SECURITY,
        message: 'Error',
        filePath: 'test.sol',
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 5 },
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

      const output = formatter.format(result);

      // Check that output contains ANSI color codes for red (error)
      expect(output).toMatch(/\x1b\[31m.*error.*\x1b\[39m/i);
    });

    test('should use yellow for warnings', () => {
      const issue: Issue = {
        ruleId: 'lint/warning',
        severity: Severity.WARNING,
        category: Category.LINT,
        message: 'Warning',
        filePath: 'test.sol',
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 5 },
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
        summary: { errors: 0, warnings: 1, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      // Check that output contains ANSI color codes for yellow (warning)
      expect(output).toMatch(/\x1b\[33m.*warning.*\x1b\[39m/i);
    });
  });
});
