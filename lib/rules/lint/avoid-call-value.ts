/**
 * Avoid Call Value Rule
 *
 * Flags deprecated .call.value() syntax
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that flags deprecated .call.value() syntax:
 * - Old syntax: address.call.value(amount)("")
 * - New syntax: address.call{value: amount}("")
 * - Deprecated since Solidity 0.6.0
 */
export class AvoidCallValueRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/avoid-call-value',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Avoid Call Value',
      description:
        'Flags deprecated .call.value() syntax which was replaced by .call{value: } in Solidity 0.6.0+.',
      recommendation:
        'Replace .call.value(amount)() with .call{value: amount}(). This is the modern syntax introduced in Solidity 0.6.0.',
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

    // Check if this is a function call (.call.value())
    if (node.type === 'FunctionCall') {
      this.checkFunctionCall(node, context);
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
   * Check for deprecated .call.value() syntax
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    // Check if this is a chained member access pattern
    // e.g., address.call.value(amount)
    if (node.expression?.type === 'MemberAccess') {
      const memberAccess = node.expression;

      // Check if member is 'value' and the expression is another member access
      if (memberAccess.memberName === 'value' && memberAccess.expression?.type === 'MemberAccess') {
        const innerMemberAccess = memberAccess.expression;

        // Check if the inner member is 'call', 'delegatecall', or has a 'gas' before
        if (
          innerMemberAccess.memberName === 'call' ||
          innerMemberAccess.memberName === 'delegatecall' ||
          innerMemberAccess.memberName === 'gas'
        ) {
          if (node.loc) {
            context.report({
              ruleId: this.metadata.id,
              severity: this.metadata.severity,
              category: this.metadata.category,
              message:
                'Deprecated .call.value() syntax detected. Use .call{value: } instead (Solidity 0.6.0+).',
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

      // Also check for .gas() pattern which is deprecated
      if (memberAccess.memberName === 'gas' && memberAccess.expression?.type === 'MemberAccess') {
        const innerMemberAccess = memberAccess.expression;
        if (
          innerMemberAccess.memberName === 'call' ||
          innerMemberAccess.memberName === 'delegatecall'
        ) {
          if (node.loc) {
            context.report({
              ruleId: this.metadata.id,
              severity: this.metadata.severity,
              category: this.metadata.category,
              message:
                'Deprecated .call.gas() syntax detected. Use .call{gas: } instead (Solidity 0.6.0+).',
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
    }
  }
}
