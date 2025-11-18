/**
 * SARIF Formatter Tests
 *
 * Testing SARIF v2.1.0 output format
 */

import { SarifFormatter } from '@formatters/sarif-formatter';
import type { AnalysisResult, FileAnalysisResult } from '@core/types';
import { Severity, Category } from '@core/types';

describe('SarifFormatter', () => {
  let formatter: SarifFormatter;

  beforeEach(() => {
    formatter = new SarifFormatter();
  });

  describe('Basic SARIF structure', () => {
    test('should generate valid SARIF v2.1.0 report', () => {
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
      const sarif = JSON.parse(output);

      expect(sarif).toHaveProperty('$schema');
      expect(sarif.$schema).toContain('sarif-schema-2.1.0');
      expect(sarif).toHaveProperty('version', '2.1.0');
      expect(sarif).toHaveProperty('runs');
      expect(Array.isArray(sarif.runs)).toBe(true);
    });

    test('should include tool information', () => {
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
      const sarif = JSON.parse(output);

      expect(sarif.runs[0]).toHaveProperty('tool');
      expect(sarif.runs[0].tool).toHaveProperty('driver');
      expect(sarif.runs[0].tool.driver).toMatchObject({
        name: 'Solin',
        version: '0.1.0',
      });
    });
  });

  describe('Issue reporting', () => {
    test('should report single issue', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'security/reentrancy',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Potential reentrancy vulnerability detected',
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
      const sarif = JSON.parse(output);

      expect(sarif.runs[0].results).toHaveLength(1);

      const sarifResult = sarif.runs[0].results[0];
      expect(sarifResult).toMatchObject({
        ruleId: 'security/reentrancy',
        level: 'error',
        message: {
          text: 'Potential reentrancy vulnerability detected',
        },
      });
    });

    test('should report multiple issues', () => {
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
      const sarif = JSON.parse(output);

      expect(sarif.runs[0].results).toHaveLength(2);
    });

    test('should include location information', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'contracts/Token.sol',
        issues: [
          {
            filePath: 'contracts/Token.sol',
            ruleId: 'security/tx-origin',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Use of tx.origin is dangerous',
            location: {
              start: { line: 15, column: 8 },
              end: { line: 15, column: 20 },
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
      const sarif = JSON.parse(output);

      const location = sarif.runs[0].results[0].locations[0];
      expect(location).toMatchObject({
        physicalLocation: {
          artifactLocation: {
            uri: 'contracts/Token.sol',
            uriBaseId: '%SRCROOT%',
          },
          region: {
            startLine: 15,
            startColumn: 9, // SARIF uses 1-based columns
            endLine: 15,
            endColumn: 21,
          },
        },
      });
    });
  });

  describe('Severity mapping', () => {
    test('should map ERROR to error level', () => {
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
      const sarif = JSON.parse(output);

      expect(sarif.runs[0].results[0].level).toBe('error');
    });

    test('should map WARNING to warning level', () => {
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
      const sarif = JSON.parse(output);

      expect(sarif.runs[0].results[0].level).toBe('warning');
    });

    test('should map INFO to note level', () => {
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
      const sarif = JSON.parse(output);

      expect(sarif.runs[0].results[0].level).toBe('note');
    });
  });

  describe('Rule metadata', () => {
    test('should include rules with metadata', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'security/reentrancy',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Reentrancy vulnerability',
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
      const sarif = JSON.parse(output);

      expect(sarif.runs[0].tool.driver.rules).toHaveLength(1);

      const rule = sarif.runs[0].tool.driver.rules[0];
      expect(rule).toMatchObject({
        id: 'security/reentrancy',
        name: 'Reentrancy',
        shortDescription: {
          text: 'Reentrancy vulnerability',
        },
      });
    });

    test('should include help URI', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'security/tx-origin',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Tx.origin usage',
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
      const sarif = JSON.parse(output);

      const rule = sarif.runs[0].tool.driver.rules[0];
      expect(rule).toHaveProperty('helpUri');
      expect(rule.helpUri).toContain('security-tx-origin');
    });

    test('should include tags', () => {
      const fileResult: FileAnalysisResult = {
        filePath: 'test.sol',
        issues: [
          {
            filePath: 'test.sol',
            ruleId: 'security/reentrancy',
            severity: Severity.ERROR,
            category: Category.SECURITY,
            message: 'Reentrancy',
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
      const sarif = JSON.parse(output);

      const rule = sarif.runs[0].tool.driver.rules[0];
      expect(rule.properties).toHaveProperty('tags');
      expect(Array.isArray(rule.properties.tags)).toBe(true);
      expect(rule.properties.tags).toContain('security');
    });
  });

  describe('Formatting options', () => {
    test('should support pretty printing', () => {
      const formatter = new SarifFormatter({ pretty: true });

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

      // Pretty printed JSON should have newlines and indentation
      expect(output).toContain('\n');
      expect(output).toContain('  ');
    });

    test('should support compact output', () => {
      const formatter = new SarifFormatter({ pretty: false });

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

      // Compact JSON should not have indentation
      const lines = output.split('\n');
      expect(lines.length).toBe(1);
    });

    test('should support disabling rule help', () => {
      const formatter = new SarifFormatter({ includeRuleHelp: false });

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
      const sarif = JSON.parse(output);

      const rule = sarif.runs[0].tool.driver.rules[0];
      expect(rule).not.toHaveProperty('helpUri');
      expect(rule).not.toHaveProperty('fullDescription');
    });
  });

  describe('Multiple files', () => {
    test('should report issues from multiple files', () => {
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
      const sarif = JSON.parse(output);

      expect(sarif.runs[0].results).toHaveLength(2);

      // Check that both files are referenced
      const uris = sarif.runs[0].results.map(
        (r: any) => r.locations[0].physicalLocation.artifactLocation.uri,
      );
      expect(uris).toContain('contracts/Token.sol');
      expect(uris).toContain('contracts/Vault.sol');
    });
  });
});
