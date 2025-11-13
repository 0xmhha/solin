/**
 * Controlled Delegatecall Security Rule
 *
 * Detects delegatecall calls where the target address is controlled by external input.
 * Delegatecall with user-controlled destinations is extremely dangerous because:
 * - Allows arbitrary code execution in the context of the caller
 * - Attacker can deploy malicious contract and delegatecall to it
 * - Can modify all storage variables and steal funds
 * - Completely bypasses contract logic and security measures
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface StateVariable {
  name: string;
  isConstant: boolean;
  isImmutable: boolean;
  assignedInConstructor: boolean;
}

/**
 * Rule that detects controlled delegatecall destinations:
 * - Function parameters (user can pass any address)
 * - Mapping values (user controls index, can point to malicious contract)
 * - Array elements (user controls index)
 * - Mutable storage variables (can be changed after deployment)
 *
 * Safe patterns (excluded):
 * - constant addresses (compile-time fixed)
 * - immutable addresses (constructor-only, cannot be changed)
 * - hardcoded address literals (0x...)
 * - constructor-only variables (set once, never modified)
 */
export class ControlledDelegatecallRule extends AbstractRule {
  private stateVariables: Map<string, StateVariable> = new Map();
  private functionParameters: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/controlled-delegatecall',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Controlled Delegatecall Destination',
      description:
        'Detects delegatecall calls where the target address can be controlled by external input. This allows attackers to execute arbitrary code in the contract context, modify storage, and steal funds.',
      recommendation:
        'Use a whitelist of approved contract addresses, implement strict access controls, or use immutable/constant addresses. Consider using a proxy pattern with upgradeability controls instead of user-controlled delegatecall.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Reset state for each file
    this.stateVariables.clear();
    this.functionParameters.clear();

    // Collect state variables and their properties
    this.collectStateVariables(context.ast);

    // Walk the AST to find delegatecall calls
    this.walkAst(context.ast, context);
  }

  /**
   * Collect all state variables and their properties
   */
  private collectStateVariables(node: any): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'StateVariableDeclaration') {
      for (const variable of node.variables || []) {
        const isConstant = variable.isDeclaredConst || false;
        const isImmutable = variable.isImmutable || false;

        this.stateVariables.set(variable.name, {
          name: variable.name,
          isConstant,
          isImmutable,
          assignedInConstructor: false, // Will be updated later
        });
      }
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.collectStateVariables(child));
      } else if (value && typeof value === 'object') {
        this.collectStateVariables(value);
      }
    }
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Collect function parameters
    if (node.type === 'FunctionDefinition') {
      this.collectFunctionParameters(node);
    }

    // Check for delegatecall
    if (node.type === 'FunctionCall') {
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

    // Clear function parameters when leaving function scope
    if (node.type === 'FunctionDefinition') {
      this.functionParameters.clear();
    }
  }

  /**
   * Collect function parameters for current function scope
   */
  private collectFunctionParameters(functionNode: any): void {
    this.functionParameters.clear();

    if (functionNode.parameters) {
      for (const param of functionNode.parameters) {
        if (param.name) {
          this.functionParameters.add(param.name);
        }
      }
    }
  }

  /**
   * Check if a function call is delegatecall with controlled destination
   */
  private checkDelegatecall(node: any, context: AnalysisContext): void {
    // Check if it's a member access: target.delegatecall(...)
    if (
      node.expression &&
      node.expression.type === 'MemberAccess' &&
      node.expression.memberName === 'delegatecall'
    ) {
      const target = node.expression.expression;

      // Check if target is controlled by external input
      if (this.isControlledTarget(target)) {
        this.reportControlledDelegatecall(node, target, context);
      }
    }
  }

  /**
   * Check if target address is controlled by external input
   */
  private isControlledTarget(targetNode: any): boolean {
    if (!targetNode) {
      return false;
    }

    // Unwrap type conversions like address(target)
    let node = targetNode;
    while (node.type === 'FunctionCall' && this.isTypeConversion(node)) {
      if (node.arguments && node.arguments.length > 0) {
        node = node.arguments[0];
      } else {
        break;
      }
    }

    // Check different types of controlled targets
    switch (node.type) {
      case 'Identifier':
        return this.isControlledIdentifier(node.name);

      case 'IndexAccess':
        // Mapping or array access - user controls the index
        return true;

      case 'MemberAccess':
        // Check if it's accessing a controlled member
        return this.isControlledTarget(node.expression);

      case 'NumberLiteral':
      case 'HexLiteral':
        // Hardcoded address literals are safe
        return false;

      default:
        // Unknown node type - be conservative and report
        return true;
    }
  }

  /**
   * Check if identifier refers to a controlled variable
   */
  private isControlledIdentifier(name: string): boolean {
    // Function parameters are always user-controlled
    if (this.functionParameters.has(name)) {
      return true;
    }

    // Check state variables
    const stateVar = this.stateVariables.get(name);
    if (stateVar) {
      // constant and immutable variables are safe
      if (stateVar.isConstant || stateVar.isImmutable) {
        return false;
      }

      // Mutable state variables can be controlled
      return true;
    }

    // Unknown identifier - be conservative and report
    return true;
  }

  /**
   * Check if a function call is a type conversion (address(...))
   */
  private isTypeConversion(node: any): boolean {
    if (node.type !== 'FunctionCall') {
      return false;
    }

    // Check if it's a simple identifier (type name)
    if (node.expression && node.expression.type === 'Identifier') {
      const typeName = node.expression.name;
      // Common type conversions
      return (
        typeName === 'address' ||
        typeName === 'uint256' ||
        typeName === 'uint' ||
        typeName === 'int' ||
        typeName === 'bytes' ||
        typeName === 'string'
      );
    }

    // Check for ElementaryTypeNameExpression (address, uint, etc.)
    if (node.expression && node.expression.type === 'ElementaryTypeNameExpression') {
      return true;
    }

    return false;
  }

  /**
   * Report a controlled delegatecall issue
   */
  private reportControlledDelegatecall(
    node: any,
    targetNode: any,
    context: AnalysisContext
  ): void {
    if (!node.loc) {
      return;
    }

    // Determine the type of controlled target
    const targetType = this.getTargetType(targetNode);

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Controlled delegatecall detected. The target address ${targetType} can be controlled by external input, allowing arbitrary code execution. Use a whitelist of approved addresses or immutable/constant addresses instead.`,
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
   * Get human-readable description of target type
   */
  private getTargetType(targetNode: any): string {
    if (!targetNode) {
      return '(unknown)';
    }

    // Unwrap type conversions
    let node = targetNode;
    while (node.type === 'FunctionCall' && this.isTypeConversion(node)) {
      if (node.arguments && node.arguments.length > 0) {
        node = node.arguments[0];
      } else {
        break;
      }
    }

    switch (node.type) {
      case 'Identifier':
        if (this.functionParameters.has(node.name)) {
          return `(function parameter '${node.name}')`;
        }
        return `(variable '${node.name}')`;

      case 'IndexAccess':
        return '(mapping/array element)';

      case 'MemberAccess':
        return `(member '${node.memberName}')`;

      default:
        return '(expression)';
    }
  }
}
