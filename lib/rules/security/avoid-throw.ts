/**
 * Avoid Throw Security Rule
 *
 * Detects usage of deprecated throw statement and recommends revert() or require()
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects deprecated throw statement usage:
 * - throw statement was deprecated in Solidity 0.4.13
 * - revert() or require() should be used instead
 * - throw consumes all remaining gas (like assert)
 * - revert()/require() refund unused gas
 */
export class AvoidThrow extends AbstractRule {
  constructor() {
    super({
      id: 'security/avoid-throw',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Avoid deprecated throw statement',
      description:
        'Detects usage of deprecated throw statement. The throw statement was deprecated in Solidity 0.4.13 and removed in 0.5.0. Use revert() or require() instead.',
      recommendation:
        'Replace throw with revert() for unconditional reverts or require() for conditional checks. These functions refund unused gas, unlike throw which consumes all remaining gas.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find ThrowStatement nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for ThrowStatement nodes
    if (node.type === 'ThrowStatement') {
      this.reportIssue(node, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Report issue for throw statement usage
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
        'Deprecated throw statement detected. Use revert() or require() instead. The throw statement was deprecated in Solidity 0.4.13 and consumes all remaining gas.',
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
