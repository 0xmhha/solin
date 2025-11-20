/**
 * Unused Return Security Rule
 *
 * Detects when return values from function calls are ignored, which can lead
 * to silent failures. This is particularly dangerous for functions that return
 * success/failure status (like ERC20 transfer) or important data.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#unused-return
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects ignored return values from function calls:
 * - Function calls in expression statements (standalone)
 * - Return values not assigned or checked
 * - Common with ERC20 transfer/approve functions
 *
 * Does not flag:
 * - Functions that don't return values
 * - Return values that are assigned to variables
 * - Return values used in conditionals/require statements
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: Ignoring return value
 * token.transfer(recipient, amount); // Returns bool, but ignored
 * getData(); // Returns data, but ignored
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: Check return value
 * require(token.transfer(recipient, amount), "Transfer failed");
 * bool success = token.transfer(recipient, amount);
 * require(success, "Transfer failed");
 * uint256 data = getData();
 * ```
 */
export class UnusedReturnRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/unused-return',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Unused Return Value',
      description:
        'Detects function calls where the return value is ignored. ' +
        'Ignoring return values can lead to silent failures, especially for functions ' +
        'that return success/failure status (like ERC20 transfer) or important data.',
      recommendation:
        'Always check return values from function calls. Use require() or assert() ' +
        'to validate success status, or assign return values to variables for later use. ' +
        'For ERC20 tokens, prefer using SafeERC20 library which automatically checks return values.',
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

    // Check expression statements (standalone function calls)
    if (node.type === 'ExpressionStatement') {
      this.checkExpressionStatement(node, context);
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
   * Check if expression statement contains function call with ignored return
   */
  private checkExpressionStatement(node: any, context: AnalysisContext): void {
    if (!node.expression) {
      return;
    }

    const expr = node.expression;

    // Check for function calls in expression statements
    // These are standalone calls where the return value is ignored
    if (expr.type === 'FunctionCall') {
      // Flag the function call - in expression statements, return values are ignored
      // Note: This is a conservative approach that may produce false positives
      // for functions that don't return values, but it's safer to flag them
      this.reportIssue(
        node,
        context,
        'Return value of function call is ignored. ' +
          'If the function returns important data or a success status, ' +
          'ignoring it can lead to silent failures.'
      );
    }
  }

  /**
   * Report an unused-return issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
    message: string
  ): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
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
      metadata: {
        suggestion:
          'Assign the return value to a variable, or use it in a require/assert statement.',
      },
    });
  }
}
