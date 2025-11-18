/**
 * HTML Formatter
 *
 * Formats analysis results as an interactive HTML report.
 * Creates a self-contained HTML file with embedded CSS and JavaScript
 * for filtering, sorting, and viewing analysis results in a browser.
 */

import type { IFormatter, FormatterOptions } from './types';
import type { AnalysisResult, Issue } from '@core/types';
import { Severity } from '@core/types';

/**
 * HTML formatter options
 */
export interface HtmlFormatterOptions extends FormatterOptions {
  /**
   * Report title
   * @default "Solin Analysis Report"
   */
  title?: string;

  /**
   * Include interactive features (filtering, sorting)
   * @default true
   */
  interactive?: boolean;

  /**
   * Include inline CSS
   * @default true
   */
  includeStyles?: boolean;

  /**
   * Include inline JavaScript
   * @default true
   */
  includeScripts?: boolean;
}

/**
 * HTML formatter for creating interactive browser reports
 */
export class HtmlFormatter implements IFormatter {
  private options: HtmlFormatterOptions;

  constructor(options: HtmlFormatterOptions = {}) {
    this.options = {
      title: 'Solin Analysis Report',
      interactive: true,
      includeStyles: true,
      includeScripts: true,
      ...options,
    };
  }

  /**
   * Format analysis results as HTML
   */
  format(result: AnalysisResult): string {
    const html: string[] = [];

    html.push('<!DOCTYPE html>');
    html.push('<html lang="en">');
    html.push(this.generateHead());
    html.push('<body>');
    html.push(this.generateHeader(result));
    html.push(this.generateSummary(result));
    html.push(this.generateFilters());
    html.push(this.generateIssuesTable(result));
    html.push(this.generateFooter());

    if (this.options.includeScripts && this.options.interactive) {
      html.push(this.generateScripts());
    }

    html.push('</body>');
    html.push('</html>');

    return html.join('\n');
  }

  /**
   * Generate HTML head section
   */
  private generateHead(): string {
    const parts: string[] = [];

    parts.push('<head>');
    parts.push('  <meta charset="UTF-8">');
    parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    parts.push(`  <title>${this.escapeHtml(this.options.title || 'Solin Analysis Report')}</title>`);

    if (this.options.includeStyles) {
      parts.push(this.generateStyles());
    }

    parts.push('</head>');

    return parts.join('\n');
  }

  /**
   * Generate embedded CSS styles
   */
  private generateStyles(): string {
    return `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }

    header p {
      font-size: 16px;
      opacity: 0.9;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .summary-card h3 {
      font-size: 14px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .summary-card .value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .summary-card.error .value { color: #dc3545; }
    .summary-card.warning .value { color: #ffc107; }
    .summary-card.info .value { color: #17a2b8; }
    .summary-card.total .value { color: #6c757d; }

    .filters {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .filters h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333;
    }

    .filter-group {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-group label {
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }

    .filter-group input[type="checkbox"] {
      cursor: pointer;
    }

    .search-box {
      flex: 1;
      min-width: 250px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .issues-table {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
    }

    th {
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      color: #495057;
      font-size: 14px;
      text-transform: uppercase;
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      background: #e9ecef;
    }

    td {
      padding: 12px 15px;
      border-bottom: 1px solid #dee2e6;
      font-size: 14px;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .severity {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity.error {
      background: #fee;
      color: #dc3545;
    }

    .severity.warning {
      background: #fff3cd;
      color: #856404;
    }

    .severity.info {
      background: #d1ecf1;
      color: #0c5460;
    }

    .category {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      background: #e9ecef;
      color: #495057;
    }

    .location {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 12px;
      color: #666;
    }

    .rule-id {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 12px;
      color: #667eea;
    }

    .message {
      max-width: 500px;
      word-wrap: break-word;
    }

    footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }

    .no-issues {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 768px) {
      .summary {
        grid-template-columns: 1fr;
      }

      .filter-group {
        flex-direction: column;
        align-items: flex-start;
      }

      table {
        font-size: 12px;
      }

      th, td {
        padding: 8px 10px;
      }
    }
  </style>`;
  }

  /**
   * Generate header section
   */
  private generateHeader(_result: AnalysisResult): string {
    const timestamp = new Date().toLocaleString();

    return `
  <div class="container">
    <header>
      <h1>${this.escapeHtml(this.options.title || 'Solin Analysis Report')}</h1>
      <p>Generated on ${timestamp}</p>
    </header>`;
  }

  /**
   * Generate summary section
   */
  private generateSummary(result: AnalysisResult): string {
    const { summary, totalIssues } = result;

    return `
    <div class="summary">
      <div class="summary-card total">
        <h3>Total Issues</h3>
        <div class="value">${totalIssues}</div>
      </div>
      <div class="summary-card error">
        <h3>Errors</h3>
        <div class="value">${summary.errors}</div>
      </div>
      <div class="summary-card warning">
        <h3>Warnings</h3>
        <div class="value">${summary.warnings}</div>
      </div>
      <div class="summary-card info">
        <h3>Info</h3>
        <div class="value">${summary.info}</div>
      </div>
    </div>`;
  }

