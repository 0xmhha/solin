/**
 * Low Level Calls Security Rule
 *
 * Detects usage of low-level calls (call, delegatecall, staticcall) which
 * bypass type checking and can lead to security issues if not handled properly.
 * These calls should be used with extreme caution.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#low-level-calls
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects low-level call operations:
 * - address.call()
 * - address.delegatecall()
 * - address.staticcall()
 *
 * Does not flag:
 * - Regular typed function calls
 * - Interface calls
 *
 * @example Problematic
 * ```solidity
 * // Informational: Low-level call (use with caution)
 * (bool success, ) = target.call(data);
 * target.delegatecall(data); // Very dangerous
 * ```
 *
 * @example Safer
 * ```solidity
 * // Better: Use typed interface calls
 * ITarget(target).someFunction(arg1, arg2);
 *
 * // If low-level call is necessary, handle carefully:
 * (bool success, bytes memory data) = target.call(payload);
 * require(success, "Call failed");
 * // Validate returned data
 * ```
 */
export class LowLevelCallsRule extends AbstractRule {
  private static readonly LOW_LEVEL_CALLS = ['call', 'delegatecall', 'staticcall'];

  constructor() {
    super({
      id: 'security/low-level-calls',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Low-Level Calls',
      description:
        'Detects usage of low-level calls (call, delegatecall, staticcall). ' +
        'These calls bypass type checking and can be dangerous if not handled properly. ' +
        'delegatecall is particularly risky as it can modify storage.',
      recommendation:
        'Prefer using typed interface calls when possible. ' +
        'If low-level calls are necessary: (1) Always check return values, ' +
        '(2) Validate call data and returned data, (3) Be extremely careful with delegatecall, ' +
        '(4) Consider using try/catch for external calls in Solidity 0.6+.',
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

    // Check for member access to low-level call functions
    if (node.type === 'MemberAccess') {
      this.checkMemberAccess(node, context);
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
   * Check if member access is a low-level call
   */
  private checkMemberAccess(node: any, context: AnalysisContext): void {
    const memberName = node.memberName;

    if (LowLevelCallsRule.LOW_LEVEL_CALLS.includes(memberName)) {
      this.reportIssue(
        node,
        context,
        memberName,
        `Low-level ${memberName}() detected. ` +
          'This bypasses type checking and can be dangerous. ' +
          `${memberName === 'delegatecall' ? 'WARNING: delegatecall can modify storage and is very risky. ' : ''}` +
          'Ensure proper error handling and input validation.'
      );
    }
  }

  /**
   * Report a low-level-calls issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
    callType: string,
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
          callType === 'delegatecall'
            ? 'Avoid delegatecall unless absolutely necessary. Use libraries or regular calls instead.'
            : 'Consider using typed interface calls instead of low-level calls.',
      },
    });
  }
}
