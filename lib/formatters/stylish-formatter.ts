/**
 * Stylish Formatter
 *
 * Human-readable formatter with colors and formatting
 */

import chalk from 'chalk';
import type { IFormatter, FormatterOptions } from './types';
import type { AnalysisResult, FileAnalysisResult, Issue } from '@core/types';
import { Severity } from '@core/types';

/**
 * Stylish formatter - human-readable output with colors
 */
export class StylishFormatter implements IFormatter {
  private readonly options: FormatterOptions;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      colors: true,
      showRuleIds: true,
      maxWidth: 120,
      ...options,
    };
  }

  /**
   * Format analysis results
   */
  format(result: AnalysisResult): string {
    const lines: string[] = [];

    // Add header
    lines.push('');
    lines.push(chalk.bold('Solin Analysis Results'));
    lines.push('');

    // Handle parse errors
    if (result.hasParseErrors) {
      lines.push(chalk.red.bold('Parse Errors:'));
      lines.push('');

      for (const fileResult of result.files) {
        if (fileResult.parseErrors && fileResult.parseErrors.length > 0) {
          lines.push(chalk.underline(fileResult.filePath));

          for (const parseError of fileResult.parseErrors) {
            const location = parseError.line > 0 ? `${parseError.line}:${parseError.column}` : '-';
            lines.push(
              `  ${chalk.gray(location)}  ${chalk.red('Parse Error')}  ${parseError.message}`
            );
          }

          lines.push('');
        }
      }
    }

    // Format issues by file
    if (result.totalIssues === 0) {
      lines.push(chalk.green('✓ No issues found'));
      lines.push('');
    } else {
      for (const fileResult of result.files) {
        if (fileResult.issues.length > 0) {
          lines.push(...this.formatFile(fileResult));
        }
      }
    }

    // Add summary
    lines.push(...this.formatSummary(result));

    return lines.join('\n');
  }

  /**
   * Format issues for a single file
   */
  private formatFile(fileResult: FileAnalysisResult): string[] {
    const lines: string[] = [];

    // File header
    lines.push(chalk.underline(fileResult.filePath));

    // Sort issues by line number and severity
    const sortedIssues = this.sortIssues(fileResult.issues);

    // Format each issue
    for (const issue of sortedIssues) {
      lines.push(this.formatIssue(issue));
    }

    lines.push('');

    return lines;
  }

  /**
   * Format a single issue
   */
  private formatIssue(issue: Issue): string {
    const { location, severity, message, ruleId } = issue;

    // Location
    const loc = `${location.start.line}:${location.start.column}`;
    const locationStr = chalk.gray(loc.padEnd(8));

    // Severity
    const severityStr = this.formatSeverity(severity);

    // Message
    const messageStr = message;

    // Rule ID
    const ruleIdStr = this.options.showRuleIds ? chalk.gray(ruleId) : '';

    return `  ${locationStr}  ${severityStr}  ${messageStr}  ${ruleIdStr}`;
  }

  /**
   * Format severity with color
   */
  private formatSeverity(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return chalk.red('error  ');
      case Severity.WARNING:
        return chalk.yellow('warning');
      case Severity.INFO:
        return chalk.blue('info   ');
      default:
        return 'unknown';
    }
  }

  /**
   * Sort issues by severity (errors first) and then by line number
   */
  private sortIssues(issues: Issue[]): Issue[] {
    const severityOrder = {
      [Severity.ERROR]: 0,
      [Severity.WARNING]: 1,
      [Severity.INFO]: 2,
    };

    return [...issues].sort((a, b) => {
      // Sort by severity first
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      // Then by line number
      return a.location.start.line - b.location.start.line;
    });
  }

  /**
   * Format summary
   */
  private formatSummary(result: AnalysisResult): string[] {
    const lines: string[] = [];
    const { summary, totalIssues, duration } = result;

    // Summary line
    const parts: string[] = [];

    if (summary.errors > 0) {
      parts.push(chalk.red(`${summary.errors} error${summary.errors === 1 ? '' : 's'}`));
    } else {
      parts.push(chalk.gray(`${summary.errors} errors`));
    }

    if (summary.warnings > 0) {
      parts.push(chalk.yellow(`${summary.warnings} warning${summary.warnings === 1 ? '' : 's'}`));
    } else {
      parts.push(chalk.gray(`${summary.warnings} warnings`));
    }

    if (summary.info > 0) {
      parts.push(chalk.blue(`${summary.info} info`));
    }

    lines.push(chalk.bold('Summary:'));
    lines.push(`  ${parts.join(', ')}`);
    lines.push(`  ${chalk.gray(`Total: ${totalIssues} issue${totalIssues === 1 ? '' : 's'}`)}`);
    lines.push(`  ${chalk.gray(`Time: ${duration}ms`)}`);
    lines.push('');

    return lines;
  }
}
