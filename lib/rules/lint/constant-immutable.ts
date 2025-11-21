/**
 * Constant Immutable Lint Rule
 *
 * Detects state variables that should be constant or immutable for gas optimization
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * State variable tracking information
 */
interface StateVariableInfo {
  name: string;
  isConstant: boolean;
  isImmutable: boolean;
  hasDeclarationInit: boolean;
  constructorAssignments: number;
  functionAssignments: number;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

/**
 * Rule that detects state variables that should be constant or immutable:
 * - Variables initialized at declaration and never modified → constant
 * - Variables assigned only in constructor → immutable
 * - Provides gas optimization guidance
 */
export class ConstantImmutableRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/constant-immutable',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Constant Immutable Optimization',
      description:
        'Detects state variables that should be declared as constant or immutable for gas optimization. Constant variables are evaluated at compile time, and immutable variables are set once in the constructor.',
      recommendation:
        'Declare variables that never change as constant (for compile-time values) or immutable (for constructor-assigned values) to save gas costs.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Collect all state variables
    const stateVariables = new Map<string, StateVariableInfo>();
    this.collectStateVariables(context.ast, stateVariables);

    // If no state variables, nothing to check
    if (stateVariables.size === 0) {
      return;
    }

    // Track assignments to state variables
    this.trackAssignments(context.ast, stateVariables);

    // Analyze each state variable and report issues
    for (const [varName, info] of stateVariables) {
      this.analyzeVariable(varName, info, context);
    }
  }

  /**
   * Collect all state variable declarations
   */
  private collectStateVariables(node: any, stateVariables: Map<string, StateVariableInfo>): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if this is a contract definition
    if (node.type === 'ContractDefinition') {
      // Iterate through contract members
      if (Array.isArray(node.subNodes)) {
        for (const subNode of node.subNodes) {
          if (subNode.type === 'StateVariableDeclaration') {
            this.processStateVariableDeclaration(subNode, stateVariables);
          }
        }
      }
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.collectStateVariables(child, stateVariables));
      } else if (value && typeof value === 'object') {
        this.collectStateVariables(value, stateVariables);
      }
    }
  }

  /**
   * Process a state variable declaration
   */
  private processStateVariableDeclaration(
    node: any,
    stateVariables: Map<string, StateVariableInfo>
  ): void {
    if (!node.variables || !Array.isArray(node.variables)) {
      return;
    }

    for (const variable of node.variables) {
      if (!variable.name || !variable.loc) {
        continue;
      }

      // Check if variable is constant or immutable
      // Note: isDeclaredConst and isStateVar properties might also exist
      const isConstant = variable.isConstant === true || variable.isDeclaredConst === true;
      const isImmutable = variable.isImmutable === true;

      const info: StateVariableInfo = {
        name: variable.name,
        isConstant,
        isImmutable,
        hasDeclarationInit: variable.expression !== null && variable.expression !== undefined,
        constructorAssignments: 0,
        functionAssignments: 0,
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
      };

      stateVariables.set(variable.name, info);
    }
  }

  /**
   * Track all assignments to state variables
   */
  private trackAssignments(node: any, stateVariables: Map<string, StateVariableInfo>): void {
    this.walkAst(node, stateVariables, false);
  }

  /**
   * Recursively walk AST and track assignments
   */
  private walkAst(
    node: any,
    stateVariables: Map<string, StateVariableInfo>,
    inConstructor: boolean
  ): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if entering a constructor
    let isConstructor = inConstructor;
    if (node.type === 'FunctionDefinition' && node.isConstructor) {
      isConstructor = true;
    }

    // Check for assignments
    if (node.type === 'BinaryOperation' && node.operator === '=') {
      this.processAssignment(node, stateVariables, isConstructor);
    }

    // Check for unary operations (++, --)
    if (node.type === 'UnaryOperation') {
      if (node.operator === '++' || node.operator === '--') {
        this.processUnaryOperation(node, stateVariables, isConstructor);
      }
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, stateVariables, isConstructor));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, stateVariables, isConstructor);
      }
    }
  }

  /**
   * Process an assignment operation
   */
  private processAssignment(
    node: any,
    stateVariables: Map<string, StateVariableInfo>,
    inConstructor: boolean
  ): void {
    // Get the variable name being assigned
    const varName = this.getAssignmentTarget(node.left);
    if (!varName) {
      return;
    }

    // Check if it's a state variable
    const info = stateVariables.get(varName);
    if (!info) {
      return;
    }

    // Track assignment location
    if (inConstructor) {
      info.constructorAssignments++;
    } else {
      info.functionAssignments++;
    }
  }

  /**
   * Process a unary operation (++, --)
   */
  private processUnaryOperation(
    node: any,
    stateVariables: Map<string, StateVariableInfo>,
    inConstructor: boolean
  ): void {
    // Get the variable name being modified
    const varName = this.getAssignmentTarget(node.subExpression);
    if (!varName) {
      return;
    }

    // Check if it's a state variable
    const info = stateVariables.get(varName);
    if (!info) {
      return;
    }

    // Track modification location
    if (inConstructor) {
      info.constructorAssignments++;
    } else {
      info.functionAssignments++;
    }
  }

  /**
   * Get the variable name from assignment target
   */
  private getAssignmentTarget(node: any): string | null {
    if (!node) {
      return null;
    }

    // Direct identifier: varName = value
    if (node.type === 'Identifier') {
      return node.name;
    }

    return null;
  }

  /**
   * Analyze a state variable and report if it should be constant/immutable
   */
  private analyzeVariable(
    varName: string,
    info: StateVariableInfo,
    context: AnalysisContext
  ): void {
    // Skip if already constant or immutable
    if (info.isConstant || info.isImmutable) {
      return;
    }

    // Skip if modified in regular functions
    if (info.functionAssignments > 0) {
      return;
    }

    // Case 1: Initialized at declaration and never modified → suggest constant
    if (info.hasDeclarationInit && info.constructorAssignments === 0) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `State variable '${varName}' is initialized at declaration and never modified. Consider declaring it as 'constant' for gas optimization.`,
        location: info.location,
      });
      return;
    }

    // Case 2: Only assigned in constructor → suggest immutable
    if (!info.hasDeclarationInit && info.constructorAssignments > 0) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `State variable '${varName}' is only assigned in the constructor. Consider declaring it as 'immutable' for gas optimization.`,
        location: info.location,
      });
      return;
    }

    // Case 3: Both declaration init and constructor assignment → not constant/immutable
    // Case 4: No initialization and no constructor assignment → probably set later, skip
  }
}
