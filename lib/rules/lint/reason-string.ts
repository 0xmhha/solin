/**
 * Reason String Rule
 *
 * Requires reason strings in require/revert statements
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that enforces reason strings in require/revert:
 * - require() must have a non-empty error message as second argument
 * - revert() must have a non-empty error message
 * - assert() is not checked (used for internal errors)
 */
export class ReasonStringRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/reason-string',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Reason String',
      description:
        'Requires reason strings in require() and revert() statements for better error handling and debugging.',
      recommendation:
        'Always provide descriptive, non-empty error messages for require() and revert() statements.',
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

    // Check if this is a function call (require/revert)
    if (node.type === 'FunctionCall') {
      this.checkFunctionCall(node, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check function calls for require/revert without reason strings
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    const functionName = this.getFunctionName(node);

    if (!functionName || !node.loc) {
      return;
    }

    if (functionName === 'require') {
      this.checkRequire(node, context);
    } else if (functionName === 'revert') {
      this.checkRevert(node, context);
    }
  }

  /**
   * Get function name from function call node
   */
  private getFunctionName(node: any): string | null {
    if (node.expression?.type === 'Identifier') {
      return node.expression.name;
    }
    return null;
  }

  /**
   * Check require() call for reason string
   */
  private checkRequire(node: any, context: AnalysisContext): void {
    const args = node.arguments || [];

    // require() needs at least 2 arguments: condition + message
    if (args.length < 2) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'require() statement must have a reason string as the second argument.',
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
      return;
    }

    // Check if message is empty string
    const messageArg = args[1];
    if (this.isEmptyString(messageArg)) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'require() statement has an empty reason string.',
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

  /**
   * Check revert() call for reason string
   */
  private checkRevert(node: any, context: AnalysisContext): void {
    const args = node.arguments || [];

    // revert() needs at least 1 argument: message
    if (args.length < 1) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'revert() statement must have a reason string.',
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
      return;
    }

    // Check if message is empty string
    const messageArg = args[0];
    if (this.isEmptyString(messageArg)) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'revert() statement has an empty reason string.',
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

  /**
   * Check if an argument is an empty string literal
   */
  private isEmptyString(node: any): boolean {
    if (!node) {
      return false;
    }

    if (node.type === 'StringLiteral' && node.value === '') {
      return true;
    }

    if (node.type === 'Literal' && node.value === '') {
      return true;
    }

    return false;
  }
}
