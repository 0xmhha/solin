/**
 * No Trailing Whitespace Rule
 *
 * Detects and reports trailing whitespace at the end of lines.
 * Trailing whitespace can cause issues with version control and is generally considered bad practice.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface NoTrailingWhitespaceOptions {
  skipBlankLines?: boolean; // Skip lines with only whitespace (default: false)
}

export class NoTrailingWhitespaceRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/no-trailing-whitespace',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'No Trailing Whitespace',
      description:
        'Detects trailing whitespace at the end of lines. ' +
        'Trailing whitespace can cause unnecessary diff noise in version control, ' +
        'may cause issues with some editors, and is generally considered poor code hygiene.',
      recommendation:
        'Remove all trailing whitespace from the end of lines. ' +
        'Configure your editor to automatically trim trailing whitespace on save.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Get custom options from config
    let skipBlankLines = false;

    const ruleConfig = context.config.rules?.[this.metadata.id];
    if (Array.isArray(ruleConfig) && ruleConfig[1]) {
      const customOptions = ruleConfig[1] as NoTrailingWhitespaceOptions;
      skipBlankLines = customOptions.skipBlankLines ?? skipBlankLines;
    }

    const lines = context.sourceCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Check if line has trailing whitespace
      if (line.length > 0 && line !== line.trimEnd()) {
        // If skipBlankLines is true, skip lines that are only whitespace
        if (skipBlankLines && line.trim().length === 0) {
          continue;
        }

        const trailingWhitespace = line.length - line.trimEnd().length;
        this.reportTrailingWhitespace(i + 1, trailingWhitespace, line.length, context);
      }
    }
  }

  private reportTrailingWhitespace(
    line: number,
    whitespaceCount: number,
    lineLength: number,
    context: AnalysisContext
  ): void {
    const whitespaceType = whitespaceCount === 1 ? 'character' : 'characters';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Line ${line}: Found ${whitespaceCount} trailing whitespace ${whitespaceType}. ` +
        `Remove trailing whitespace to maintain clean code.`,
      location: {
        start: { line, column: lineLength - whitespaceCount },
        end: { line, column: lineLength },
      },
    });
  }
}
