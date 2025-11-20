/**
 * Void Constructor Call Security Rule
 *
 * Detects constructor calls that don't properly initialize the contract.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class VoidConstructorCallRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/void-constructor-call',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Void Constructor Call',
      description:
        'Detects constructor calls that are made as regular function calls instead of via inheritance. ' +
        'This leaves the contract uninitialized.',
      recommendation:
        'Use proper constructor chaining in the derived contract declaration: ' +
        'contract Derived is Base { constructor() Base() {} }',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefinition' && node.isConstructor) {
      this.checkConstructor(node, context);
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

  private checkConstructor(node: any, context: AnalysisContext): void {
    if (!node.body) return;

    this.checkVoidConstructorCalls(node.body, context);
  }

  private checkVoidConstructorCalls(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for constructor calls as regular function calls
    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      if (expr?.type === 'Identifier') {
        const name = expr.name;
        // Check if this looks like a constructor call (capitalized name)
        if (name && name[0] === name[0].toUpperCase()) {
          this.reportIssue(
            node,
            `Void constructor call to '${name}()'. Constructor calls should be done via inheritance chaining, ` +
              `not as regular function calls. Use: contract Derived is ${name} { constructor() ${name}() {} }`,
            context
          );
        }
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkVoidConstructorCalls(child, context));
      } else if (value && typeof value === 'object') {
        this.checkVoidConstructorCalls(value, context);
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
