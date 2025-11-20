/**
 * RTLO Character Security Rule
 *
 * Detects right-to-left override (RTLO) and other bidirectional text control
 * characters that can be used to create visually deceptive code. These invisible
 * Unicode characters can make code appear different from how it executes.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#right-to-left-override-character
 * @see https://trojansource.codes/
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects dangerous Unicode bidirectional text control characters:
 * - U+202E (RIGHT-TO-LEFT OVERRIDE) - RTLO
 * - U+202D (LEFT-TO-RIGHT OVERRIDE) - LRO
 * - U+202A (LEFT-TO-RIGHT EMBEDDING) - LRE
 * - U+202B (RIGHT-TO-LEFT EMBEDDING) - RLE
 * - U+202C (POP DIRECTIONAL FORMATTING) - PDF
 *
 * These can be used for "Trojan Source" attacks where code appears to do
 * one thing but actually does another.
 *
 * @example Vulnerable
 * ```solidity
 * // Code with RTLO can appear as:
 * // transfer(amount, /*<RTLO>rebmun_tnuocca/*"owner");
 * // But actually is:
 * // transfer(amount, /*account_number<RTLO>/*"owner");
 * ```
 *
 * @example Secure
 * ```solidity
 * // Normal code without directional overrides
 * transfer(amount, "owner");
 * ```
 */
export class RtloCharacterRule extends AbstractRule {
  // Dangerous Unicode bidirectional control characters
  private static readonly DANGEROUS_CHARS = [
    { code: '\u202E', name: 'RIGHT-TO-LEFT OVERRIDE (U+202E)' },
    { code: '\u202D', name: 'LEFT-TO-RIGHT OVERRIDE (U+202D)' },
    { code: '\u202A', name: 'LEFT-TO-RIGHT EMBEDDING (U+202A)' },
    { code: '\u202B', name: 'RIGHT-TO-LEFT EMBEDDING (U+202B)' },
    { code: '\u202C', name: 'POP DIRECTIONAL FORMATTING (U+202C)' },
    { code: '\u2066', name: 'LEFT-TO-RIGHT ISOLATE (U+2066)' },
    { code: '\u2067', name: 'RIGHT-TO-LEFT ISOLATE (U+2067)' },
    { code: '\u2068', name: 'FIRST STRONG ISOLATE (U+2068)' },
    { code: '\u2069', name: 'POP DIRECTIONAL ISOLATE (U+2069)' },
  ];

  constructor() {
    super({
      id: 'security/rtlo-character',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'RTLO Character Detected',
      description:
        'Detects right-to-left override (RTLO) and other Unicode bidirectional control characters. ' +
        'These invisible characters can be used to create visually deceptive code that appears to do ' +
        'one thing but actually does another (Trojan Source attacks).',
      recommendation:
        'Remove all Unicode bidirectional control characters from source code. ' +
        'Use only standard ASCII characters for code structure. ' +
        'If bidirectional text is needed in strings, document it clearly and consider alternatives.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Check the entire source code for dangerous characters
    this.checkSourceCode(context);
  }

  /**
   * Check source code for dangerous Unicode characters
   */
  private checkSourceCode(context: AnalysisContext): void {
    const source = context.sourceCode;
    const lines = source.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      if (!line) {
        continue;
      }

      for (const { code, name } of RtloCharacterRule.DANGEROUS_CHARS) {
        let columnIndex = line.indexOf(code);

        while (columnIndex !== -1) {
          this.reportIssue(
            lineIndex + 1,
            columnIndex,
            name,
            context
          );

          // Check for more occurrences in the same line
          columnIndex = line.indexOf(code, columnIndex + 1);
        }
      }
    }
  }

  /**
   * Report an RTLO character issue
   */
  private reportIssue(
    line: number,
    column: number,
    charName: string,
    context: AnalysisContext
  ): void {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Dangerous Unicode bidirectional control character detected: ${charName}. ` +
        'This invisible character can be used to create visually deceptive code (Trojan Source attack). ' +
        'Remove this character immediately and verify the code integrity.',
      location: {
        start: {
          line: line,
          column: column,
        },
        end: {
          line: line,
          column: column + 1,
        },
      },
    });
  }
}
