/**
 * HTML Formatter Tests
 *
 * Testing HTML report generation
 */

import { HtmlFormatter } from '@formatters/html-formatter';
import type { AnalysisResult, FileAnalysisResult } from '@core/types';
import { Severity, Category } from '@core/types';

describe('HtmlFormatter', () => {
  let formatter: HtmlFormatter;

  beforeEach(() => {
    formatter = new HtmlFormatter();
  });

  describe('Basic HTML structure', () => {
    test('should generate valid HTML document', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('<!DOCTYPE html>');
      expect(output).toContain('<html lang="en">');
      expect(output).toContain('</html>');
      expect(output).toContain('<head>');
      expect(output).toContain('<body>');
    });

    test('should include title in head', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('<title>Solin Analysis Report</title>');
    });

    test('should support custom title', () => {
      const formatter = new HtmlFormatter({ title: 'Custom Report' });

      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('<title>Custom Report</title>');
      expect(output).toContain('<h1>Custom Report</h1>');
    });
  });

  describe('CSS and JavaScript inclusion', () => {
    test('should include CSS by default', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('<style>');
      expect(output).toContain('</style>');
    });

    test('should include JavaScript by default', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('<script>');
      expect(output).toContain('</script>');
    });

    test('should exclude CSS when disabled', () => {
      const formatter = new HtmlFormatter({ includeStyles: false });

      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).not.toContain('<style>');
    });

    test('should exclude JavaScript when disabled', () => {
      const formatter = new HtmlFormatter({ includeScripts: false });

      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).not.toContain('<script>');
    });
  });

  describe('Summary statistics', () => {
    test('should display summary cards', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 10,
        summary: {
          errors: 3,
          warnings: 5,
          info: 2,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('Total Issues');
      expect(output).toContain('>10<');
      expect(output).toContain('Errors');
      expect(output).toContain('>3<');
      expect(output).toContain('Warnings');
      expect(output).toContain('>5<');
      expect(output).toContain('Info');
      expect(output).toContain('>2<');
    });
  });

  describe('Issue reporting', () => {
    test('should display "no issues" message when no issues found', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('No issues found');
    });

    test('should display issues table when issues exist', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'security/reentrancy',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Potential reentrancy vulnerability',
            location: {
              start: { line: 10, column: 4 },
              end: { line: 10, column: 20 },
            },
          },
        ],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 1,
        summary: {
          errors: 1,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('<table');
      expect(output).toContain('security/reentrancy');
      expect(output).toContain('Potential reentrancy vulnerability');
      expect(output).toContain('10:4');
    });

    test('should display multiple issues', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'security/reentrancy',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Reentrancy detected',
            location: {
              start: { line: 10, column: 4 },
              end: { line: 10, column: 20 },
            },
          },
          {
            filePath: 'test.sol',
            ruleId: 'lint/naming-convention',
            severity: Severity.WARNING,
            category: Category.LINT,
            message: 'Variable name should be camelCase',
            location: {
              start: { line: 5, column: 8 },
              end: { line: 5, column: 15 },
            },
          },
        ],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 2,
        summary: {
          errors: 1,
          warnings: 1,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('security/reentrancy');
      expect(output).toContain('lint/naming-convention');
    });
  });

  describe('Severity display', () => {
    test('should display error severity', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'test/rule',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Error message',
            location: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
        ],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 1,
        summary: {
          errors: 1,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('severity error');
      expect(output).toContain('>Error<');
    });

    test('should display warning severity', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'test/rule',
            severity: Severity.WARNING,
            category: Category.LINT,
            message: 'Warning message',
            location: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
        ],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 1,
        summary: {
          errors: 0,
          warnings: 1,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('severity warning');
      expect(output).toContain('>Warning<');
    });

    test('should display info severity', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'test/rule',
            severity: Severity.INFO,
            category: Category.LINT,
            message: 'Info message',
            location: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
        ],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 1,
        summary: {
          errors: 0,
          warnings: 0,
          info: 1,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('severity info');
      expect(output).toContain('>Info<');
    });
  });

  describe('Interactive features', () => {
    test('should include filters when interactive', () => {
      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('id="searchBox"');
      expect(output).toContain('filter-severity');
    });

    test('should not include filters when not interactive', () => {
      const formatter = new HtmlFormatter({ interactive: false });

      const result: AnalysisResult = {
        files: [],
        totalIssues: 0,
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).not.toContain('id="searchBox"');
      expect(output).not.toContain('filter-severity');
    });

    test('should include sortTable function when interactive', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'test/rule',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Test',
            location: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
        ],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 1,
        summary: {
          errors: 1,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('function sortTable');
      expect(output).toContain('onclick="sortTable');
    });
  });

  describe('HTML escaping', () => {
    test('should escape HTML special characters in messages', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'test/rule',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Message with <script>alert("XSS")</script>',
            location: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
        ],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 1,
        summary: {
          errors: 1,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).not.toContain('<script>alert("XSS")</script>');
      expect(output).toContain('&lt;script&gt;');
      expect(output).toContain('&quot;XSS&quot;');
    });

    test('should escape HTML in file paths', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'contracts/<test>.sol',
        issues: [
          {
            filePath: 'contracts/<test>.sol',
            ruleId: 'test/rule',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Test',
            location: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
        ],
        duration: 50,
      };

      const result: AnalysisResult = {
        files: [fileResult],
        totalIssues: 1,
        summary: {
          errors: 1,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('&lt;test&gt;.sol');
    });
  });

  describe('Multiple files', () => {
    test('should display issues from multiple files', () => {
      const result: AnalysisResult = {
        files: [
          {
            filePath: 'contracts/Token.sol',
            issues: [
              {
                filePath: 'contracts/Token.sol',
                ruleId: 'security/reentrancy',
                severity: Severity.ERROR,
                category: Category.SECURITY,
                message: 'Reentrancy in Token',
                location: {
                  start: { line: 10, column: 4 },
                  end: { line: 10, column: 20 },
                },
              },
            ],
            duration: 50,
          },
          {
            filePath: 'contracts/Vault.sol',
            issues: [
              {
                filePath: 'contracts/Vault.sol',
                ruleId: 'security/tx-origin',
                severity: Severity.ERROR,
                category: Category.SECURITY,
                message: 'Tx.origin in Vault',
                location: {
                  start: { line: 15, column: 8 },
                  end: { line: 15, column: 20 },
                },
              },
            ],
            duration: 50,
          },
        ],
        totalIssues: 2,
        summary: {
          errors: 2,
          warnings: 0,
          info: 0,
        },
        duration: 100,
        hasParseErrors: false,
      };

      const output = formatter.format(result);

      expect(output).toContain('contracts/Token.sol');
      expect(output).toContain('contracts/Vault.sol');
      expect(output).toContain('Reentrancy in Token');
      expect(output).toContain('Tx.origin in Vault');
    });
  });
});
