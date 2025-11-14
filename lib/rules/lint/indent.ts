/**
 * Indent Rule
 *
 * Enforces consistent indentation (2 or 4 spaces).
 * Helps maintain code readability and follows Solidity style guide.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface IndentOptions {
  spaces?: number; // 2 or 4 spaces (default: 4)
}

export class IndentRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/indent',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Consistent Indentation',
      description:
        'Enforces consistent indentation using spaces (2 or 4). ' +
        'Consistent indentation improves code readability and follows Solidity style guide conventions.',
      recommendation:
        'Use consistent indentation throughout the codebase. ' +
        'Configure `indent.spaces` to 2 or 4 based on your style guide.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Get custom options from config
    let expectedSpaces = 4; // default
    const ruleConfig = context.config.rules?.[this.metadata.id];
    if (Array.isArray(ruleConfig) && ruleConfig[1]) {
      const customOptions = ruleConfig[1] as IndentOptions;
      expectedSpaces = customOptions.spaces ?? expectedSpaces;
    }

    if (expectedSpaces !== 2 && expectedSpaces !== 4) {
      // Invalid configuration, skip analysis
      return;
    }

    const lines = context.sourceCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Skip empty lines and lines with only whitespace
      if (line.trim().length === 0) {
        continue;
      }

      // Check for tabs
      if (line.startsWith('\t') || line.includes('\t')) {
        this.reportTabUsage(i + 1, context);
        continue;
      }

      // Count leading spaces
      const leadingSpaces = line.length - line.trimStart().length;

      // Check if indentation is consistent with expected spaces
      if (leadingSpaces > 0 && leadingSpaces % expectedSpaces !== 0) {
        this.reportInconsistentIndent(i + 1, leadingSpaces, expectedSpaces, context);
      }
    }
  }

  private reportTabUsage(line: number, context: AnalysisContext): void {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Line ${line}: Use spaces instead of tabs for indentation.`,
      location: {
        start: { line, column: 0 },
        end: { line, column: 1 },
      },
    });
  }

  private reportInconsistentIndent(
    line: number,
    actual: number,
    expected: number,
    context: AnalysisContext
  ): void {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Line ${line}: Expected indentation of ${expected} spaces (or multiples), but found ${actual} spaces. ` +
        `Ensure indentation is a multiple of ${expected}.`,
      location: {
        start: { line, column: 0 },
        end: { line, column: actual },
      },
    });
  }
}
