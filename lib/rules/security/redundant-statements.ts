/**
 * Redundant Statements Security Rule
 *
 * Detects redundant or no-op statements
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects redundant statements:
 * - Self-assignments (x = x)
 * - Empty blocks
 * - No-op operations
 */
export class RedundantStatements extends AbstractRule {
  constructor() {
    super({
      id: 'security/redundant-statements',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Redundant statement detected',
      description:
        'Detects redundant or no-op statements like self-assignments and empty blocks that serve no purpose.',
      recommendation:
        'Remove redundant statements to improve code clarity and potentially identify logic errors.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find redundant statements
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for self-assignment
    if (node.type === 'ExpressionStatement' && node.expression) {
      this.checkSelfAssignment(node.expression, context);
    }

    // Check for empty blocks
    if (node.type === 'Block') {
      this.checkEmptyBlock(node, context);
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
   * Check for self-assignment (x = x)
   */
  private checkSelfAssignment(expr: any, context: AnalysisContext): void {
    if (expr.type !== 'BinaryOperation' || expr.operator !== '=') {
      return;
    }

    const left = expr.left;
    const right = expr.right;

    // Check if both sides are identifiers with the same name
    if (
      left &&
      right &&
      left.type === 'Identifier' &&
      right.type === 'Identifier' &&
      left.name === right.name
    ) {
      this.reportIssue(expr, 'Self-assignment detected', context);
    }
  }

  /**
   * Check for empty blocks
   */
  private checkEmptyBlock(block: any, context: AnalysisContext): void {
    if (!block.statements || block.statements.length === 0) {
      // Check if this is part of an if statement or other control structure
      // (we want to flag empty blocks in control structures)
      if (block.loc) {
        this.reportIssue(block, 'Empty block detected', context);
      }
    }
  }

  /**
   * Report redundant statement issue
   */
  private reportIssue(
    node: any,
    message: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `${message}. This statement has no effect and should be removed.`,
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
