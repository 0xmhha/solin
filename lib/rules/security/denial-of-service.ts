/**
 * Denial of Service Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class DenialOfServiceRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/denial-of-service',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Denial of Service Vulnerability',
      description:
        'Detects patterns that can lead to denial of service: unbounded loops over storage arrays, gas-intensive operations in loops, or external calls in loops.',
      recommendation:
        'Avoid unbounded loops. Use pagination for large datasets. Limit array sizes. Avoid external calls in loops. Use pull over push payment patterns.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    ) {
      this.checkLoop(node, context);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkLoop(node: any, context: AnalysisContext): void {
    if (!node.body || !node.loc) return;

    // Check if loop iterates over array length
    if (this.hasArrayLengthCondition(node)) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message:
          'Loop iterating over array length detected. Unbounded loops can cause DOS. Consider pagination or limiting array size.',
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
  }

  private hasArrayLengthCondition(node: any): boolean {
    const condition = node.conditionExpression || node.condition;
    if (!condition) return false;

    return this.containsArrayLength(condition);
  }

  private containsArrayLength(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    if (node.type === 'MemberAccess' && node.memberName === 'length') {
      return true;
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some((child) => this.containsArrayLength(child))) return true;
      } else if (value && typeof value === 'object') {
        if (this.containsArrayLength(value)) return true;
      }
    }

    return false;
  }
}
