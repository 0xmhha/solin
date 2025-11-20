/**
 * JUnit Formatter
 *
 * Formats analysis results as JUnit XML for CI/CD integration
 * Compatible with Jenkins, GitLab CI, GitHub Actions, and other CI tools
 */

import type { IFormatter } from './types';
import type { AnalysisResult, FileAnalysisResult, Issue } from '@core/types';
import { Severity } from '@core/types';

/**
 * JUnit formatter - generates JUnit XML output
 */
export class JUnitFormatter implements IFormatter {
  /**
   * Format analysis results as JUnit XML
   */
  format(result: AnalysisResult): string {
    const lines: string[] = [];

    // XML declaration
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');

    // Root testsuites element with totals
    const totalTests = this.calculateTotalTests(result);
    const totalFailures = result.totalIssues + this.countParseErrors(result);
    const timeInSeconds = (result.duration / 1000).toFixed(3);

    lines.push(
      `<testsuites name="solin" tests="${totalTests}" failures="${totalFailures}" time="${timeInSeconds}">`
    );

    // Create a test suite for each file
    for (const fileResult of result.files) {
      lines.push(this.formatTestSuite(fileResult));
    }

    // If no files were analyzed, create an empty suite
    if (result.files.length === 0) {
      lines.push('  <testsuite name="solin" tests="0" failures="0" time="0.000">');
      lines.push('  </testsuite>');
    }

    lines.push('</testsuites>');

    return lines.join('\n');
  }

  /**
   * Format a single file as a test suite
   */
  private formatTestSuite(fileResult: FileAnalysisResult): string {
    const lines: string[] = [];

    const tests = fileResult.issues.length + (fileResult.parseErrors?.length || 0);
    const failures = tests; // All issues are reported as failures
    const timeInSeconds = (fileResult.duration / 1000).toFixed(3);

    lines.push(
      `  <testsuite name="${this.escapeXml(fileResult.filePath)}" tests="${tests}" failures="${failures}" time="${timeInSeconds}">`
    );

    // Add parse errors as test cases
    if (fileResult.parseErrors && fileResult.parseErrors.length > 0) {
      for (const parseError of fileResult.parseErrors) {
        lines.push(this.formatParseErrorTestCase(parseError, fileResult.filePath));
      }
    }

    // Add issues as test cases
    for (const issue of fileResult.issues) {
      lines.push(this.formatIssueTestCase(issue));
    }

    lines.push('  </testsuite>');

    return lines.join('\n');
  }

  /**
   * Format a parse error as a test case
   */
  private formatParseErrorTestCase(
    parseError: { message: string; line: number; column: number },
    filePath: string
  ): string {
    const lines: string[] = [];

    const testName = `Parse Error at line ${parseError.line}`;
    const location = `${filePath}:${parseError.line}:${parseError.column}`;

    lines.push(`    <testcase name="${this.escapeXml(testName)}" classname="ParseError">`);
    lines.push(`      <failure type="ERROR" message="${this.escapeXml(parseError.message)}">`);
    lines.push(`        <![CDATA[`);
    lines.push(`Parse error in ${location}`);
    lines.push(`${parseError.message}`);
    lines.push(`      ]]>`);
    lines.push(`      </failure>`);
    lines.push(`    </testcase>`);

    return lines.join('\n');
  }

  /**
   * Format an issue as a test case
   */
  private formatIssueTestCase(issue: Issue): string {
    const lines: string[] = [];

    const testName = `${issue.ruleId} at line ${issue.location.start.line}`;
    const className = this.getClassName(issue);
    const severityType = this.getSeverityType(issue.severity);
    const location = `${issue.filePath}:${issue.location.start.line}:${issue.location.start.column}`;

    lines.push(`    <testcase name="${this.escapeXml(testName)}" classname="${className}">`);

    // All issues (errors, warnings, info) are reported as failures in JUnit
    lines.push(`      <failure type="${severityType}" message="${this.escapeXml(issue.message)}">`);
    lines.push(`        <![CDATA[`);
    lines.push(`${severityType}: ${issue.message}`);
    lines.push(``);
    lines.push(`Location: ${location}`);
    lines.push(`Rule: ${issue.ruleId}`);

    // Add suggestion if available
    if (issue.metadata?.suggestion) {
      lines.push(``);
      lines.push(`Suggestion:`);
      lines.push(`${issue.metadata.suggestion}`);
    }

    lines.push(`      ]]>`);
    lines.push(`      </failure>`);
    lines.push(`    </testcase>`);

    return lines.join('\n');
  }

  /**
   * Get class name from issue category
   */
  private getClassName(issue: Issue): string {
    const category = issue.category || 'Unknown';
    return `solin.${category}`;
  }

  /**
   * Get severity type for JUnit output
   */
  private getSeverityType(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return 'ERROR';
      case Severity.WARNING:
        return 'WARNING';
      case Severity.INFO:
        return 'INFO';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Calculate total number of tests
   */
  private calculateTotalTests(result: AnalysisResult): number {
    let total = result.totalIssues;

    for (const fileResult of result.files) {
      if (fileResult.parseErrors) {
        total += fileResult.parseErrors.length;
      }
    }

    return total;
  }

  /**
   * Count parse errors
   */
  private countParseErrors(result: AnalysisResult): number {
    let count = 0;

    for (const fileResult of result.files) {
      if (fileResult.parseErrors) {
        count += fileResult.parseErrors.length;
      }
    }

    return count;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
