/**
 * Incorrect Equality Security Rule
 *
 * Detects dangerous use of strict equality (== or !=) with balance or timestamp.
 * These values should use comparison operators (>=, <=, >, <) instead of strict equality
 * because they can be manipulated or are unpredictable.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class IncorrectEqualityRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/incorrect-equality',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Incorrect Equality Usage',
      description:
        'Detects dangerous use of strict equality (== or !=) with balance or timestamp. ' +
        'Ether balance can be manipulated via selfdestruct or forced sends. ' +
        'Block timestamp is controlled by miners within bounds and should not use strict equality.',
      recommendation:
        'Use comparison operators (>=, <=, >, <) instead of strict equality for balance and timestamp checks. ' +
        'For balance: use >= or > to check if sufficient funds exist. ' +
        'For timestamp: use >= or <= to check if deadline passed or not yet reached.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for binary operations with == or !=
    if (node.type === 'BinaryOperation') {
      if (node.operator === '==' || node.operator === '!=') {
        this.checkEqualityOperation(node, context);
      }
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

  private checkEqualityOperation(node: any, context: AnalysisContext): void {
    // Check if either side involves balance or timestamp
    const leftIsBalance = this.isBalanceAccess(node.left);
    const rightIsBalance = this.isBalanceAccess(node.right);
    const leftIsTimestamp = this.isTimestampAccess(node.left);
    const rightIsTimestamp = this.isTimestampAccess(node.right);

    if (leftIsBalance || rightIsBalance) {
      this.reportIssue(node, 'balance', context);
    } else if (leftIsTimestamp || rightIsTimestamp) {
      this.reportIssue(node, 'timestamp', context);
    }
  }

  private isBalanceAccess(node: any): boolean {
    if (!node) return false;

    // Check for .balance member access
    if (node.type === 'MemberAccess' && node.memberName === 'balance') {
      return true;
    }

    // Recursively check in complex expressions
    if (node.type === 'FunctionCall' || node.type === 'MemberAccess') {
      if (node.expression && this.isBalanceAccess(node.expression)) {
        return true;
      }
    }

    return false;
  }

  private isTimestampAccess(node: any): boolean {
    if (!node) return false;

    // Check for block.timestamp
    if (node.type === 'MemberAccess') {
      if (
        node.memberName === 'timestamp' &&
        node.expression?.type === 'Identifier' &&
        node.expression?.name === 'block'
      ) {
        return true;
      }
    }

    // Check for 'now' (deprecated but still used in old code)
    if (node.type === 'Identifier' && node.name === 'now') {
      return true;
    }

    return false;
  }

  private reportIssue(node: any, valueType: string, context: AnalysisContext): void {
    if (!node.loc) return;

    const operator = node.operator;
    const suggestion =
      valueType === 'balance'
        ? 'Use >= or > to check if sufficient funds exist'
        : 'Use >= or <= to check if deadline passed or not yet reached';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Dangerous strict equality (${operator}) with ${valueType} detected. ` +
        `${valueType === 'balance' ? 'Ether balance can be manipulated via selfdestruct or forced sends. ' : ''}` +
        `${valueType === 'timestamp' ? 'Block timestamp is controlled by miners and should not use strict equality. ' : ''}` +
        `${suggestion}. ` +
        'Strict equality can cause unexpected behavior when values are manipulated or unpredictable.',
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
