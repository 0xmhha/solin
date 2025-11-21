/**
 * Costly Loop Security Rule
 *
 * Detects loops that iterate over unbounded dynamic arrays or perform
 * gas-intensive operations that could lead to DoS via gas exhaustion.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class CostlyLoopRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/costly-loop',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Costly Loop Operation',
      description:
        'Detects loops that iterate over unbounded dynamic arrays or perform gas-intensive operations. ' +
        'Loops with unbounded iteration can consume excessive gas and cause transactions to fail or enable DoS attacks.',
      recommendation:
        'Avoid unbounded loops over dynamic arrays. Use pagination, process items in batches, ' +
        'implement pull-over-push patterns, or set explicit iteration limits. ' +
        'For large datasets, consider off-chain processing or separate transactions per item.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for loop statements
    if (this.isLoopStatement(node)) {
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

  private isLoopStatement(node: any): boolean {
    return (
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    );
  }

  private checkLoop(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    // Check if loop condition involves dynamic array length
    const isDynamicArrayLoop = this.hasDynamicArrayCondition(node);

    // Check if loop has bounded iteration with explicit limit
    const hasBoundCheck = this.hasBoundCheck(node);

    // Only report if it's a dynamic array loop without bounds
    if (isDynamicArrayLoop && !hasBoundCheck) {
      this.reportIssue(node, context);
    }
  }

  private hasDynamicArrayCondition(node: any): boolean {
    const condition = this.getLoopCondition(node);
    if (!condition) return false;

    // Check if condition references .length of an identifier
    return this.containsDynamicLength(condition);
  }

  private getLoopCondition(node: any): any {
    if (node.type === 'ForStatement') {
      return node.conditionExpression;
    } else if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
      return node.condition;
    }
    return null;
  }

  private containsDynamicLength(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // Check for .length access on identifier (dynamic array)
    if (node.type === 'MemberAccess' && node.memberName === 'length') {
      const expression = node.expression;
      // If expression is Identifier or IndexAccess, it could be dynamic array
      if (expression && (expression.type === 'Identifier' || expression.type === 'IndexAccess')) {
        // Check if it's not a fixed-size array type
        // Fixed-size arrays would have [N] in type, but we can't easily detect from AST
        // So we conservatively assume .length means dynamic array
        return true;
      }
    }

    // Recursively check child nodes
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some(child => this.containsDynamicLength(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.containsDynamicLength(value)) {
          return true;
        }
      }
    }

    return false;
  }

  private hasBoundCheck(node: any): boolean {
    const condition = this.getLoopCondition(node);
    if (!condition) return false;

    // Check if condition has multiple comparisons (e.g., i < n && i < 100)
    // or uses min/max operations
    if (this.hasMultipleConditions(condition)) {
      return true;
    }

    // Check if loop iterates over literal number (e.g., i < 10)
    if (this.hasLiteralBound(condition)) {
      return true;
    }

    return false;
  }

  private hasMultipleConditions(node: any): boolean {
    if (!node) return false;

    // Check for logical AND (&&) or OR (||) operations
    if (node.type === 'BinaryOperation') {
      if (node.operator === '&&' || node.operator === '||') {
        return true;
      }
    }

    return false;
  }

  private hasLiteralBound(node: any): boolean {
    if (!node) return false;

    // Check if condition compares against a number literal
    if (node.type === 'BinaryOperation') {
      const operators = ['<', '<=', '>', '>='];
      if (operators.includes(node.operator)) {
        // Check if either side is a literal number
        if (this.isNumberLiteral(node.left) || this.isNumberLiteral(node.right)) {
          return true;
        }
      }
    }

    return false;
  }

  private isNumberLiteral(node: any): boolean {
    return node && node.type === 'NumberLiteral';
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    const loopType =
      node.type === 'ForStatement' ? 'for' : node.type === 'WhileStatement' ? 'while' : 'do-while';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Costly ${loopType} loop detected. Loop iterates over unbounded dynamic array which can cause gas exhaustion and DoS. ` +
        'Consider using pagination, batch processing, pull-over-push pattern, or explicit iteration limits. ' +
        'Unbounded loops are vulnerable to DoS attacks where array growth makes transactions impossibly expensive.',
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
