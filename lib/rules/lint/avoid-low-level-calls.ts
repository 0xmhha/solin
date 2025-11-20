/**
 * Avoid Low Level Calls Rule
 *
 * Flags usage of low-level calls (call, delegatecall, staticcall)
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that flags low-level calls:
 * - .call()
 * - .delegatecall()
 * - .staticcall()
 * These are risky and should be avoided in favor of higher-level abstractions
 */
export class AvoidLowLevelCallsRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/avoid-low-level-calls',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Avoid Low Level Calls',
      description:
        'Flags usage of low-level calls (call, delegatecall, staticcall) which can be risky and should be avoided when possible.',
      recommendation:
        'Avoid using low-level calls (.call(), .delegatecall(), .staticcall()). Use higher-level abstractions like interfaces and contract calls instead.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if this is a function call (low-level calls)
    if (node.type === 'FunctionCall') {
      this.checkMemberAccess(node, context);
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
   * Check for low-level call member accesses
   */
  private checkMemberAccess(node: any, context: AnalysisContext): void {
    const lowLevelCalls = ['call', 'delegatecall', 'staticcall'];
    let callType: string | null = null;

    // Check for member access (e.g., address.call())
    if (node.expression?.type === 'MemberAccess') {
      const memberAccess = node.expression;
      const memberName = memberAccess.memberName;

      if (memberName && lowLevelCalls.includes(memberName)) {
        callType = memberName;
      }
    }

    // Check for FunctionCallOptions (new syntax: .call{value: }())
    // In this case, the expression might be a FunctionCallOptions node
    if (node.expression?.type === 'FunctionCallOptions') {
      const innerExpression = node.expression.expression;
      if (innerExpression?.type === 'MemberAccess') {
        const memberName = innerExpression.memberName;
        if (memberName && lowLevelCalls.includes(memberName)) {
          callType = memberName;
        }
      }
    }

    if (callType && node.loc) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Avoid using low-level ${callType}(). Use higher-level abstractions or interfaces instead.`,
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
}
