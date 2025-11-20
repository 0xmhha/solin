/**
 * Reentrancy No Eth Security Rule
 *
 * Detects reentrancy vulnerabilities that don't involve ether loss.
 * Also known as "read-only reentrancy" where state is read after external
 * calls, potentially returning stale or inconsistent data.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-2
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects read-only reentrancy patterns:
 * - State variable reads after external calls
 * - State variable writes after external calls (without ether)
 * - Potential for view function reentrancy
 *
 * While no ether is lost, these can lead to:
 * - Stale data being returned
 * - Inconsistent state reads
 * - Oracle manipulation
 * - Cross-function reentrancy
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: State read after external call
 * function getBalance(address token) public returns (uint) {
 *   token.call(""); // External call
 *   return balances[msg.sender]; // Stale read
 * }
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: State read before external call
 * function getBalance(address token) public returns (uint) {
 *   uint bal = balances[msg.sender];
 *   token.call("");
 *   return bal;
 * }
 * ```
 */
export class ReentrancyNoEthRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/reentrancy-no-eth',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Reentrancy Without Ether Loss',
      description:
        'Detects reentrancy vulnerabilities that do not involve ether loss (read-only reentrancy). ' +
        'State variables accessed after external calls may return stale or inconsistent data, ' +
        'leading to oracle manipulation, incorrect calculations, or cross-function reentrancy attacks.',
      recommendation:
        'Follow the Checks-Effects-Interactions pattern: ' +
        '1) Perform all checks first, ' +
        '2) Update state variables, ' +
        '3) Make external calls last. ' +
        'Consider using ReentrancyGuard for all state-changing functions.',
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

    // Check function definitions
    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
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
   * Check function for reentrancy patterns
   */
  private checkFunction(node: any, context: AnalysisContext): void {
    if (!node.body) {
      return;
    }

    // Find all external calls in the function
    const externalCalls = this.findExternalCalls(node.body);

    if (externalCalls.length === 0) {
      return;
    }

    // Find state variable accesses after external calls
    for (const call of externalCalls) {
      const stateAccessesAfter = this.findStateAccessesAfter(node.body, call);

      for (const access of stateAccessesAfter) {
        this.reportIssue(
          access,
          context,
          'State variable accessed after external call. ' +
            'This creates a reentrancy risk where the state may be inconsistent. ' +
            'Move state updates before external calls or use ReentrancyGuard.'
        );
      }
    }
  }

  /**
   * Find all external calls in a node tree
   */
  private findExternalCalls(node: any): any[] {
    const calls: any[] = [];

    if (!node || typeof node !== 'object') {
      return calls;
    }

    // Check for external calls: call, delegatecall, staticcall
    if (node.type === 'FunctionCall') {
      if (this.isExternalCall(node)) {
        calls.push(node);
      }
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => {
          calls.push(...this.findExternalCalls(child));
        });
      } else if (value && typeof value === 'object') {
        calls.push(...this.findExternalCalls(value));
      }
    }

    return calls;
  }

  /**
   * Check if function call is an external call
   */
  private isExternalCall(node: any): boolean {
    if (!node.expression) {
      return false;
    }

    const expr = node.expression;

    // Check for .call(), .delegatecall(), .staticcall()
    if (expr.type === 'MemberAccess') {
      const memberName = expr.memberName;
      return memberName === 'call' || memberName === 'delegatecall' || memberName === 'staticcall';
    }

    return false;
  }

  /**
   * Find state variable accesses after a given node
   * Simplified implementation - checks if state access appears later in AST
   */
  private findStateAccessesAfter(body: any, afterNode: any): any[] {
    const accesses: any[] = [];

    // This is a simplified implementation
    // A full version would track control flow and ordering

    // Find all state variable accesses
    const allAccesses = this.findStateVariableAccesses(body);

    // If we have state accesses and external calls, report potential issue
    if (allAccesses.length > 0) {
      // For simplicity, check if any state access exists
      // A full implementation would verify temporal ordering
      for (const access of allAccesses) {
        // Simple heuristic: if external call exists, flag state accesses
        if (this.appearsAfter(body, afterNode, access)) {
          accesses.push(access);
        }
      }
    }

    return accesses;
  }

  /**
   * Find all state variable accesses
   */
  private findStateVariableAccesses(node: any): any[] {
    const accesses: any[] = [];

    if (!node || typeof node !== 'object') {
      return accesses;
    }

    // Look for identifier references (simplified)
    if (node.type === 'Identifier') {
      // This is a simplified check
      // A full implementation would track which identifiers are state variables
      accesses.push(node);
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => {
          accesses.push(...this.findStateVariableAccesses(child));
        });
      } else if (value && typeof value === 'object') {
        accesses.push(...this.findStateVariableAccesses(value));
      }
    }

    return accesses;
  }

  /**
   * Check if node2 appears after node1 in the AST
   * Simplified implementation using line numbers
   */
  private appearsAfter(_body: any, node1: any, node2: any): boolean {
    if (!node1.loc || !node2.loc) {
      return false;
    }

    return node2.loc.start.line > node1.loc.start.line;
  }

  /**
   * Report a reentrancy issue
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
    });
  }
}
