/**
 * Divide Before Multiply Security Rule
 *
 * Detects division followed by multiplication which causes precision loss.
 * Pattern: a / b * c should be a * c / b
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class DivideBeforeMultiplyRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/divide-before-multiply',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Division Before Multiplication',
      description:
        'Detects division followed by multiplication which causes precision loss in integer arithmetic. Performing division before multiplication truncates intermediate results.',
      recommendation:
        'Reorder operations to perform multiplication before division (e.g., change a / b * c to a * c / b) to minimize precision loss.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'BinaryOperation') {
      this.checkBinaryOperation(node, context);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkBinaryOperation(node: any, context: AnalysisContext): void {
    // Check for multiplication where left side is division
    if (node.operator === '*' && node.left && node.left.type === 'BinaryOperation' && node.left.operator === '/') {
      this.reportIssue(node, context);
    }
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Division before multiplication detected. This causes precision loss. Reorder to multiply first, then divide (e.g., change 'a / b * c' to 'a * c / b').`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
