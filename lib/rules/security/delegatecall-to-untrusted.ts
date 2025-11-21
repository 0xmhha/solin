/**
 * Delegatecall to Untrusted Address Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class DelegatecallToUntrustedRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/delegatecall-to-untrusted',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Delegatecall to Untrusted Address',
      description:
        'Detects delegatecall to untrusted or user-controlled addresses. Delegatecall executes code in the context of the calling contract, allowing complete control over storage.',
      recommendation:
        'Only use delegatecall with trusted, verified contract addresses. Implement a whitelist of approved addresses. Consider using libraries or upgradeable proxy patterns with controlled implementation addresses.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'MemberAccess' && node.memberName === 'delegatecall') {
      this.checkDelegatecall(node, context);
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

  private checkDelegatecall(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        'Delegatecall detected. Ensure the target address is trusted and validated. Delegatecall can give complete control over contract storage to the called contract.',
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
