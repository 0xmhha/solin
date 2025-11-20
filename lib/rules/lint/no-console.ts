/**
 * No Console Rule
 *
 * Detects usage of Hardhat console.log and related debugging statements.
 * These should be removed before production deployment.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class NoConsoleRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/no-console',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'No Console',
      description:
        'Detects usage of Hardhat console.log and console2.log debugging statements. ' +
        'Console logging is useful for development but should be removed before production deployment ' +
        'as it increases gas costs and may expose sensitive information.',
      recommendation:
        'Remove all console.log statements and hardhat/console.sol imports before deploying to production. ' +
        'Use events for production logging instead.',
    });
  }

  analyze(context: AnalysisContext): void {
    const lines = context.sourceCode.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine.length === 0) {
        continue;
      }

      // Skip single-line comments
      if (trimmedLine.startsWith('//')) {
        continue;
      }

      // Check for console import
      if (trimmedLine.includes('import') && trimmedLine.includes('hardhat')) {
        if (trimmedLine.includes('console.sol') || trimmedLine.includes('console2.sol')) {
          this.reportConsoleUsage(i + 1, 'import', context);
        }
      }

      // Check for console function calls (outside of strings and comments)
      if (this.hasConsoleCall(line)) {
        this.reportConsoleUsage(i + 1, 'call', context);
      }
    }
  }

  private hasConsoleCall(line: string): boolean {
    // Remove string literals to avoid false positives
    const withoutStrings = this.removeStrings(line);

    // Remove comments to avoid false positives
    const commentIndex = withoutStrings.indexOf('//');
    const withoutComments =
      commentIndex >= 0 ? withoutStrings.substring(0, commentIndex) : withoutStrings;

    // Check for console.* or console2.* calls
    return (
      withoutComments.includes('console.log') ||
      withoutComments.includes('console.') ||
      withoutComments.includes('console2.')
    );
  }

  private removeStrings(line: string): string {
    let result = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (escaped) {
        escaped = false;
        if (!inSingleQuote && !inDoubleQuote) {
          result += char;
        }
        continue;
      }

      if (char === '\\') {
        escaped = true;
        if (!inSingleQuote && !inDoubleQuote) {
          result += char;
        }
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote) {
        result += char;
      }
    }

    return result;
  }

  private reportConsoleUsage(
    line: number,
    type: 'import' | 'call',
    context: AnalysisContext
  ): void {
    const message =
      type === 'import'
        ? `Line ${line}: Remove console import before production deployment. ` +
          `Console logging increases gas costs and may expose sensitive information.`
        : `Line ${line}: Remove console.log call before production deployment. ` +
          `Use events for production logging instead.`;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: { line, column: 0 },
        end: { line, column: 1 },
      },
    });
  }
}
