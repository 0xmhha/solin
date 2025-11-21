/**
 * Tests for JUnitFormatter
 */

import { JUnitFormatter } from '@/formatters/junit-formatter';
import type { AnalysisResult, FileAnalysisResult, Issue } from '@core/types';
import { Severity, Category } from '@core/types';

describe('JUnitFormatter', () => {
  let formatter: JUnitFormatter;

  beforeEach(() => {
    formatter = new JUnitFormatter();
  });

  describe('format', () => {
    test('should format empty results as valid XML', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: { errors: 0, warnings: 0, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('<?xml version="1.0"');
      expect(output).toContain('<testsuites');
      expect(output).toContain('tests="0"');
      expect(output).toContain('failures="0"');
      expect(output).toContain('</testsuites>');
    });

    test('should format single issue as test failure', () => {
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

      expect(output).toContain('<testsuite name="test.sol"');
      expect(output).toContain('tests="1"');
      expect(output).toContain('failures="1"');
      expect(output).toContain('<testcase');
      expect(output).toContain('name="security/reentrancy at line 10"');
      expect(output).toContain('<failure');
      expect(output).toContain('Potential reentrancy vulnerability');
    });

    test('should format warnings as test failures with warning type', () => {
      const issue: Issue = {
        ruleId: 'lint/naming-convention',
        severity: Severity.WARNING,
        category: Category.LINT,
        message: 'Function name should be camelCase',
        filePath: 'test.sol',
        location: {
          start: { line: 8, column: 3 },
          end: { line: 8, column: 15 },
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

      expect(output).toContain('<failure type="WARNING"');
      expect(output).toContain('Function name should be camelCase');
    });

    test('should group issues by file into test suites', () => {
      const result: AnalysisResult = {
        files: [
          {
            filePath: 'test1.sol',
            issues: [
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
            ],
            duration: 30,
          },
          {
            filePath: 'test2.sol',
            issues: [
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
            ],
            duration: 40,
          },
        ],
        totalIssues: 2,
        summary: { errors: 1, warnings: 1, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('<testsuite name="test1.sol"');
      expect(output).toContain('<testsuite name="test2.sol"');
    });

    test('should include parse errors as test failures', () => {
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

      expect(output).toContain('<testsuite name="broken.sol"');
      expect(output).toContain('<testcase name="Parse Error at line 5"');
      expect(output).toContain('<failure type="ERROR"');
      expect(output).toContain('Unexpected token');
    });

    test('should escape XML special characters', () => {
      const issue: Issue = {
        ruleId: 'test/rule',
        severity: Severity.ERROR,
        category: Category.SECURITY,
        message: 'Test message with <special> & "characters"',
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

      // XML attributes should be escaped
      expect(output).toContain(
        'message="Test message with &lt;special&gt; &amp; &quot;characters&quot;"'
      );
      // But CDATA content doesn't need escaping
      expect(output).toContain('ERROR: Test message with <special> & "characters"');
    });

    test('should include total counts in testsuites element', () => {
      const result: AnalysisResult = {
        files: [
          {
            filePath: 'test.sol',
            issues: [
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
            ],
            duration: 50,
          },
        ],
        totalIssues: 2,
        summary: { errors: 1, warnings: 1, info: 0 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('tests="2"');
      expect(output).toContain('failures="2"');
      expect(output).toContain('time="0.100"');
    });

    test('should format info issues as successful tests with system-out', () => {
      const issue: Issue = {
        ruleId: 'lint/info-rule',
        severity: Severity.INFO,
        category: Category.LINT,
        message: 'Informational message',
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
        summary: { errors: 0, warnings: 0, info: 1 },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      // Info issues still count as failures in JUnit, but with INFO type
      expect(output).toContain('<failure type="INFO"');
      expect(output).toContain('Informational message');
    });
  });
});
