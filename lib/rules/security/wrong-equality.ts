/**
 * Wrong Equality Security Rule
 *
 * Detects strict equality (==, !=) comparisons with contract balance or
 * block timestamps. These can be manipulated by miners or through
 * self-destruct, making strict equality dangerous for critical logic.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#dangerous-strict-equalities
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects dangerous strict equality comparisons:
 * - address.balance == value (can be manipulated via selfdestruct)
 * - block.timestamp == value (can be manipulated by miners)
 * - block.number == value (can be off by one)
 *
 * Does not flag:
 * - Inequality comparisons (>, <, >=, <=)
 * - Comparisons with regular variables
 *
 * @example Dangerous
 * ```solidity
 * // Bad: Strict equality with balance
 * require(address(this).balance == 1 ether); // Can fail unexpectedly
 * if (block.timestamp == deadline) { } // Miners can manipulate
 * ```
 *
 * @example Safer
 * ```solidity
 * // Good: Use inequality
 * require(address(this).balance >= 1 ether);
 * if (block.timestamp >= deadline) { }
 * ```
 */
export class WrongEqualityRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/wrong-equality',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Dangerous Strict Equality',
      description:
        'Detects strict equality (== or !=) comparisons with balance or timestamps. ' +
        'Contract balance can be manipulated via selfdestruct. ' +
        'Timestamps can be manipulated by miners within bounds. ' +
        'Use inequality comparisons (>=, <=) instead.',
      recommendation:
        'Replace strict equality with inequality comparisons. ' +
        'Use >= or <= instead of ==. Use != only when necessary and document the reasoning. ' +
        'Never rely on exact balance values for critical logic.',
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

    // Check binary operations
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
   * Check if binary operation uses strict equality dangerously
   */
  private checkBinaryOperation(node: any, context: AnalysisContext): void {
    // Only check strict equality operators
    if (node.operator !== '==' && node.operator !== '!=') {
      return;
    }

    // Check if either side is a dangerous member access
    const leftDangerous = this.isDangerousMemberAccess(node.left);
    const rightDangerous = this.isDangerousMemberAccess(node.right);

    const memberType = leftDangerous || rightDangerous;
    if (memberType) {
      this.reportIssue(
        node,
        context,
        memberType,
        `Strict equality (${node.operator}) with ${memberType} detected. ` +
          `${memberType === 'balance' ? 'Balance can be manipulated via selfdestruct. ' : 'Timestamp can be manipulated by miners. '}` +
          'Use inequality comparisons (>= or <=) instead for safer logic.'
      );
    }
  }

  /**
   * Check if expression is a dangerous member access
   */
  private isDangerousMemberAccess(node: any): string | null {
    if (!node || node.type !== 'MemberAccess') {
      return null;
    }

    // Check for .balance
    if (node.memberName === 'balance') {
      return 'balance';
    }

    // Check for block.timestamp or block.number
    if (node.expression && node.expression.type === 'Identifier') {
      if (node.expression.name === 'block') {
        if (node.memberName === 'timestamp' || node.memberName === 'number') {
          return node.memberName;
        }
      }
    }

    return null;
  }

  /**
   * Report a wrong-equality issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
    memberType: string,
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
      metadata: {
        suggestion: `Replace ${node.operator} with >= or <= for safer comparison with ${memberType}.`,
      },
    });
  }
}
