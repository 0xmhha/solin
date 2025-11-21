/**
 * Gas Custom Errors Lint Rule
 *
 * Recommends custom errors over revert strings for gas optimization
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects require() and revert() calls with string literals:
 * - Custom errors save ~24KB deployment gas per revert string
 * - Custom errors save ~50 gas runtime per revert execution
 * - Introduced in Solidity 0.8.4
 * - Example: require(condition, "message") → if (!condition) revert CustomError()
 */
export class GasCustomErrors extends AbstractRule {
  constructor() {
    super({
      id: 'lint/gas-custom-errors',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Use custom errors instead of revert strings',
      description:
        'Detects require() and revert() calls with string literals. Using custom errors saves ~24KB deployment and ~50 gas runtime per revert. Introduced in Solidity 0.8.4.',
      recommendation:
        'Replace require(condition, "message") with Custom error: if (!condition) revert CustomError(). Define errors: error CustomError().',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find require() and revert() calls
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for FunctionCall nodes
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
   * Check if function call is require() or revert() with string literal
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    const functionName = this.getFunctionName(node);

    if (functionName === 'require') {
      // require() with error message has 2+ arguments
      if (node.arguments && node.arguments.length >= 2) {
        const secondArg = node.arguments[1];

        // Check if second argument is a string literal or string expression
        if (this.isStringArgument(secondArg)) {
          if (node.loc) {
            context.report({
              ruleId: this.metadata.id,
              severity: this.metadata.severity,
              category: this.metadata.category,
              message:
                'require() with string literal wastes gas. Use custom error for ~24KB deployment and ~50 gas runtime savings.',
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
      }
    } else if (functionName === 'revert') {
      // revert() with string argument
      if (node.arguments && node.arguments.length > 0) {
        const firstArg = node.arguments[0];

        // Check if argument is a string literal or string expression
        // Ignore if it's a custom error call (Identifier or MemberAccess)
        if (this.isStringArgument(firstArg)) {
          if (node.loc) {
            context.report({
              ruleId: this.metadata.id,
              severity: this.metadata.severity,
              category: this.metadata.category,
              message:
                'revert() with string literal wastes gas. Use custom error for ~24KB deployment and ~50 gas runtime savings.',
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
      }
    }
  }

  /**
   * Extract function name from FunctionCall node
   */
  private getFunctionName(node: any): string {
    if (!node.expression) {
      return '';
    }

    // Simple identifier (e.g., require, revert)
    if (node.expression.type === 'Identifier') {
      return node.expression.name;
    }

    // Member access (e.g., obj.revert) - not common for require/revert
    if (node.expression.type === 'MemberAccess') {
      return node.expression.memberName;
    }

    return '';
  }

  /**
   * Check if argument is a string literal or string expression
   */
  private isStringArgument(arg: any): boolean {
    if (!arg) {
      return false;
    }

    // String literal
    if (arg.type === 'StringLiteral') {
      return true;
    }

    // Binary operation (e.g., "Error: " + variable)
    if (arg.type === 'BinaryOperation') {
      // Check if either operand is a string literal (concatenation)
      return this.isStringArgument(arg.left) || this.isStringArgument(arg.right);
    }

    return false;
  }
}
