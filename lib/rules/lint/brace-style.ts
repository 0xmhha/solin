/**
 * Brace Style Rule
 *
 * Enforces consistent brace style for blocks (1tbs or allman).
 * Improves code consistency and readability.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface BraceStyleOptions {
  style?: '1tbs' | 'allman'; // Brace style (default: '1tbs')
}

export class BraceStyleRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/brace-style',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Brace Style',
      description:
        'Enforces consistent brace style for code blocks. ' +
        'Supports 1TBS (One True Brace Style - opening brace on same line) and ' +
        'Allman style (opening brace on new line). Consistent brace placement improves code readability.',
      recommendation:
        'Choose a brace style (1tbs or allman) and use it consistently throughout your codebase. ' +
        '1TBS is more common in Solidity.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Get custom options from config
    let braceStyle: '1tbs' | 'allman' = '1tbs';

    const ruleConfig = context.config.rules?.[this.metadata.id];
    if (Array.isArray(ruleConfig) && ruleConfig[1]) {
      const customOptions = ruleConfig[1] as BraceStyleOptions;
      braceStyle = customOptions.style ?? braceStyle;
    }

    const lines = context.sourceCode.split('\n');

    // Keywords that should be followed by braces
    const keywords = [
      'contract',
      'library',
      'interface',
      'function',
      'constructor',
      'modifier',
      'if',
      'else',
      'for',
      'while',
      'do',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (trimmedLine.length === 0 || trimmedLine.startsWith('//')) {
        continue;
      }

      // Check if line contains any keywords
      for (const keyword of keywords) {
        const keywordPattern = new RegExp(`\\b${keyword}\\b`);
        if (!keywordPattern.test(trimmedLine)) {
          continue;
        }

        // Check if opening brace is on this line or next line
        const braceOnSameLine = trimmedLine.includes('{');
        const closingBraceOnSameLine = trimmedLine.includes('}');

        // Skip single-line blocks (e.g., "function test() {}")
        if (braceOnSameLine && closingBraceOnSameLine) {
          continue;
        }

        // If brace is not on same line, check next line
        let braceOnNextLine = false;
        if (!braceOnSameLine && i + 1 < lines.length) {
          const nextLine = lines[i + 1]!.trim();
          braceOnNextLine = nextLine.startsWith('{');
        }

        // Validate based on style
        if (braceStyle === '1tbs') {
          // 1TBS: opening brace should be on same line
          if (!braceOnSameLine && braceOnNextLine) {
            this.reportBraceStyleViolation(
              i + 2, // Next line where brace is
              '1tbs',
              context
            );
          }
        } else if (braceStyle === 'allman') {
          // Allman: opening brace should be on new line
          if (braceOnSameLine && !closingBraceOnSameLine) {
            this.reportBraceStyleViolation(i + 1, 'allman', context);
          }
        }
      }
    }
  }

  private reportBraceStyleViolation(
    line: number,
    expectedStyle: '1tbs' | 'allman',
    context: AnalysisContext
  ): void {
    const styleName = expectedStyle === '1tbs' ? '1TBS' : 'Allman';
    const expectation =
      expectedStyle === '1tbs'
        ? 'Opening brace should be on the same line as the declaration'
        : 'Opening brace should be on a new line';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Line ${line}: ${expectation} (${styleName} style). ` +
        `Use consistent brace style throughout your code.`,
      location: {
        start: { line, column: 0 },
        end: { line, column: 1 },
      },
    });
  }
}
