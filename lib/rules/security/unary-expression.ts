/**
 * Unary Expression Security Rule
 *
 * Detects potentially dangerous unary expressions, particularly delete
 * operations on complex data structures which may not behave as expected.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#dangerous-unary-expressions
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects potentially dangerous unary expressions:
 * - delete on dynamic arrays (doesn't actually free memory)
 * - delete on mappings (only resets values, not keys)
 * - Complex delete operations
 *
 * Does not flag:
 * - Simple arithmetic unary operations (-, +)
 * - Logical not (!)
 * - Increment/decrement (++, --)
 *
 * @example Problematic
 * ```solidity
 * // Informational: delete behavior may be unexpected
 * uint256[] data;
 * delete data; // Sets length to 0, but doesn't free memory
 *
 * mapping(address => uint) balances;
 * delete balances[user]; // Resets value, user still "exists"
 * ```
 *
 * @example Better
 * ```solidity
 * // More explicit operations
 * while(data.length > 0) {
 *   data.pop(); // Explicit removal
 * }
 *
 * balances[user] = 0; // More explicit than delete
 * ```
 */
export class UnaryExpressionRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/unary-expression',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Dangerous Unary Expression',
      description:
        'Detects potentially dangerous unary expressions, particularly delete operations. ' +
        'Delete on dynamic arrays sets length to 0 but does not free memory. ' +
        'Delete on mappings resets values but keys still exist.',
      recommendation:
        'Be aware of delete behavior: it may not work as expected. ' +
        'For arrays, consider using pop() in a loop. For mappings, explicitly set values to 0. ' +
        'Document the intended behavior clearly.',
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

    // Check unary operations
    if (node.type === 'UnaryOperation') {
      this.checkUnaryOperation(node, context);
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
   * Check if unary operation is potentially dangerous
   */
  private checkUnaryOperation(node: any, context: AnalysisContext): void {
    // Focus on delete operations
    if (node.operator === 'delete') {
      this.reportIssue(
        node,
        context,
        'Delete operation detected. Be aware that delete on arrays sets length to 0 ' +
          'but does not free memory, and delete on mappings only resets values. ' +
          'Ensure this is the intended behavior.'
      );
    }
  }

  /**
   * Report a unary-expression issue
   */
  private reportIssue(node: any, context: AnalysisContext, message: string): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
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
      metadata: {
        suggestion:
          'Consider using more explicit operations like array.pop() or setting values to 0.',
      },
    });
  }
}
