/**
 * Local Variable Shadowing Security Rule
 *
 * Detects local variables shadowing state variables
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects local variable shadowing:
 * - Local variables or parameters with same name as state variables
 * - Can cause confusion and bugs
 * - Makes code harder to understand
 */
export class LocalVariableShadowing extends AbstractRule {
  constructor() {
    super({
      id: 'security/local-variable-shadowing',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Local variable shadows state variable',
      description:
        'Detects local variables or function parameters that shadow state variables. This can cause confusion and potential bugs.',
      recommendation:
        'Rename local variables or parameters to avoid shadowing state variables. Use distinct names for clarity.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find contracts and check for shadowing
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check contracts
    if (node.type === 'ContractDefinition') {
      this.checkContract(node, context);
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
  }

  /**
   * Check contract for shadowing
   */
  private checkContract(contract: any, context: AnalysisContext): void {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return;
    }

    // Get all state variable names
    const stateVariables = new Set<string>();

    for (const node of contract.subNodes) {
      if (node.type === 'StateVariableDeclaration' && node.variables) {
        for (const variable of node.variables) {
          if (variable.name) {
            stateVariables.add(variable.name);
          }
        }
      }
    }

    // Check functions for shadowing
    for (const node of contract.subNodes) {
      if (node.type === 'FunctionDefinition') {
        this.checkFunction(node, stateVariables, context);
      }
    }
  }

  /**
   * Check function for shadowing
   */
  private checkFunction(
    func: any,
    stateVariables: Set<string>,
    context: AnalysisContext
  ): void {
    // Check function parameters
    if (func.parameters && Array.isArray(func.parameters)) {
      for (const param of func.parameters) {
        if (param.name && stateVariables.has(param.name)) {
          this.reportIssue(param, param.name, 'parameter', context);
        }
      }
    }

    // Check local variables in function body
    if (func.body) {
      this.checkBlockForShadowing(func.body, stateVariables, context);
    }
  }

  /**
   * Check block for shadowing variables
   */
  private checkBlockForShadowing(
    block: any,
    stateVariables: Set<string>,
    context: AnalysisContext
  ): void {
    if (!block) {
      return;
    }

    if (block.type === 'Block' && block.statements) {
      for (const stmt of block.statements) {
        this.checkStatementForShadowing(stmt, stateVariables, context);
      }
    }
  }

  /**
   * Check statement for shadowing variables
   */
  private checkStatementForShadowing(
    stmt: any,
    stateVariables: Set<string>,
    context: AnalysisContext
  ): void {
    if (!stmt) {
      return;
    }

    // Variable declaration
    if (stmt.type === 'VariableDeclarationStatement' && stmt.variables) {
      for (const variable of stmt.variables) {
        if (variable && variable.name && stateVariables.has(variable.name)) {
          this.reportIssue(variable, variable.name, 'local variable', context);
        }
      }
    }

    // Check nested blocks
    if (stmt.type === 'IfStatement') {
      this.checkBlockForShadowing(stmt.trueBody, stateVariables, context);
      this.checkBlockForShadowing(stmt.falseBody, stateVariables, context);
    } else if (stmt.type === 'ForStatement' || stmt.type === 'WhileStatement') {
      this.checkBlockForShadowing(stmt.body, stateVariables, context);
    }
  }

  /**
   * Report shadowing issue
   */
  private reportIssue(
    node: any,
    name: string,
    type: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Local ${type} '${name}' shadows a state variable. Consider renaming to avoid confusion.`,
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
