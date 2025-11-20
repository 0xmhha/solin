/**
 * Pragma Version Security Rule
 *
 * Validates pragma version specifications
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that validates pragma version:
 * - Ensures pragma directive is present
 * - Important for compiler version consistency
 * - Helps prevent version-related bugs
 */
export class PragmaVersion extends AbstractRule {
  constructor() {
    super({
      id: 'security/pragma-version',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Pragma version validation',
      description:
        'Validates that Solidity files include a pragma directive specifying the compiler version.',
      recommendation:
        'Always specify a pragma version directive at the beginning of your Solidity files.',
    });
  }

  analyze(context: AnalysisContext): void {
    const hasPragma = this.checkForPragma(context.ast);

    if (!hasPragma) {
      this.reportIssue(context);
    }
  }

  /**
   * Check if AST contains pragma directive
   */
  private checkForPragma(node: any): boolean {
    if (!node) {
      return false;
    }

    // Check current node
    if (node.type === 'PragmaDirective') {
      return true;
    }

    // Check children array (for SourceUnit)
    if (Array.isArray(node.children)) {
      return node.children.some((child: any) => child.type === 'PragmaDirective');
    }

    return false;
  }

  /**
   * Report issue for missing pragma
   */
  private reportIssue(context: AnalysisContext): void {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: 'Missing pragma directive. Specify compiler version with pragma solidity statement.',
      location: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 0 },
      },
    });
  }
}
