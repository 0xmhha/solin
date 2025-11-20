/**
 * Constant Function State Change Security Rule
 *
 * Detects state changes in view/pure functions which violate Solidity semantics.
 *
 * @example Vulnerable code:
 * ```solidity
 * uint value;
 * function getValue() public view returns (uint) {
 *   value = 100; // State modification in view!
 *   return value;
 * }
 * ```
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class ConstantFunctionStateRule extends AbstractRule {
  private stateVariables: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/constant-function-state',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'State Change in View/Pure Function',
      description:
        'Detects state modifications in view or pure functions. View functions promise not to modify state, and pure functions promise not to read or modify state. Violating these guarantees breaks contract semantics and can lead to unexpected behavior.',
      recommendation:
        'Remove state modifications from view/pure functions. If you need to modify state, remove the view/pure modifier. View functions should only read state, and pure functions should only perform computations on input parameters.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Collect state variables
    this.stateVariables.clear();
    this.collectStateVariables(context.ast);

    // Check functions
    this.walkAst(context.ast, context);
  }

  private collectStateVariables(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'StateVariableDeclaration') {
      node.variables?.forEach((variable: any) => {
        if (variable.name) {
          this.stateVariables.add(variable.name);
        }
      });
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.collectStateVariables(child));
      } else if (value && typeof value === 'object') {
        this.collectStateVariables(value);
      }
    }
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefinition') {
      const mutability = node.stateMutability;
      if (mutability === 'view' || mutability === 'pure') {
        this.checkFunction(node, mutability, context);
      }
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

  private checkFunction(
    node: any,
    mutability: string,
    context: AnalysisContext
  ): void {
    if (!node.body) return;
    this.checkForStateChanges(node.body, mutability, context);
  }

  private checkForStateChanges(
    node: any,
    mutability: string,
    context: AnalysisContext
  ): void {
    if (!node || typeof node !== 'object') return;

    // Check for assignments to state variables
    if (
      node.type === 'BinaryOperation' &&
      (node.operator === '=' ||
        node.operator === '+=' ||
        node.operator === '-=' ||
        node.operator === '*=' ||
        node.operator === '/=')
    ) {
      const left = node.left;
      if (this.isStateVariable(left)) {
        this.reportIssue(node, mutability, context);
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkForStateChanges(child, mutability, context));
      } else if (value && typeof value === 'object') {
        this.checkForStateChanges(value, mutability, context);
      }
    }
  }

  private isStateVariable(node: any): boolean {
    if (!node) return false;

    if (node.type === 'Identifier') {
      return this.stateVariables.has(node.name);
    }

    if (node.type === 'IndexAccess') {
      return this.isStateVariable(node.base);
    }

    if (node.type === 'MemberAccess') {
      return this.isStateVariable(node.expression);
    }

    return false;
  }

  private reportIssue(
    node: any,
    mutability: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `State modification detected in ${mutability} function. ${mutability === 'view' ? 'View functions promise not to modify state.' : 'Pure functions promise not to read or modify state.'} Remove the state modification or change the function mutability.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
