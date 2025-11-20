/**
 * Too Many Digits Security Rule
 *
 * Detects number literals with too many consecutive digits, which reduce
 * readability and increase the risk of typos. Large numbers should use
 * scientific notation, underscores for separation, or named constants.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#too-many-digits
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects number literals with too many consecutive digits (default: 15+):
 * - Long decimal numbers without separators
 * - Numbers that should use scientific notation (e.g., 1e18)
 * - Numbers that should use underscores (e.g., 1_000_000)
 *
 * Does not flag:
 * - Numbers with underscores (already readable)
 * - Hexadecimal numbers
 * - Numbers in scientific notation
 * - Short numbers (< 15 digits)
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: Too many digits, hard to read
 * uint256 supply = 1000000000000000000000;
 * uint256 large = 123456789012345678901234567890;
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: Readable alternatives
 * uint256 supply = 1_000_000_000_000_000_000_000;
 * uint256 supply = 1e21;
 * uint256 constant LARGE_VALUE = 1e30;
 * ```
 */
export class TooManyDigitsRule extends AbstractRule {
  private static readonly MAX_CONSECUTIVE_DIGITS = 15;

  constructor() {
    super({
      id: 'security/too-many-digits',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Too Many Digits',
      description:
        'Detects number literals with too many consecutive digits (15+). ' +
        'Long numbers without separators are hard to read and prone to typos, ' +
        'which can lead to critical errors in token amounts, decimals, or other values.',
      recommendation:
        'Use underscores to separate digits (e.g., 1_000_000), ' +
        'scientific notation for very large numbers (e.g., 1e18), ' +
        'or define named constants with clear documentation. ' +
        'This improves readability and reduces the risk of copy-paste errors.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check number literals
    if (node.type === 'NumberLiteral') {
      this.checkNumberLiteral(node, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check if number literal has too many consecutive digits
   */
  private checkNumberLiteral(node: any, context: AnalysisContext): void {
    if (!node.number) {
      return;
    }

    const numStr = node.number.toString();

    // Skip if already uses underscores (good practice)
    if (numStr.includes('_')) {
      return;
    }

    // Skip hexadecimal numbers (0x...)
    if (numStr.toLowerCase().startsWith('0x')) {
      return;
    }

    // Skip scientific notation (e.g., 1e18)
    if (numStr.toLowerCase().includes('e')) {
      return;
    }

    // Skip if subdenomination is used (e.g., 1 ether, 1 gwei)
    if (node.subdenomination) {
      return;
    }

    // Count consecutive digits (excluding decimal point)
    const digitsOnly = numStr.replace(/\./g, '');
    const digitCount = digitsOnly.length;

    if (digitCount > TooManyDigitsRule.MAX_CONSECUTIVE_DIGITS) {
      this.reportIssue(
        node,
        context,
        `Number literal has ${digitCount} consecutive digits. ` +
          `Numbers with more than ${TooManyDigitsRule.MAX_CONSECUTIVE_DIGITS} digits are hard to read and error-prone. ` +
          `Use underscores (e.g., ${this.formatWithUnderscores(numStr)}) or scientific notation (e.g., ${this.suggestScientific(numStr)}).`
      );
    }
  }

  /**
   * Format number with underscores for readability
   */
  private formatWithUnderscores(numStr: string): string {
    // Remove any existing formatting
    const clean = numStr.replace(/[_,\s]/g, '');

    // Split into groups of 3 from the right
    const parts = [];
    for (let i = clean.length; i > 0; i -= 3) {
      const start = Math.max(0, i - 3);
      parts.unshift(clean.slice(start, i));
    }

    return parts.join('_');
  }

  /**
   * Suggest scientific notation alternative
   */
  private suggestScientific(numStr: string): string {
    const clean = numStr.replace(/[_,\s]/g, '');

    // Count trailing zeros
    const trailingZeros = clean.match(/0+$/)?.[0]?.length || 0;

    if (trailingZeros >= 3) {
      const significand = clean.slice(0, -trailingZeros);
      return `${significand}e${trailingZeros}`;
    }

    // Just show first few digits with e notation
    const exponent = clean.length - 1;
    if (exponent > 0) {
      const firstDigit = clean[0];
      return `${firstDigit}e${exponent}`;
    }

    return numStr;
  }

  /**
   * Report a too-many-digits issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
    message: string
  ): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column,
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column,
        },
      },
    });
  }
}
