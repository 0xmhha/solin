/**
 * Assert State Change Security Rule
 *
 * Detects assert() calls that contain state-changing operations.
 * assert() should only be used for invariant checking, not state changes.
 * State changes in assert() consume all gas on failure.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class AssertStateChangeRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/assert-state-change',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Assert with State Change',
      description:
        'Detects assert() calls containing state-changing operations. assert() should only validate invariants, not perform state changes. State changes in assert() consume all gas on failure and are difficult to debug. Use require() for validation with state changes.',
      recommendation:
        'Use require() instead of assert() when the condition involves state changes. Reserve assert() for checking invariants that should never fail under correct conditions.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for assert function calls
    if (node.type === 'FunctionCall') {
      this.checkFunctionCall(node, context);
    }

    // Recursively traverse
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

  private checkFunctionCall(node: any, context: AnalysisContext): void {
    // Check if it's an assert call
    if (!this.isAssertCall(node)) return;

    // Get the condition argument
    const condition = node.arguments && node.arguments[0];
    if (!condition) return;

    // Check for state-changing operations in the condition
    if (this.hasStateChange(condition)) {
      this.reportIssue(node, context);
    }
  }

  private isAssertCall(node: any): boolean {
    if (!node.expression) return false;

    // Check for assert identifier
    if (node.expression.type === 'Identifier') {
      return node.expression.name === 'assert';
    }

    return false;
  }

  private hasStateChange(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // Check for assignment operators
    if (node.type === 'BinaryOperation') {
      const assignmentOps = ['=', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=', '<<=', '>>='];
      if (assignmentOps.includes(node.operator)) {
        return true;
      }
    }

    // Check for unary operators (++, --)
    if (node.type === 'UnaryOperation') {
      if (node.operator === '++' || node.operator === '--') {
        return true;
      }
    }

    // Check for state-changing method calls (transfer, send)
    if (node.type === 'FunctionCall') {
      if (node.expression && node.expression.type === 'MemberAccess') {
        const methodName = node.expression.memberName;
        if (methodName === 'transfer' || methodName === 'send') {
          return true;
        }
      }

      // Check for any function call (potentially state-changing)
      // We'll flag all function calls as they might change state
      return true;
    }

    // Recursively check children
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];

      if (Array.isArray(value)) {
        for (const child of value) {
          if (this.hasStateChange(child)) return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.hasStateChange(value)) return true;
      }
    }

    return false;
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `assert() should not contain state-changing operations. State changes in assert() consume all gas on failure. Use require() for validation with state changes, and reserve assert() for invariant checks only.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
