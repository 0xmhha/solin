/**
 * Variable Mutation Security Rule
 *
 * Detects dangerous mutations of critical variables.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class VariableMutationRule extends AbstractRule {
  private functionParameters = new Set<string>();

  constructor() {
    super({
      id: 'security/variable-mutation',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Dangerous Variable Mutation',
      description:
        'Detects dangerous mutations of parameters or critical variables that can lead to unexpected behavior.',
      recommendation:
        'Avoid mutating function parameters. Use local variables instead for clarity and safety.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
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

  private checkFunction(node: any, context: AnalysisContext): void {
    this.functionParameters.clear();

    // Collect parameters
    if (node.parameters && Array.isArray(node.parameters)) {
      for (const param of node.parameters) {
        if (param.name) {
          this.functionParameters.add(param.name);
        }
      }
    }

    // Check for parameter mutations
    if (node.body) {
      this.checkMutations(node.body, context);
    }
  }

  private checkMutations(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'BinaryOperation' && node.operator === '=') {
      const left = node.left;
      if (left?.type === 'Identifier') {
        const varName = left.name;
        if (this.functionParameters.has(varName)) {
          this.reportIssue(
            node,
            `Dangerous mutation of parameter '${varName}'. Mutating parameters can lead to confusion and bugs. ` +
              'Use a local variable instead.',
            context
          );
        }
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkMutations(child, context));
      } else if (value && typeof value === 'object') {
        this.checkMutations(value, context);
      }
    }
  }

  private reportIssue(node: any, message: string, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
