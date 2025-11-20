/**
 * Msg Value in Loop Security Rule
 *
 * Detects msg.value usage within loops which can lead to incorrect payments.
 * Each iteration reuses the same msg.value, causing overpayment or DoS vulnerabilities.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class MsgValueLoopRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/msg-value-loop',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Msg.value Usage in Loop',
      description:
        'Detects msg.value usage within loops. Using msg.value in a loop causes the same value to be reused in each iteration, leading to incorrect payment amounts and potential DoS attacks.',
      recommendation:
        'Calculate total required amount before the loop and divide appropriately, or track cumulative payments to ensure msg.value is not exceeded. Store msg.value in a variable before the loop.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for loops
    if (
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    ) {
      this.checkLoop(node, context);
    }

    // Recursively traverse
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

  private checkLoop(loopNode: any, context: AnalysisContext): void {
    // Get loop body
    const body = loopNode.body;
    if (!body) return;

    // Check if msg.value is used in the loop body
    if (this.hasMsgValueInBody(body)) {
      this.reportIssue(loopNode, context);
    }
  }

  private hasMsgValueInBody(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // Check for MemberAccess: msg.value
    if (node.type === 'MemberAccess') {
      if (
        node.expression &&
        node.expression.type === 'Identifier' &&
        node.expression.name === 'msg' &&
        node.memberName === 'value'
      ) {
        return true;
      }
    }

    // Recursively check children (skip loc/range)
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];

      if (Array.isArray(value)) {
        for (const child of value) {
          if (this.hasMsgValueInBody(child)) return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.hasMsgValueInBody(value)) return true;
      }
    }

    return false;
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    const loopType =
      node.type === 'ForStatement' ? 'for' : node.type === 'WhileStatement' ? 'while' : 'do-while';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `msg.value used in ${loopType} loop. The same msg.value is reused in each iteration, causing incorrect payment amounts. Store msg.value before the loop and calculate per-iteration amounts.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
