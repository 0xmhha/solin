/**
 * Assembly Usage Security Rule
 *
 * Detects usage of inline assembly blocks (informational)
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects inline assembly usage:
 * - Inline assembly bypasses Solidity's type safety
 * - Provides informational warnings for tracking assembly usage
 * - Useful for auditing and code review
 */
export class AssemblyUsage extends AbstractRule {
  constructor() {
    super({
      id: 'security/assembly-usage',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Inline assembly usage detected',
      description:
        'Detects usage of inline assembly blocks. This is informational and helps track where assembly is used in the codebase for auditing purposes.',
      recommendation:
        'Ensure inline assembly is properly reviewed and documented. Consider if high-level Solidity can achieve the same goal.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find InlineAssemblyStatement nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for InlineAssemblyStatement nodes
    if (node.type === 'InlineAssemblyStatement') {
      this.reportIssue(node, context);
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
   * Report issue for inline assembly usage
   */
  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        'Inline assembly block detected. Assembly bypasses Solidity type safety - ensure proper review and documentation.',
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
