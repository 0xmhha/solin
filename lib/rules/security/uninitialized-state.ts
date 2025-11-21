/**
 * Uninitialized State Variables Security Rule
 *
 * Detects state variables that are declared but not initialized,
 * which may lead to unexpected behavior or security issues.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects uninitialized state variables:
 * - Variables declared without initial value
 * - Variables not initialized in constructor
 * - Partial initialization (some vars initialized, others not)
 *
 * Excludes:
 * - constant variables (must be initialized at declaration)
 * - immutable variables (initialized in constructor)
 * - Variables with explicit initialization
 */
export class UninitializedStateRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/uninitialized-state',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Uninitialized State Variables',
      description:
        'Detects state variables that are not explicitly initialized. Uninitialized variables default to zero values which may lead to unexpected behavior or security vulnerabilities.',
      recommendation:
        'Explicitly initialize all state variables either at declaration or in the constructor. For intentional zero values, use explicit initialization (e.g., uint256 value = 0) to document the intent.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST to find all contracts
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check contracts
    if (node.type === 'ContractDefinition') {
      this.analyzeContract(node, context);
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
   * Analyze a single contract for uninitialized state variables
   */
  private analyzeContract(contract: any, context: AnalysisContext): void {
    // Collect all state variables
    const stateVariables = this.collectStateVariables(contract);

    // Find constructor if exists
    const constructor = this.findConstructor(contract);

    // Collect variables initialized in constructor
    const constructorInitialized = constructor
      ? this.findConstructorInitializations(constructor)
      : new Set<string>();

    // Check each state variable
    for (const variable of stateVariables) {
      // Skip constant and immutable variables
      if (this.isConstantOrImmutable(variable)) {
        continue;
      }

      // Check if initialized at declaration
      if (this.isInitializedAtDeclaration(variable)) {
        continue;
      }

      // Check if initialized in constructor
      if (constructorInitialized.has(variable.name)) {
        continue;
      }

      // Report uninitialized variable
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `State variable '${variable.name}' is uninitialized. Consider explicit initialization to avoid relying on default zero values.`,
        location: {
          start: {
            line: variable.loc.start.line,
            column: variable.loc.start.column,
          },
          end: {
            line: variable.loc.end.line,
            column: variable.loc.end.column,
          },
        },
      });
    }
  }

  /**
   * Collect all state variables from a contract
   */
  private collectStateVariables(contract: any): any[] {
    const variables: any[] = [];

    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return variables;
    }

    for (const node of contract.subNodes) {
      if (node.type === 'StateVariableDeclaration' && node.variables) {
        for (const variable of node.variables) {
          variables.push({
            name: variable.name,
            isDeclaredConst: variable.isDeclaredConst,
            isImmutable: variable.isImmutable,
            expression: variable.expression,
            loc: variable.loc || node.loc,
          });
        }
      }
    }

    return variables;
  }

  /**
   * Find constructor in contract
   */
  private findConstructor(contract: any): any | null {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return null;
    }

    for (const node of contract.subNodes) {
      if (
        node.type === 'FunctionDefinition' &&
        (node.isConstructor || node.name === 'constructor' || node.name === null)
      ) {
        return node;
      }
    }

    return null;
  }

  /**
   * Find all variables initialized in constructor
   */
  private findConstructorInitializations(constructor: any): Set<string> {
    const initialized = new Set<string>();

    if (!constructor.body) {
      return initialized;
    }

    this.findAssignments(constructor.body, initialized);

    return initialized;
  }

  /**
   * Recursively find assignments in AST
   */
  private findAssignments(node: any, initialized: Set<string>): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for assignments
    if (node.type === 'BinaryOperation' && node.operator === '=') {
      // Get the variable name being assigned
      const varName = this.getVariableName(node.left);
      if (varName) {
        initialized.add(varName);
      }
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.findAssignments(child, initialized));
      } else if (value && typeof value === 'object') {
        this.findAssignments(value, initialized);
      }
    }
  }

  /**
   * Get variable name from expression
   */
  private getVariableName(node: any): string | null {
    if (!node) {
      return null;
    }

    if (node.type === 'Identifier') {
      return node.name;
    }

    // Handle member access like this.value = ...
    if (node.type === 'MemberAccess' && node.memberName) {
      return node.memberName;
    }

    return null;
  }

  /**
   * Check if variable is constant or immutable
   */
  private isConstantOrImmutable(variable: any): boolean {
    return variable.isDeclaredConst || variable.isImmutable;
  }

  /**
   * Check if variable is initialized at declaration
   */
  private isInitializedAtDeclaration(variable: any): boolean {
    return variable.expression !== null && variable.expression !== undefined;
  }
}
