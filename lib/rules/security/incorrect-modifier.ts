/**
 * Incorrect Modifier Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class IncorrectModifierRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/incorrect-modifier',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Incorrectly Implemented Modifier',
      description:
        'Detects modifiers that may not work as expected, such as modifiers without underscore or with incorrect logic.',
      recommendation:
        'Ensure all modifiers contain the underscore (_) placeholder. Verify modifier logic executes before and after the function as intended.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'ModifierDefinition') {
      this.checkModifier(node, context);
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

  private checkModifier(node: any, context: AnalysisContext): void {
    if (!node.body || !node.loc) return;

    const hasUnderscore = this.hasPlaceholder(node.body);

    if (!hasUnderscore) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Modifier '${node.name || 'unnamed'}' is missing the underscore (_) placeholder. The function body will not execute.`,
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
  }

  private hasPlaceholder(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // Check for various underscore representations
    if (node.type === 'PlaceholderStatement') return true;
    if (node.type === 'ExpressionStatement' && node.expression?.type === 'Identifier' && node.expression?.name === '_') return true;
    if (node.type === 'Identifier' && node.name === '_') return true;

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some((child) => this.hasPlaceholder(child))) return true;
      } else if (value && typeof value === 'object') {
        if (this.hasPlaceholder(value)) return true;
      }
    }

    return false;
  }
}
