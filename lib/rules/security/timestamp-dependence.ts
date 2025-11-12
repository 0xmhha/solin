/**
 * Timestamp Dependence Security Rule
 *
 * Detects dangerous usage of block.timestamp that can be manipulated by miners
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects dangerous timestamp usage:
 * - block.timestamp used for randomness (% modulo)
 * - Equality/inequality comparisons (==, !=)
 * - now keyword (deprecated but still used)
 * - Critical logic depending on exact timestamp
 *
 * Safe usage:
 * - Range comparisons (>=, <=, >, <)
 * - Time differences (timestamp - other)
 * - Time additions (timestamp + duration)
 */
export class TimestampDependenceRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/timestamp-dependence',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Timestamp Dependence',
      description:
        'Detects dangerous usage of block.timestamp. Miners can manipulate timestamps within a 15-second window, making them unsuitable for randomness or exact time comparisons.',
      recommendation:
        'Avoid using block.timestamp for randomness or with equality operators (==, !=). Use >= or <= for time-based conditions. Consider using block.number or oracle-based randomness for critical logic.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST and check every node
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for now keyword (deprecated)
    if (node.type === 'Identifier' && node.name === 'now') {
      this.reportTimestampIssue(
        node,
        context,
        'Use of deprecated "now" keyword. Replace with block.timestamp for clarity.'
      );
    }

    // Check for binary operations involving timestamp
    if (node.type === 'BinaryOperation') {
      this.checkBinaryOperation(node, context);
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
   * Check if binary operation involves dangerous timestamp usage
   */
  private checkBinaryOperation(node: any, context: AnalysisContext): void {
    const operator = node.operator;
    const left = node.left;
    const right = node.right;

    // Check if either operand is a timestamp
    const hasTimestamp =
      this.isTimestampExpression(left) || this.isTimestampExpression(right);

    if (!hasTimestamp) {
      return;
    }

    // Check for dangerous operators
    if (operator === '%') {
      this.reportTimestampIssue(
        node,
        context,
        'Dangerous use of block.timestamp for randomness with modulo operator. Miners can manipulate timestamps to influence outcomes. Consider using Chainlink VRF or commit-reveal schemes.'
      );
    } else if (operator === '==') {
      this.reportTimestampIssue(
        node,
        context,
        'Dangerous equality comparison with timestamp. Exact timestamp matches are unreliable as miners can manipulate block times. Use >= or <= for time-based conditions.'
      );
    } else if (operator === '!=') {
      this.reportTimestampIssue(
        node,
        context,
        'Dangerous inequality comparison with timestamp. Exact timestamp checks are unreliable. Use range comparisons (>=, <=, >, <) instead.'
      );
    }
    // Safe operators: >=, <=, >, <, -, +
  }

  /**
   * Check if an expression is a timestamp (block.timestamp or now)
   */
  private isTimestampExpression(node: any): boolean {
    if (!node) {
      return false;
    }

    // Check for 'now' keyword
    if (node.type === 'Identifier' && node.name === 'now') {
      return true;
    }

    // Check for block.timestamp
    if (node.type === 'MemberAccess') {
      const memberName = node.memberName;
      const expression = node.expression;

      if (
        memberName === 'timestamp' &&
        expression &&
        expression.type === 'Identifier' &&
        expression.name === 'block'
      ) {
        return true;
      }
    }

    // Handle TupleExpression (parentheses in Solidity)
    if (node.type === 'TupleExpression') {
      if (node.components && Array.isArray(node.components)) {
        return node.components.some((component: any) =>
          this.isTimestampExpression(component)
        );
      }
    }

    // Recursively check nested expressions (for cases like (block.timestamp + seed) % 100)
    if (node.type === 'BinaryOperation') {
      return (
        this.isTimestampExpression(node.left) ||
        this.isTimestampExpression(node.right)
      );
    }

    return false;
  }

  /**
   * Report a timestamp-related issue
   */
  private reportTimestampIssue(
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
