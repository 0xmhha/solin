/**
 * Events Math Security Rule
 *
 * Detects mathematical operations performed directly in event emissions.
 * This can lead to discrepancies between emitted values and actual state changes,
 * making it difficult to track state accurately through events.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-event-emission
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects mathematical operations in event emissions:
 * - Arithmetic operations (+, -, *, /, %, **)
 * - Operations should be performed on state and stored before emission
 * - Events should reflect actual state values, not computed values
 *
 * This pattern can cause issues:
 * 1. Event values may not match actual state
 * 2. Harder to verify state changes through events
 * 3. Potential for silent calculation errors
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: Math in event
 * function transfer(uint amount) public {
 *   balance = balance - amount;
 *   emit Transfer(balance - amount); // Wrong! Uses old balance
 * }
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: Emit actual state
 * function transfer(uint amount) public {
 *   balance = balance - amount;
 *   emit Transfer(balance); // Correct state value
 * }
 * ```
 */
export class EventsMathRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/events-maths',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Mathematical Operations in Event Emissions',
      description:
        'Detects mathematical operations performed directly in event emissions. ' +
        'This can lead to discrepancies between emitted values and actual state changes, ' +
        'making it difficult to accurately track contract state through events.',
      recommendation:
        'Perform calculations before emitting events and emit the stored state values. ' +
        'Store computed values in variables or state, then emit those values. ' +
        'This ensures event data accurately reflects contract state.',
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

    // Check for emit statements
    if (node.type === 'EmitStatement') {
      this.checkEmitStatement(node, context);
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
   * Check emit statement for mathematical operations in arguments
   */
  private checkEmitStatement(node: any, context: AnalysisContext): void {
    if (!node.eventCall || !node.eventCall.arguments) {
      return;
    }

    const args = node.eventCall.arguments;

    // Check each argument for mathematical operations
    for (const arg of args) {
      if (this.containsMathOperation(arg)) {
        const eventName = this.getEventName(node.eventCall);
        this.reportIssue(
          node,
          context,
          `Event '${eventName}' contains mathematical operations in its arguments. ` +
            'Perform calculations before emitting and emit the stored value instead. ' +
            'This prevents discrepancies between event data and actual contract state.'
        );
        // Report once per emit statement
        return;
      }
    }
  }

  /**
   * Check if expression contains mathematical operations
   */
  private containsMathOperation(node: any): boolean {
    if (!node || typeof node !== 'object') {
      return false;
    }

    // Check for arithmetic binary operations
    if (node.type === 'BinaryOperation') {
      const operator = node.operator;
      const mathOperators = ['+', '-', '*', '/', '%', '**'];

      if (mathOperators.includes(operator)) {
        return true;
      }
    }

    // Check for unary operations (++, --, negation)
    if (node.type === 'UnaryOperation') {
      const operator = node.operator;
      const mathOperators = ['++', '--', '-', '+'];

      if (mathOperators.includes(operator) && !node.isPrefix) {
        return true;
      }
    }

    // Recursively check nested expressions
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some((child) => this.containsMathOperation(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.containsMathOperation(value)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get event name from event call
   */
  private getEventName(eventCall: any): string {
    if (!eventCall) {
      return 'Unknown';
    }

    // Direct identifier
    if (eventCall.type === 'Identifier') {
      return eventCall.name;
    }

    // Function call with expression
    if (eventCall.expression && eventCall.expression.type === 'Identifier') {
      return eventCall.expression.name;
    }

    // Member access
    if (eventCall.type === 'MemberAccess') {
      return eventCall.memberName;
    }

    return 'Unknown';
  }

  /**
   * Report an events-maths issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
    message: string
  ): void {
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
    });
  }
}
