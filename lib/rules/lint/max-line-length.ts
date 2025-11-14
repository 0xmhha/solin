/**
 * Max Line Length Rule
 *
 * Enforces maximum line length for code readability.
 * Long lines are harder to read and should be broken up.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface MaxLineLengthOptions {
  max?: number; // Maximum line length (default: 120)
  ignoreComments?: boolean; // Ignore comment lines (default: false)
  ignoreStrings?: boolean; // Ignore lines with long strings (default: false)
}

export class MaxLineLengthRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/max-line-length',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Maximum Line Length',
      description:
        'Enforces maximum line length for improved code readability. ' +
        'Long lines are harder to read and understand, especially on smaller screens or in split-view editors.',
      recommendation:
        'Break long lines into multiple lines using appropriate formatting. ' +
        'Configure `max` to adjust the line length limit (default: 120 characters).',
    });
  }

  analyze(context: AnalysisContext): void {
    // Get custom options from config
    let maxLength = 120; // default
    let ignoreComments = false;
    let ignoreStrings = false;

    const ruleConfig = context.config.rules?.[this.metadata.id];
    if (Array.isArray(ruleConfig) && ruleConfig[1]) {
      const customOptions = ruleConfig[1] as MaxLineLengthOptions;
      maxLength = customOptions.max ?? maxLength;
      ignoreComments = customOptions.ignoreComments ?? ignoreComments;
      ignoreStrings = customOptions.ignoreStrings ?? ignoreStrings;
    }

    const lines = context.sourceCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineLength = line.length;

      if (lineLength <= maxLength) {
        continue;
      }

      // Check if should ignore this line
      const trimmedLine = line.trim();

      // Ignore comment lines if configured
      if (ignoreComments && (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*'))) {
        continue;
      }

      // Ignore lines with long strings if configured
      if (ignoreStrings && this.hasLongString(trimmedLine, maxLength)) {
        continue;
      }

      this.reportLongLine(i + 1, lineLength, maxLength, context);
    }
  }

  private hasLongString(line: string, maxLength: number): boolean {
    // Simple heuristic: check if line contains a string literal that's longer than half the max length
    const stringMatches = line.match(/"[^"]*"|'[^']*'/g);
    if (!stringMatches) return false;

    for (const str of stringMatches) {
      if (str.length > maxLength / 2) {
        return true;
      }
    }
    return false;
  }

  private reportLongLine(
    line: number,
    actual: number,
    max: number,
    context: AnalysisContext
  ): void {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Line ${line}: Line length ${actual} exceeds maximum of ${max} characters. ` +
        `Break this line into multiple lines for better readability.`,
      location: {
        start: { line, column: 0 },
        end: { line, column: actual },
      },
    });
  }
}
