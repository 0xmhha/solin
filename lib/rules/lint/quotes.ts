/**
 * Quotes Rule
 *
 * Enforces consistent quote style for string literals (single or double quotes).
 * Improves code consistency and readability.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface QuotesOptions {
  style?: 'single' | 'double'; // Preferred quote style (default: 'single')
  avoidEscape?: boolean; // Allow alternative quotes to avoid escaping (default: true)
}

export class QuotesRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/quotes',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Quotes',
      description:
        'Enforces consistent quote style for string literals. ' +
        'You can choose between single quotes (\') or double quotes (") for string literals. ' +
        'The avoidEscape option allows using alternative quotes when the string contains the preferred quote character.',
      recommendation:
        'Use consistent quote style throughout your code. ' +
        'Configure your preferred style (single or double) and optionally allow alternative quotes to avoid escaping.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Get custom options from config
    let preferredStyle: 'single' | 'double' = 'single';
    let avoidEscape = true;

    const ruleConfig = context.config.rules?.[this.metadata.id];
    if (Array.isArray(ruleConfig) && ruleConfig[1]) {
      const customOptions = ruleConfig[1] as QuotesOptions;
      preferredStyle = customOptions.style ?? preferredStyle;
      avoidEscape = customOptions.avoidEscape ?? avoidEscape;
    }

    const preferredQuote = preferredStyle === 'single' ? "'" : '"';

    const lines = context.sourceCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      let col = 0;

      while (col < line.length) {
        const char = line[col];

        // Check if this is a string literal start
        if (char === '"' || char === "'") {
          const quoteChar = char;
          const stringStart = col;

          // Check if this is a hex or unicode string (skip them)
          if (this.isSpecialString(line, col)) {
            // Find the closing quote and skip the entire special string
            let stringEnd = col + 1;
            let escaped = false;

            while (stringEnd < line.length) {
              const currentChar = line[stringEnd];

              if (escaped) {
                escaped = false;
                stringEnd++;
                continue;
              }

              if (currentChar === '\\') {
                escaped = true;
                stringEnd++;
                continue;
              }

              if (currentChar === quoteChar) {
                break;
              }

              stringEnd++;
            }

            col = stringEnd + 1;
            continue;
          }

          // Find the end of the string
          let stringEnd = col + 1;
          let escaped = false;
          let stringContent = '';

          while (stringEnd < line.length) {
            const currentChar = line[stringEnd];

            if (escaped) {
              escaped = false;
              stringContent += currentChar;
              stringEnd++;
              continue;
            }

            if (currentChar === '\\') {
              escaped = true;
              stringEnd++;
              continue;
            }

            if (currentChar === quoteChar) {
              break;
            }

            stringContent += currentChar;
            stringEnd++;
          }

          // Check if the quote style matches the preference
          if (quoteChar !== preferredQuote) {
            // If avoidEscape is enabled, check if using alternative quotes avoids escaping
            if (avoidEscape) {
              const wouldNeedEscape = stringContent.includes(preferredQuote);
              if (wouldNeedEscape) {
                // This is acceptable - using alternative quotes to avoid escaping
                col = stringEnd + 1;
                continue;
              }
            }

            // Report the issue
            this.reportInconsistentQuotes(
              i + 1,
              stringStart,
              preferredStyle,
              context
            );
          }

          col = stringEnd + 1;
        } else {
          col++;
        }
      }
    }
  }

  private isSpecialString(line: string, position: number): boolean {
    // Check if this is a hex string (hex"...")
    if (position >= 3) {
      const prefix = line.substring(position - 3, position);
      if (prefix === 'hex') {
        return true;
      }
    }

    // Check if this is a unicode string (unicode"...")
    if (position >= 7) {
      const prefix = line.substring(position - 7, position);
      if (prefix === 'unicode') {
        return true;
      }
    }

    return false;
  }

  private reportInconsistentQuotes(
    line: number,
    column: number,
    preferredStyle: 'single' | 'double',
    context: AnalysisContext
  ): void {
    const quoteName = preferredStyle === 'single' ? 'single quotes' : 'double quotes';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Line ${line}, column ${column + 1}: Use ${quoteName} for string literals. ` +
        `Configure quote style preference for consistency.`,
      location: {
        start: { line, column },
        end: { line, column: column + 1 },
      },
    });
  }
}
