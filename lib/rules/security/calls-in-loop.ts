/**
 * Calls in Loop Security Rule
 *
 * Detects function calls (especially external calls) inside loops which can
 * lead to denial of service (DOS) attacks. If any call fails or runs out of
 * gas, the entire transaction fails, potentially locking the contract.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#calls-inside-a-loop
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects function calls inside loops:
 * - External calls in for/while/do-while loops
 * - Can lead to DOS if any call fails
 * - Unbounded loops with calls consume excessive gas
 *
 * Does not flag:
 * - Loops without function calls
 * - Function calls outside loops
 *
 * @example Problematic
 * ```solidity
 * // Bad: External call in loop
 * for (uint i = 0; i < users.length; i++) {
 *   token.transfer(users[i], amount); // DOS risk
 * }
 * ```
 *
 * @example Better
 * ```solidity
 * // Good: Pull pattern - users withdraw individually
 * mapping(address => uint256) public balances;
 *
 * function withdraw() public {
 *   uint256 amount = balances[msg.sender];
 *   balances[msg.sender] = 0;
 *   token.transfer(msg.sender, amount);
 * }
 * ```
 */
export class CallsInLoopRule extends AbstractRule {
  private loopDepth = 0;

  constructor() {
    super({
      id: 'security/calls-in-loop',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Calls Inside Loop',
      description:
        'Detects function calls (especially external calls) inside loops. ' +
        'This pattern can lead to denial of service (DOS) attacks if any call fails ' +
        'or runs out of gas. Unbounded loops with calls can consume excessive gas.',
      recommendation:
        'Avoid calls inside loops when possible. Use the pull-over-push pattern ' +
        'where users withdraw funds individually. If loops are necessary, ensure they ' +
        'are bounded and consider batch processing with checkpoints.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.loopDepth = 0;
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    const isLoop = this.isLoopStatement(node);

    // Track loop depth
    if (isLoop) {
      this.loopDepth++;
    }

    // Check for function calls inside loops
    if (this.loopDepth > 0 && node.type === 'FunctionCall') {
      this.reportIssue(
        node,
        context,
        'Function call inside loop detected. ' +
          'This can lead to denial of service (DOS) if the call fails or consumes too much gas. ' +
          'Consider using the pull-over-push pattern or batch processing.'
      );
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

    // Exit loop scope
    if (isLoop) {
      this.loopDepth--;
    }
  }

  /**
   * Check if node is a loop statement
   */
  private isLoopStatement(node: any): boolean {
    return (
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    );
  }

  /**
   * Report a calls-in-loop issue
   */
  private reportIssue(node: any, context: AnalysisContext, message: string): void {
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
          'Refactor to use pull-over-push pattern, or ensure loops are bounded with proper gas limits.',
      },
    });
  }
}
