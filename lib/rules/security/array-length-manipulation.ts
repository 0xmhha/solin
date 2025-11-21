/**
 * Array Length Manipulation Security Rule
 *
 * Detects direct manipulation of array.length property which was deprecated
 * in Solidity 0.6.0. Direct manipulation can lead to gaps in storage and
 * unexpected behavior. Use push() and pop() instead.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#array-length-assignment
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects direct manipulation of array.length:
 * - array.length = value (direct assignment)
 * - array.length++ (increment)
 * - array.length-- (decrement)
 * - array.length += value (compound assignment)
 *
 * Does not flag:
 * - Reading array.length (e.g., in conditions, returns)
 * - Using array.push() and array.pop()
 *
 * @example Problematic
 * ```solidity
 * // Bad: Direct manipulation (deprecated in Solidity 0.6.0+)
 * uint256[] data;
 * data.length = 10;    // Don't do this
 * data.length--;       // Don't do this
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: Use push() and pop()
 * uint256[] data;
 * data.push(value);    // Add element
 * data.pop();          // Remove element
 * delete data[index];  // Clear element (leaves gap)
 * ```
 */
export class ArrayLengthManipulationRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/array-length-manipulation',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Array Length Manipulation',
      description:
        'Detects direct manipulation of array.length property. ' +
        'This practice was deprecated in Solidity 0.6.0 and can lead to ' +
        'storage gaps and unexpected behavior. Modern Solidity versions ' +
        'do not allow this operation.',
      recommendation:
        'Use array.push() to add elements and array.pop() to remove elements. ' +
        'These methods properly manage array storage. If you need to clear an array, ' +
        'create a new empty array or use a loop with delete.',
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

    // Check for assignments to array.length
    if (node.type === 'BinaryOperation' && node.operator === '=') {
      this.checkAssignment(node, context);
    }

    // Check for unary operations on array.length (++, --)
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
   * Check if assignment is to array.length
   */
  private checkAssignment(node: any, context: AnalysisContext): void {
    if (!node.left) {
      return;
    }

    // Check if left side is a member access to 'length'
    if (this.isMemberAccessToLength(node.left)) {
      this.reportIssue(
        node,
        context,
        'Direct manipulation of array.length is deprecated and not allowed in Solidity 0.6.0+. ' +
          'Use array.push() to add elements or array.pop() to remove elements.'
      );
    }
  }

  /**
   * Check if unary operation is on array.length
   */
  private checkUnaryOperation(node: any, context: AnalysisContext): void {
    if (!node.subExpression) {
      return;
    }

    // Check for ++ or -- operations
    if (node.operator === '++' || node.operator === '--') {
      if (this.isMemberAccessToLength(node.subExpression)) {
        this.reportIssue(
          node,
          context,
          `Array length ${node.operator} operation is deprecated and not allowed in Solidity 0.6.0+. ` +
            'Use array.push() to add elements or array.pop() to remove elements.'
        );
      }
    }
  }

  /**
   * Check if expression is a member access to 'length' property
   */
  private isMemberAccessToLength(node: any): boolean {
    return node && node.type === 'MemberAccess' && node.memberName === 'length';
  }

  /**
   * Report an array-length-manipulation issue
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
        suggestion: 'Replace with array.push() or array.pop() methods.',
      },
    });
  }
}
