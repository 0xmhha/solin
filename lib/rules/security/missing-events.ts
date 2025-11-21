/**
 * Missing Events Security Rule
 *
 * Detects critical state changes without event emissions.
 * Events are essential for transparency, off-chain monitoring, and tracking state changes.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class MissingEventsRule extends AbstractRule {
  private stateVariables: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/missing-events',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Missing Event Emission',
      description:
        'Detects critical state changes (owner, admin, configuration) without event emissions. Events are crucial for transparency, off-chain monitoring, and auditing. Missing events make it difficult to track contract behavior and detect malicious changes.',
      recommendation:
        'Emit events for all critical state changes, especially ownership transfers, configuration updates, and permission changes. Use indexed parameters for key values: event OwnerChanged(address indexed oldOwner, address indexed newOwner).',
    });
  }

  analyze(context: AnalysisContext): void {
    this.stateVariables.clear();
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Collect state variables from contracts
    if (node.type === 'ContractDefinition') {
      this.collectStateVariables(node);
    }

    // Check functions
    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
    }

    // Recursively traverse
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

  private collectStateVariables(contractNode: any): void {
    if (!contractNode.subNodes) return;

    for (const node of contractNode.subNodes) {
      if (node.type === 'StateVariableDeclaration') {
        if (node.variables) {
          for (const variable of node.variables) {
            if (variable.name) {
              this.stateVariables.add(variable.name);
            }
          }
        }
      }
    }
  }

  private checkFunction(node: any, context: AnalysisContext): void {
    // Skip view and pure functions (no state changes)
    if (node.stateMutability === 'view' || node.stateMutability === 'pure') {
      return;
    }

    // Skip internal and private functions (not externally visible)
    const visibility = node.visibility;
    if (visibility === 'internal' || visibility === 'private') {
      return;
    }

    // Get function body
    const body = node.body;
    if (!body) return;

    // Check if function has state variable assignments
    const hasStateChanges = this.hasStateVariableAssignments(body);
    if (!hasStateChanges) return;

    // Check if function emits events
    const hasEvents = this.hasEventEmissions(body);
    if (hasEvents) return;

    // Report issue
    this.reportIssue(node, context);
  }

  private hasStateVariableAssignments(body: any): boolean {
    let found = false;

    const checkNode = (node: any): void => {
      if (!node || typeof node !== 'object' || found) return;

      // Check for state variable assignment
      if (node.type === 'BinaryOperation' && node.operator === '=') {
        const leftSide = node.left;
        if (this.isStateVariableAccess(leftSide)) {
          found = true;
          return;
        }
      }

      // Check for increment/decrement on state variables
      if (node.type === 'UnaryOperation') {
        if (node.operator === '++' || node.operator === '--') {
          const target = node.subExpression;
          if (this.isStateVariableAccess(target)) {
            found = true;
            return;
          }
        }
      }

      // Recursively check children
      for (const key in node) {
        if (key === 'loc' || key === 'range') continue;
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(checkNode);
        } else if (value && typeof value === 'object') {
          checkNode(value);
        }
      }
    };

    checkNode(body);
    return found;
  }

  private isStateVariableAccess(node: any): boolean {
    if (!node) return false;

    // Direct identifier (state variable name)
    if (node.type === 'Identifier') {
      return this.stateVariables.has(node.name);
    }

    // Member access like this.owner
    if (node.type === 'MemberAccess') {
      if (node.expression?.type === 'Identifier' && node.expression.name === 'this') {
        return this.stateVariables.has(node.memberName);
      }
    }

    return false;
  }

  private hasEventEmissions(body: any): boolean {
    let found = false;

    const checkNode = (node: any): void => {
      if (!node || typeof node !== 'object' || found) return;

      // Check for EmitStatement (Solidity 0.4.21+)
      if (node.type === 'EmitStatement') {
        found = true;
        return;
      }

      // Check for event call (older Solidity versions)
      if (node.type === 'FunctionCall') {
        const funcName = this.getFunctionName(node);
        if (funcName && this.isEventName(funcName)) {
          found = true;
          return;
        }
      }

      // Recursively check children
      for (const key in node) {
        if (key === 'loc' || key === 'range') continue;
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(checkNode);
        } else if (value && typeof value === 'object') {
          checkNode(value);
        }
      }
    };

    checkNode(body);
    return found;
  }

  private getFunctionName(node: any): string | null {
    if (!node || !node.expression) return null;

    if (node.expression.type === 'Identifier') {
      return node.expression.name;
    }

    return null;
  }

  private isEventName(name: string): boolean {
    // Events typically start with uppercase (PascalCase convention)
    // This is a heuristic check
    const firstChar = name.charAt(0);
    return firstChar.length > 0 && firstChar === firstChar.toUpperCase();
  }

  private reportIssue(functionNode: any, context: AnalysisContext): void {
    if (!functionNode.loc) return;

    const functionName = functionNode.name || 'constructor';
    const isConstructor = functionNode.isConstructor || !functionNode.name;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Missing event emission in ${
        isConstructor ? 'constructor' : `function '${functionName}'`
      }. Critical state changes should emit events for transparency and off-chain monitoring. Define event: event StateChanged(...); and emit: emit StateChanged(...);`,
      location: {
        start: {
          line: functionNode.loc.start.line,
          column: functionNode.loc.start.column,
        },
        end: { line: functionNode.loc.end.line, column: functionNode.loc.end.column },
      },
    });
  }
}
