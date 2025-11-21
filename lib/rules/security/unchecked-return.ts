/**
 * Unchecked Return Value Security Rule
 *
 * Detects unchecked return values from external calls that can silently fail.
 * Functions like call(), send(), and delegatecall() return a boolean indicating
 * success, which must be checked to ensure the operation succeeded.
 *
 * @example
 * // Vulnerable: Ignoring return value
 * function sendEther(address to) public {
 *   to.call{value: 1 ether}(""); // Return value ignored!
 * }
 *
 * // Safe: Check return value
 * function sendEther(address to) public {
 *   (bool success, ) = to.call{value: 1 ether}("");
 *   require(success, "Transfer failed");
 * }
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class UncheckedReturnRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/unchecked-return',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Unchecked Return Value',
      description:
        'Detects unchecked return values from external calls. Functions like call(), send(), ' +
        'and delegatecall() return a boolean indicating success/failure. Ignoring this return value ' +
        'can lead to silent failures where the contract assumes an operation succeeded when it actually failed.',
      recommendation:
        'Always check return values from external calls: ' +
        '(bool success, ) = target.call(...); require(success, "Call failed"); ' +
        'For ether transfers, prefer transfer() which automatically reverts on failure, or check send() return value. ' +
        'For external contract calls returning bool, always validate the result.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'ExpressionStatement') {
      this.checkExpressionStatement(node, context);
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

  private checkExpressionStatement(node: any, context: AnalysisContext): void {
    const expr = node.expression;
    if (!expr) return;

    // Check for unchecked call/send/delegatecall
    if (expr.type === 'FunctionCall') {
      const memberAccess = expr.expression;
      if (memberAccess?.type === 'MemberAccess') {
        const methodName = memberAccess.memberName;

        // These methods return bool that should be checked
        if (
          methodName === 'call' ||
          methodName === 'delegatecall' ||
          methodName === 'send' ||
          methodName === 'staticcall'
        ) {
          this.reportIssue(
            expr,
            `Unchecked return value from ${methodName}(). This method returns a boolean indicating ` +
              `success/failure. Ignoring it can lead to silent failures. ` +
              `Capture and check: (bool success, ) = target.${methodName}(...); require(success, "Failed");`,
            context
          );
        }
      }

      // Check for external function calls that return bool
      if (this.isExternalBoolCall(expr)) {
        this.reportIssue(
          expr,
          'Unchecked return value from external call. If this function returns a boolean success indicator, ' +
            'you should check it to ensure the operation succeeded. Capture and validate the return value.',
          context
        );
      }
    }
  }

  private isExternalBoolCall(node: any): boolean {
    // Check if this looks like an external contract call
    const expr = node.expression;
    if (expr?.type === 'MemberAccess' && expr.expression?.type === 'Identifier') {
      // Pattern: externalContract.functionName()
      // We can't easily determine return type without type information,
      // but we can flag it as potentially problematic
      const functionName = expr.memberName;

      // Common patterns for functions that return bool
      const boolReturnPatterns = [
        'approve',
        'transfer',
        'transferFrom',
        'execute',
        'process',
        'validate',
        'verify',
      ];

      return boolReturnPatterns.some(pattern =>
        functionName.toLowerCase().includes(pattern.toLowerCase())
      );
    }

    return false;
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
