/**
 * Delegatecall in Loop Security Rule
 *
 * Detects delegatecall usage within loops, which can lead to:
 * - Gas exhaustion (out-of-gas errors)
 * - State inconsistency
 * - DoS attacks through unbounded loops
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects delegatecall in loops:
 * - for loops
 * - while loops
 * - do-while loops
 * - Nested loops
 *
 * Safe patterns (excluded):
 * - delegatecall outside loops
 * - Other call types in loops (call, staticcall, send, transfer)
 */
export class DelegatecallInLoopRule extends AbstractRule {
  private loopDepth: number = 0;

  constructor() {
    super({
      id: 'security/delegatecall-in-loop',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Delegatecall in Loop',
      description:
        'Detects delegatecall usage within loops. Loops with delegatecall can cause gas exhaustion, state inconsistencies, and enable DoS attacks through unbounded iterations.',
      recommendation:
        'Avoid using delegatecall in loops. If delegation is necessary, use a single delegatecall outside the loop or implement strict gas limits and loop bounds. Consider batching operations or using a pull pattern instead of push.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Reset state for each file
    this.loopDepth = 0;

    // Walk the AST to find delegatecalls in loops
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Track loop entry
    const isLoop =
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement';

    if (isLoop) {
      this.loopDepth++;
    }

    // Check for delegatecall when inside a loop
    if (this.loopDepth > 0 && node.type === 'FunctionCall') {
      this.checkDelegatecall(node, context);
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

    // Track loop exit
    if (isLoop) {
      this.loopDepth--;
    }
  }

  /**
   * Check if a function call is a delegatecall
   */
  private checkDelegatecall(node: any, context: AnalysisContext): void {
    // Check if it's a member access function call
    if (!node.expression || node.expression.type !== 'MemberAccess') {
      return;
    }

    const memberAccess = node.expression;
    const methodName = memberAccess.memberName;

    // Check if it's delegatecall
    if (methodName !== 'delegatecall') {
      return;
    }

    // Report the issue
    this.reportDelegatecallInLoop(node, context);
  }

  /**
   * Report a delegatecall-in-loop issue
   */
  private reportDelegatecallInLoop(
    node: any,
    context: AnalysisContext
  ): void {
    if (!node.loc) {
      return;
    }

    const loopType = this.getLoopType();

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Delegatecall detected in ${loopType}. This can cause gas exhaustion, state inconsistencies, and enable DoS attacks. Avoid delegatecall in loops or implement strict gas limits and bounds.`,
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

  /**
   * Get a human-readable description of the loop type
   */
  private getLoopType(): string {
    if (this.loopDepth === 1) {
      return 'loop';
    } else {
      return `nested loop (depth ${this.loopDepth})`;
    }
  }
}
