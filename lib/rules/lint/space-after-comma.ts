/**
 * Space After Comma Rule
 *
 * Enforces spacing after commas in function parameters, array elements, etc.
 * Improves code readability by ensuring consistent spacing.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class SpaceAfterCommaRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/space-after-comma',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Space After Comma',
      description:
        'Enforces spacing after commas in parameter lists, array literals, and other comma-separated elements. ' +
        'Consistent spacing after commas improves code readability and follows common style conventions.',
      recommendation:
        'Add a space after each comma in parameter lists, array literals, and other comma-separated contexts. ' +
        'Example: Use `function(a, b, c)` instead of `function(a,b,c)`.',
    });
  }

  analyze(context: AnalysisContext): void {
    const lines = context.sourceCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Find all commas in the line
      for (let col = 0; col < line.length; col++) {
        if (line[col] === ',') {
          // Check if there's a character after the comma
          if (col + 1 < line.length) {
            const nextChar = line[col + 1];

            // Check if next character is not a space or newline
            if (nextChar !== ' ' && nextChar !== '\n' && nextChar !== '\r') {
              // Make sure the comma is not inside a string literal
              if (!this.isInsideString(line, col)) {
                this.reportMissingSpace(i + 1, col, context);
              }
            }
          }
        }
      }
    }
  }

  private isInsideString(line: string, position: number): boolean {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < position; i++) {
      const char = line[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      }
    }

    return inSingleQuote || inDoubleQuote;
  }

  private reportMissingSpace(
    line: number,
    column: number,
    context: AnalysisContext
  ): void {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Line ${line}, column ${column + 1}: Missing space after comma. ` +
        `Add a space after the comma for better readability.`,
      location: {
        start: { line, column },
        end: { line, column: column + 1 },
      },
    });
  }
}
