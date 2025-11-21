/**
 * Unsafe External Call Security Rule
 *
 * Detects external calls to user-controlled addresses which can be exploited.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class UnsafeExternalCallRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/unsafe-external-call',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Unsafe External Call',
      description:
        'Detects external calls to user-controlled addresses. Allowing users to specify ' +
        'call targets enables attacks like calling malicious contracts or stealing funds.',
      recommendation:
        'Use a whitelist of allowed addresses. Validate target addresses. ' +
        'Avoid delegatecall to user-controlled addresses as it gives full storage access.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionCall') {
      this.checkExternalCall(node, context);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkExternalCall(node: any, context: AnalysisContext): void {
    const expr = node.expression;
    if (expr?.type === 'MemberAccess') {
      const methodName = expr.memberName;
      if (methodName === 'call' || methodName === 'delegatecall') {
        const target = expr.expression;
        if (this.isUserControlled(target)) {
          this.reportIssue(
            node,
            `Unsafe ${methodName} to user-controlled address. This allows attackers to execute arbitrary code. ` +
              'Use a whitelist of trusted addresses or remove user control over the target.',
            context
          );
        }
      }
    }
  }

  private isUserControlled(node: any): boolean {
    if (!node) return false;

    // If it's a parameter or state variable that could be set by users
    if (node.type === 'Identifier') {
      const name = node.name;
      // Skip constants (usually uppercase) and underscored variables
      if (name === name.toUpperCase()) return false; // Likely a constant
      if (name.startsWith('_')) return false;
      if (name === 'this') return false;
      // If it's a function parameter or variable, it might be user-controlled
      return true;
    }

    return false;
  }

  private reportIssue(node: any, message: string, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
