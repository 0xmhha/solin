/**
 * Reentrancy Security Rule
 *
 * Detects reentrancy vulnerabilities where external calls are made before state updates.
 * Classic attack: The DAO hack (2016) - $60M stolen through reentrancy.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface ExternalCall {
  node: any;
  line: number;
  type: 'call' | 'transfer' | 'send' | 'external';
}

interface StateChange {
  node: any;
  line: number;
  variable: string;
}

export class ReentrancyRule extends AbstractRule {
  private functionDefinitions: Map<string, any> = new Map();

  constructor() {
    super({
      id: 'security/reentrancy',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Reentrancy Vulnerability',
      description:
        'Detects reentrancy vulnerabilities where external calls are made before state changes. ' +
        'An attacker can recursively call back into the contract before the first invocation completes, ' +
        'potentially draining funds or causing unexpected behavior. Follow checks-effects-interactions pattern: ' +
        '(1) check conditions, (2) update state, (3) interact with external contracts.',
      recommendation:
        'Apply checks-effects-interactions pattern: update all state variables before making external calls. ' +
        'Use ReentrancyGuard from OpenZeppelin (nonReentrant modifier). Consider pull over push payment pattern. ' +
        'Always update balances/state before transferring ether or calling external contracts.',
    });
  }

  analyze(context: AnalysisContext): void {
    // First pass: collect all function definitions
    this.functionDefinitions.clear();
    this.collectFunctionDefinitions(context.ast);

    // Second pass: analyze for reentrancy
    this.walkAst(context.ast, context);
  }

  private collectFunctionDefinitions(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefinition' && node.name) {
      this.functionDefinitions.set(node.name, node);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.collectFunctionDefinitions(child));
      } else if (value && typeof value === 'object') {
        this.collectFunctionDefinitions(value);
      }
    }
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Analyze each function for reentrancy vulnerabilities
    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
    }

    // Recursively traverse
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
    // Skip if function has nonReentrant modifier
    if (this.hasNonReentrantModifier(node)) {
      return;
    }

    // Skip view/pure functions - they can't modify state
    if (node.stateMutability === 'view' || node.stateMutability === 'pure') {
      return;
    }

    if (!node.body) return;

    // Collect external calls and state changes with their positions
    const externalCalls: ExternalCall[] = [];
    const stateChanges: StateChange[] = [];

    this.collectCallsAndChanges(node.body, externalCalls, stateChanges);

    // Check for reentrancy: external call before state change
    for (const call of externalCalls) {
      for (const change of stateChanges) {
        // If external call happens before state change (earlier line number)
        if (call.line < change.line) {
          this.reportIssue(call.node, change.variable, context);
        }
      }
    }
  }

  private hasNonReentrantModifier(node: any): boolean {
    if (!node.modifiers || !Array.isArray(node.modifiers)) return false;

    return node.modifiers.some((modifier: any) => {
      const modifierName = modifier.name || modifier.identifier?.name || '';
      return (
        modifierName === 'nonReentrant' ||
        modifierName === 'noReentrancy' ||
        modifierName === 'reentrancyGuard'
      );
    });
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
        const callType =
          memberName === 'call'
            ? 'call'
            : memberName === 'transfer'
              ? 'transfer'
              : memberName === 'send'
                ? 'send'
                : 'call';
        calls.push({
          node,
          line: node.loc?.start.line || 0,
          type: callType,
        });
      }
    }

    // Detect external contract calls (function calls on external contracts)
    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      // External call pattern: externalContract.function()
      if (expr?.type === 'MemberAccess' && expr.expression?.type === 'Identifier') {
        const functionName = expr.memberName;
        // Check if this is a view/pure function
        if (!this.isViewOrPureFunction(functionName)) {
          // This is a state-changing external call - add it
          calls.push({
            node,
            line: node.loc?.start.line || 0,
            type: 'external',
          });
        }
      }
      // Internal function call pattern: _updateBalance(...)
      else if (expr?.type === 'Identifier') {
        const functionName = expr.name;
        // Check if this is an internal function and collect its state changes
        if (this.functionDefinitions.has(functionName)) {
          const funcDef = this.functionDefinitions.get(functionName);
          // Recursively collect state changes from internal function
          if (funcDef?.body) {
            this.collectCallsAndChanges(funcDef.body, calls, changes);
          }
        }
      }
    }

    // Detect state changes (assignments to storage variables)
    if (
      node.type === 'BinaryOperation' &&
      (node.operator === '=' || node.operator === '+=' || node.operator === '-=')
    ) {
      const left = node.left;
      // Check if it's a state variable assignment
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

    // Recursively collect from child nodes
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
    // Simple heuristic: if it's an identifier or member access (like balances[user])
    // it's likely a state variable
    if (node.type === 'Identifier') return true;
    if (node.type === 'IndexAccess') return true; // mapping/array access
    if (node.type === 'MemberAccess') {
      // Could be this.variable or struct member
      return true;
    }
    return false;
  }

  private getVariableName(node: any): string | null {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'IndexAccess') {
      // For balances[user], return "balances"
      return this.getVariableName(node.base);
    }
    if (node.type === 'MemberAccess') {
      // For this.balance or user.amount, return the member name
      return node.memberName;
    }
    return null;
  }

  private isViewOrPureFunction(functionName: string): boolean {
    // Check if function is defined in the same file
    if (this.functionDefinitions.has(functionName)) {
      const funcDef = this.functionDefinitions.get(functionName);
      const mutability = funcDef?.stateMutability;
      return mutability === 'view' || mutability === 'pure';
    }
    // If function is not found, assume it could be state-changing (conservative)
    return false;
  }

  private reportIssue(
    callNode: any,
    affectedVariable: string,
    context: AnalysisContext
  ): void {
    if (!callNode.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Reentrancy vulnerability detected: external call before state update of '${affectedVariable}'. An attacker can recursively call back into this function before state is updated, potentially draining funds or causing unexpected behavior. Follow checks-effects-interactions: (1) validate inputs, (2) update state variables like '${affectedVariable}', (3) then make external calls. Use ReentrancyGuard or update '${affectedVariable}' before the external call.`,
      location: {
        start: { line: callNode.loc.start.line, column: callNode.loc.start.column },
        end: { line: callNode.loc.end.line, column: callNode.loc.end.column },
      },
    });
  }
}
