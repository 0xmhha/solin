/**
 * Require Revert Reason Lint Rule
 *
 * Detects require() and revert() statements without error messages
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects require/revert without error messages:
 * - require() must have an error message as second argument
 * - revert() must have an error message
 * - Custom errors (0.8.4+) are allowed
 * - assert() is not checked (used for internal errors)
 */
export class RequireRevertReasonRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/require-revert-reason',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Require Revert Reason',
      description:
        'Detects require() and revert() statements without error messages, which makes debugging difficult',
      recommendation:
        'Always provide descriptive error messages for require() and revert() statements to help with debugging. For Solidity 0.8.4+, consider using custom errors for gas efficiency.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST and check for require/revert calls
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
   * Check a function call for require/revert without message
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    // Skip if no location info
    if (!node.loc) {
      return;
    }

    // Get the function name
    const functionName = this.getFunctionName(node);

    if (functionName === 'require') {
      this.checkRequire(node, context);
    } else if (functionName === 'revert') {
      this.checkRevert(node, context);
    }
    // Skip assert() - it's for internal errors and doesn't need messages
  }

  /**
   * Get function name from function call node
   */
  private getFunctionName(node: any): string | null {
    // Direct identifier: require(...), revert(...)
    if (node.expression?.type === 'Identifier') {
      return node.expression.name;
    }

    return null;
  }

  /**
   * Check require() call
   */
  private checkRequire(node: any, context: AnalysisContext): void {
    const args = node.arguments || [];

    // require() needs at least 2 arguments: condition + message
    if (args.length < 2) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'require() statement should have an error message.',
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
        message: 'require() statement has an empty error message.',
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
   * Check revert() call
   */
  private checkRevert(node: any, context: AnalysisContext): void {
    const args = node.arguments || [];

    // revert() needs at least 1 argument: message
    // Note: revert CustomError() will have a different AST structure
    if (args.length < 1) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'revert() statement should have an error message.',
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
        message: 'revert() statement has an empty error message.',
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

    // String literal with empty value
    if (node.type === 'StringLiteral' && node.value === '') {
      return true;
    }

    // Generic literal with empty string value
    if (node.type === 'Literal' && node.value === '') {
      return true;
    }

    return false;
  }
}
