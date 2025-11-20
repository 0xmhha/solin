/**
 * Boolean Equality Lint Rule
 *
 * Detects unnecessary explicit boolean comparisons (== true, != false).
 * Direct boolean usage is more readable and gas-efficient.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class BooleanEqualityRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/boolean-equality',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Unnecessary Boolean Equality',
      description:
        'Detects unnecessary explicit boolean comparisons. Comparing boolean values with == true or == false is redundant and less readable. Use the boolean value directly or negate it with !.',
      recommendation:
        'Use boolean values directly (if (flag)) or negate them (if (!flag)) instead of explicit comparisons (if (flag == true) or if (flag == false)).',
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
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkBinaryOperation(node: any, context: AnalysisContext): void {
    // Check for == or != operators
    if (node.operator !== '==' && node.operator !== '!=') return;

    const left = node.left;
    const right = node.right;

    // Check if either side is a boolean literal
    if (this.isBooleanLiteral(left) || this.isBooleanLiteral(right)) {
      this.reportIssue(node, context);
    }
  }

  private isBooleanLiteral(node: any): boolean {
    if (!node) return false;

    // Check for BooleanLiteral type
    if (node.type === 'BooleanLiteral') return true;

    // Check for 'true' or 'false' string value (some parsers represent it this way)
    if (node.type === 'Literal' && typeof node.value === 'boolean') return true;

    return false;
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    const operator = node.operator;
    const suggestion =
      operator === '=='
        ? 'Use the boolean value directly or negate it with !'
        : 'Use negation (!) instead of != comparison';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Unnecessary boolean comparison detected. ${suggestion}. Direct boolean usage is more readable and gas-efficient.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