  /**
   * Generate filters section
   */
  private generateFilters(): string {
    if (!this.options.interactive) {
      return '';
    }

    return `
    <div class="filters">
      <h2>Filters</h2>
      <div class="filter-group">
        <input type="text" class="search-box" id="searchBox" placeholder="Search issues...">
        <label><input type="checkbox" class="filter-severity" value="error" checked> Errors</label>
        <label><input type="checkbox" class="filter-severity" value="warning" checked> Warnings</label>
        <label><input type="checkbox" class="filter-severity" value="info" checked> Info</label>
      </div>
    </div>`;
  }

  /**
   * Generate issues table
   */
  private generateIssuesTable(result: AnalysisResult): string {
    const parts: string[] = [];

    parts.push('    <div class="issues-table">');

    if (result.totalIssues === 0) {
      parts.push('      <div class="no-issues">');
      parts.push('        <h2>No issues found! 🎉</h2>');
      parts.push('        <p>Your code looks great.</p>');
      parts.push('      </div>');
    } else {
      parts.push('      <table id="issuesTable">');
      parts.push('        <thead>');
      parts.push('          <tr>');
      parts.push('            <th onclick="sortTable(0)">Severity</th>');
      parts.push('            <th onclick="sortTable(1)">Category</th>');
      parts.push('            <th onclick="sortTable(2)">File</th>');
      parts.push('            <th onclick="sortTable(3)">Location</th>');
      parts.push('            <th onclick="sortTable(4)">Rule</th>');
      parts.push('            <th onclick="sortTable(5)">Message</th>');
      parts.push('          </tr>');
      parts.push('        </thead>');
      parts.push('        <tbody>');

      // Sort issues by severity (errors first)
      const allIssues: Array<{ file: string; issue: Issue }> = [];
      for (const fileResult of result.files) {
        for (const issue of fileResult.issues) {
          allIssues.push({ file: fileResult.filePath, issue });
        }
      }

      allIssues.sort((a, b) => Number(a.issue.severity) - Number(b.issue.severity));

      for (const { file, issue } of allIssues) {
        parts.push(this.generateIssueRow(file, issue));
      }

      parts.push('        </tbody>');
      parts.push('      </table>');
    }

    parts.push('    </div>');

    return parts.join('\n');
  }

  /**
   * Generate a single issue row
   */
  private generateIssueRow(file: string, issue: Issue): string {
    const severityClass = this.getSeverityClass(issue.severity);
    const severityText = this.getSeverityText(issue.severity);
    const location = `${issue.location.start.line}:${issue.location.start.column}`;

    return `          <tr class="issue-row" data-severity="${severityClass}">
            <td><span class="severity ${severityClass}">${severityText}</span></td>
            <td><span class="category">${this.escapeHtml(issue.category)}</span></td>
            <td>${this.escapeHtml(file)}</td>
            <td><span class="location">${location}</span></td>
            <td><span class="rule-id">${this.escapeHtml(issue.ruleId)}</span></td>
            <td class="message">${this.escapeHtml(issue.message)}</td>
          </tr>`;
  }

  /**
   * Generate footer section
   */
  private generateFooter(): string {
    return `
    <footer>
      <p>Generated by <strong>Solin</strong> - Advanced Solidity Static Analysis Tool</p>
    </footer>
  </div>`;
  }

  /**
   * Generate embedded JavaScript for interactivity
   */
  private generateScripts(): string {
    return `
  <script>
    // Search functionality
    document.getElementById('searchBox')?.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('.issue-row');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(searchTerm);
        const severityVisible = isSeverityVisible(row.dataset.severity);

        if (matches && severityVisible) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });
    });

    // Filter functionality
    document.querySelectorAll('.filter-severity').forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        filterIssues();
      });
    });

    function filterIssues() {
      const searchTerm = document.getElementById('searchBox')?.value.toLowerCase() || '';
      const rows = document.querySelectorAll('.issue-row');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(searchTerm);
        const severityVisible = isSeverityVisible(row.dataset.severity);

        if (matches && severityVisible) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });
    }

    function isSeverityVisible(severity) {
      const checkbox = document.querySelector(\`.filter-severity[value="\${severity}"]\`);
      return checkbox ? checkbox.checked : true;
    }

    // Sort table functionality
    let sortDirection = {};

    function sortTable(columnIndex) {
      const table = document.getElementById('issuesTable');
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));

      // Toggle sort direction
      sortDirection[columnIndex] = !sortDirection[columnIndex];
      const ascending = sortDirection[columnIndex];

      rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();

        if (aValue < bValue) return ascending ? -1 : 1;
        if (aValue > bValue) return ascending ? 1 : -1;
        return 0;
      });

      // Reorder rows
      rows.forEach(row => tbody.appendChild(row));
    }
  </script>`;
  }

  /**
   * Get severity CSS class
   */
  private getSeverityClass(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return 'error';
      case Severity.WARNING:
        return 'warning';
      case Severity.INFO:
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Get severity display text
   */
  private getSeverityText(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return 'Error';
      case Severity.WARNING:
        return 'Warning';
      case Severity.INFO:
        return 'Info';
      default:
        return 'Info';
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char] || char);
  }
}
