/**
 * No Inline Assembly Security Rule
 *
 * Detects usage of inline assembly blocks and warns about security risks
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects inline assembly usage:
 * - Inline assembly bypasses Solidity's type safety
 * - Can introduce security vulnerabilities if not used carefully
 * - Harder to audit and maintain
 * - Should be avoided unless absolutely necessary
 * - Requires careful security review when used
 */
export class NoInlineAssembly extends AbstractRule {
  constructor() {
    super({
      id: 'security/no-inline-assembly',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Avoid inline assembly',
      description:
        'Detects usage of inline assembly blocks. Inline assembly bypasses Solidity\'s type safety and security checks, making code harder to audit and more prone to vulnerabilities.',
      recommendation:
        'Avoid inline assembly unless absolutely necessary. If assembly is required, ensure thorough security audits and extensive documentation explaining why it\'s needed and how it works.',
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
        'Inline assembly detected. Assembly bypasses Solidity\'s type safety and security checks. Avoid unless absolutely necessary and ensure thorough security audit.',
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
