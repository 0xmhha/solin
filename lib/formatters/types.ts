/**
 * Formatter types and interfaces
 */

import type { AnalysisResult } from '@core/types';

/**
 * Formatter interface for output formatting
 */
export interface IFormatter {
  /**
   * Format analysis results for output
   *
   * @param result - Analysis results to format
   * @returns Formatted string output
   */
  format(result: AnalysisResult): string;
}

/**
 * Formatter options
 */
export interface FormatterOptions {
  /** Whether to use colors in output */
  colors?: boolean;
  /** Whether to show rule IDs */
  showRuleIds?: boolean;
  /** Maximum line width for output */
  maxWidth?: number;
}
