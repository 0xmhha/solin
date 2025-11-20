/**
 * Markdown Formatter
 *
 * Formats analysis results as Markdown for documentation and reports
 */

import type { IFormatter, FormatterOptions } from './types';
import type { AnalysisResult, FileAnalysisResult, Issue } from '@core/types';
import { Severity } from '@core/types';

/**
 * Markdown formatter options
 */
export interface MarkdownFormatterOptions extends FormatterOptions {
  /**
   * Whether to use table format for issues
   * @default false
   */
  showTable?: boolean;

  /**
   * Whether to include rule links
   * @default false
   */
  includeRuleLinks?: boolean;
}

/**
 * Markdown formatter - generates Markdown documentation
 */
export class MarkdownFormatter implements IFormatter {
  private readonly options: MarkdownFormatterOptions;

  constructor(options: MarkdownFormatterOptions = {}) {
    this.options = {
      showRuleIds: true,
      showTable: false,
      includeRuleLinks: false,
      ...options,
    };
  }

  /**
   * Format analysis results as Markdown
   */
  format(result: AnalysisResult): string {
    const sections: string[] = [];

    // Title
    sections.push('# Solin Analysis Report\n');

    // Parse errors section
    if (result.hasParseErrors) {
      sections.push(this.formatParseErrors(result));
    }

    // Issues section
    if (result.totalIssues === 0) {
      sections.push('## Results\n');
      sections.push(':white_check_mark: **No issues found**\n');
    } else {
      sections.push(this.formatIssues(result));
    }

    // Summary section
    sections.push(this.formatSummary(result));

    return sections.join('\n');
  }

  /**
   * Format parse errors section
   */
  private formatParseErrors(result: AnalysisResult): string {
    const lines: string[] = [];

    lines.push('## Parse Errors\n');

    for (const fileResult of result.files) {
      if (fileResult.parseErrors && fileResult.parseErrors.length > 0) {
        lines.push(`### ${fileResult.filePath}\n`);

        for (const error of fileResult.parseErrors) {
          const location =
            error.line > 0 ? `Line ${error.line}:${error.column}` : 'Unknown location';
          lines.push(`- **${location}**: ${error.message}`);
        }

        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Format issues section
   */
  private formatIssues(result: AnalysisResult): string {
    const sections: string[] = [];

    for (const fileResult of result.files) {
      if (fileResult.issues.length > 0) {
        sections.push(this.formatFileIssues(fileResult));
      }
    }

    return sections.join('\n');
  }

  /**
   * Format issues for a single file
   */
  private formatFileIssues(fileResult: FileAnalysisResult): string {
    const lines: string[] = [];

    // File header
    lines.push(`## ${fileResult.filePath}\n`);

    if (this.options.showTable) {
      // Table format
      lines.push('| Location | Severity | Message | Rule |');
      lines.push('| --- | --- | --- | --- |');

      for (const issue of this.sortIssues(fileResult.issues)) {
        const location = `${issue.location.start.line}:${issue.location.start.column}`;
        const severity = this.formatSeverityText(issue.severity);
        const message = this.escapeMarkdown(issue.message);
        const rule = this.options.showRuleIds ? `\`${issue.ruleId}\`` : '';

        lines.push(`| ${location} | ${severity} | ${message} | ${rule} |`);
      }
    } else {
      // List format (grouped by severity)
      const groupedIssues = this.groupBySeverity(fileResult.issues);

      for (const [severity, issues] of groupedIssues) {
        const icon = this.getSeverityIcon(severity);
        const label = this.formatSeverityLabel(severity);

        lines.push(`### ${icon} ${label}\n`);

        for (const issue of issues) {
          const location = `Line ${issue.location.start.line}:${issue.location.start.column}`;
          const message = this.escapeMarkdown(issue.message);
          const rule = this.options.showRuleIds ? ` [\`${issue.ruleId}\`]` : '';

          lines.push(`- **${location}**: ${message}${rule}`);
        }

        lines.push('');
      }
    }

    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format summary section
   */
  private formatSummary(result: AnalysisResult): string {
    const lines: string[] = [];

    lines.push('## Summary\n');
    lines.push(`- **Total Issues**: ${result.totalIssues}`);
    lines.push(`- **Errors**: ${result.summary.errors}`);
    lines.push(`- **Warnings**: ${result.summary.warnings}`);
    lines.push(`- **Info**: ${result.summary.info}`);
    lines.push(`- **Duration**: ${result.duration}ms`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Group issues by severity
   */
  private groupBySeverity(issues: Issue[]): Map<Severity, Issue[]> {
    const grouped = new Map<Severity, Issue[]>();

    // Initialize groups in order
    grouped.set(Severity.ERROR, []);
    grouped.set(Severity.WARNING, []);
    grouped.set(Severity.INFO, []);

    // Group issues
    for (const issue of issues) {
      const group = grouped.get(issue.severity);
      if (group) {
        group.push(issue);
      }
    }

    // Remove empty groups and sort within groups
    for (const [severity, group] of grouped) {
      if (group.length === 0) {
        grouped.delete(severity);
      } else {
        // Sort by line number
        group.sort((a, b) => a.location.start.line - b.location.start.line);
      }
    }

    return grouped;
  }

  /**
   * Sort issues by severity and line number
   */
  private sortIssues(issues: Issue[]): Issue[] {
    const severityOrder = {
      [Severity.ERROR]: 0,
      [Severity.WARNING]: 1,
      [Severity.INFO]: 2,
    };

    return [...issues].sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return a.location.start.line - b.location.start.line;
    });
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return ':x:';
      case Severity.WARNING:
        return ':warning:';
      case Severity.INFO:
        return ':information_source:';
      default:
        return ':grey_question:';
    }
  }

  /**
   * Format severity as label
   */
  private formatSeverityLabel(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return 'Error';
      case Severity.WARNING:
        return 'Warning';
      case Severity.INFO:
        return 'Info';
      default:
        return 'Unknown';
    }
  }

  /**
   * Format severity as text (for tables)
   */
  private formatSeverityText(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return '🔴 Error';
      case Severity.WARNING:
        return '🟡 Warning';
      case Severity.INFO:
        return '🔵 Info';
      default:
        return 'Unknown';
    }
  }

  /**
   * Escape special Markdown characters
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/\|/g, '\\|').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
  }
}
