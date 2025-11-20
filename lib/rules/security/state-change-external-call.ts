/**
 * State Change After External Call Security Rule
 *
 * Detects violations of the Checks-Effects-Interactions (CEI) pattern where state
 * changes occur after external calls. This creates reentrancy windows and can lead
 * to inconsistent state.
 *
 * @example
 * // Vulnerable: State change after external call
 * function withdraw() public {
 *   msg.sender.call{value: balance}("");
 *   balance = 0; // State change AFTER external call - vulnerable!
 * }
 *
 * // Safe: CEI pattern - state changes before interactions
 * function withdraw() public {
 *   uint amount = balance;
 *   balance = 0; // State change BEFORE external call
 *   msg.sender.call{value: amount}("");
 * }
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface ExternalCall {
  node: any;
  line: number;
}

interface StateChange {
  node: any;
  line: number;
  variable: string;
}

export class StateChangeExternalCallRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/state-change-external-call',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'State Change After External Call',
      description:
        'Detects state changes after external calls, violating the Checks-Effects-Interactions (CEI) pattern. ' +
        'When state is modified after an external call, reentrancy attacks can exploit the inconsistent state. ' +
        'The CEI pattern mandates: (1) validate conditions, (2) update state variables, (3) interact with external contracts.',
      recommendation:
        'Follow the Checks-Effects-Interactions pattern: update all state variables BEFORE making external calls. ' +
        'This prevents reentrancy attacks and ensures state consistency. Order your code: (1) require checks, ' +
        '(2) state variable updates, (3) external calls (transfer, send, call, or external contract calls). ' +
        'Use ReentrancyGuard as additional protection.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkFunction(node: any, context: AnalysisContext): void {
    // Skip view/pure functions
    if (node.stateMutability === 'view' || node.stateMutability === 'pure') {
      return;
    }

    if (!node.body) return;

    // Collect external calls and state changes
    const externalCalls: ExternalCall[] = [];
    const stateChanges: StateChange[] = [];

    this.collectCallsAndChanges(node.body, externalCalls, stateChanges);

    // Check for state changes after external calls
    for (const call of externalCalls) {
      for (const change of stateChanges) {
        // If state change happens after external call (later line number)
        if (change.line > call.line) {
          this.reportIssue(change.node, change.variable, call.line, context);
        }
      }
    }
  }

  private collectCallsAndChanges(
    node: any,
    calls: ExternalCall[],
    changes: StateChange[]
  ): void {
    if (!node || typeof node !== 'object') return;

    // Detect external calls
    if (node.type === 'MemberAccess') {
      const memberName = node.memberName;
      if (
        memberName === 'call' ||
        memberName === 'delegatecall' ||
        memberName === 'transfer' ||
        memberName === 'send'
      ) {
        calls.push({
          node,
          line: node.loc?.start.line || 0,
        });
      }
    }

    // Detect external contract calls
    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      if (expr?.type === 'MemberAccess' && expr.expression?.type === 'Identifier') {
        // Pattern: externalContract.function()
        calls.push({
          node,
          line: node.loc?.start.line || 0,
        });
      }
    }

    // Detect state changes (assignments to storage variables)
    if (
      node.type === 'BinaryOperation' &&
      (node.operator === '=' || node.operator === '+=' || node.operator === '-=')
    ) {
      const left = node.left;
      if (this.isStateVariable(left)) {
        const varName = this.getVariableName(left);
        if (varName) {
          changes.push({
            node,
            line: node.loc?.start.line || 0,
            variable: varName,
          });
        }
      }
    }

    // Recursively collect
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.collectCallsAndChanges(child, calls, changes));
      } else if (value && typeof value === 'object') {
        this.collectCallsAndChanges(value, calls, changes);
      }
    }
  }

  private isStateVariable(node: any): boolean {
    // State variables are typically:
    // - Identifiers (simple variables)
    // - IndexAccess (mappings/arrays)
    // - MemberAccess (structs)
    if (node.type === 'Identifier') {
      // Exclude local variables (they often start with _ or are function parameters)
      // This is a heuristic - we consider it a state variable if it doesn't start with _
      return !node.name.startsWith('_');
    }
    if (node.type === 'IndexAccess') return true;
    if (node.type === 'MemberAccess') return true;
    return false;
  }

  private getVariableName(node: any): string | null {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'IndexAccess') {
      return this.getVariableName(node.base);
    }
    if (node.type === 'MemberAccess') {
      return node.memberName;
    }
    return null;
  }

  private reportIssue(
    stateNode: any,
    variable: string,
    callLine: number,
    context: AnalysisContext
  ): void {
    if (!stateNode.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `State change to '${variable}' occurs after external call (line ${callLine}), violating Checks-Effects-Interactions pattern. ` +
        'This creates a reentrancy vulnerability window where the contract state is inconsistent during the external call. ' +
        `Move the state update of '${variable}' before the external call to follow the CEI pattern: ` +
        '(1) validate conditions, (2) update state, (3) make external calls.',
      location: {
        start: { line: stateNode.loc.start.line, column: stateNode.loc.start.column },
        end: { line: stateNode.loc.end.line, column: stateNode.loc.end.column },
      },
    });
  }
}
