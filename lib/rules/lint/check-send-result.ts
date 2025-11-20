/**
 * Check Send Result Rule
 *
 * Ensures that the result of send() calls is properly checked.
 * send() returns a boolean indicating success/failure and should always be checked.
 * This is the lint version - for style and best practices.
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that ensures send() call results are checked.
 * send() can fail silently, so its return value must be checked.
 */
export class CheckSendResultRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/check-send-result',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Check Send Result',
      description:
        'Ensures that the boolean return value of send() calls is checked. ' +
        'send() returns false on failure instead of reverting, so the return value must be verified.',
      recommendation:
        'Always check the return value of send() calls using require(), assert(), or if statements. ' +
        'Alternatively, consider using transfer() which reverts on failure, or call() with proper error handling.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        // Look for expression statements that might contain unchecked send() calls
        if (node.type === 'ExpressionStatement') {
          this.checkExpressionStatement(node, context);
        }

        return undefined;
      },
    });
  }

  /**
   * Check if an expression statement contains an unchecked send() call
   */
  private checkExpressionStatement(node: ASTNode, context: AnalysisContext): void {
    const expression = (node as any).expression;

    if (!expression) {
      return;
    }

    // Check if this is a member access (e.g., address.send())
    if (expression.type === 'FunctionCall') {
      const functionCall = expression;
      const callee = functionCall.expression;

      // Check if it's a member access with name 'send'
      if (
        callee &&
        callee.type === 'MemberAccess' &&
        callee.memberName === 'send'
      ) {
        // This is an unchecked send() call (result not assigned or used)
        if (node.loc) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message:
              'The return value of send() must be checked. send() returns false on failure and does not revert.',
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
                'Store the return value and check it with require() or assert(). ' +
                'Example: bool success = address.send(amount); require(success, "Send failed");',
            },
          });
        }
      }
    }
  }
}
