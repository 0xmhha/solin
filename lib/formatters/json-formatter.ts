/**
 * JSON Formatter
 *
 * Machine-readable JSON output formatter
 */

import type { IFormatter } from './types';
import type { AnalysisResult } from '@core/types';
import { Severity } from '@core/types';

/**
 * JSON formatter options
 */
export interface JSONFormatterOptions {
  /** Whether to pretty-print JSON */
  pretty?: boolean;
}

/**
 * JSON formatter - machine-readable output
 */
export class JSONFormatter implements IFormatter {
  private readonly options: JSONFormatterOptions;

  constructor(options: JSONFormatterOptions = {}) {
    this.options = {
      pretty: true,
      ...options,
    };
  }

  /**
   * Format analysis results as JSON
   */
  format(result: AnalysisResult): string {
    // Map Severity enum to string
    const mappedResult = {
      ...result,
      files: result.files.map(file => ({
        ...file,
        issues: file.issues.map(issue => ({
          ...issue,
          severity: this.severityToString(issue.severity),
        })),
      })),
    };

    // Format JSON with optional pretty-print
    if (this.options.pretty) {
      return JSON.stringify(mappedResult, null, 2);
    }

    return JSON.stringify(mappedResult);
  }

  /**
   * Convert Severity enum to string
   */
  private severityToString(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return 'error';
      case Severity.WARNING:
        return 'warning';
      case Severity.INFO:
        return 'info';
      default:
        return 'unknown';
    }
  }
}
