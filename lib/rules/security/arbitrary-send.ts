/**
 * Arbitrary Send Security Rule
 *
 * Detects send() or transfer() calls where the recipient address
 * can be controlled by external input, potentially allowing fund drainage.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects dangerous send/transfer patterns:
 * - send() or transfer() to function parameters
 * - send() to mapping values or array elements
 * - send() to storage variables that can be set by external functions
 *
 * Safe patterns (excluded):
 * - send() to msg.sender
 * - send() to constant or immutable addresses
 * - send() to hardcoded address literals
 */
export class ArbitrarySendRule extends AbstractRule {
  private contractStateVars: Map<string, any> = new Map();
  private constructorOnlyVars: Set<string> = new Set();
  private currentContract: any = null;

  constructor() {
    super({
      id: 'security/arbitrary-send',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Arbitrary Send/Transfer',
      description:
        'Detects send() or transfer() calls where the recipient address can be controlled by external input. This can allow attackers to drain contract funds by directing payments to arbitrary addresses.',
      recommendation:
        'Avoid sending ETH to addresses controlled by user input. Use withdrawal patterns where users call a function to withdraw their own funds (pull over push). If you must send to external addresses, implement strict access controls and whitelist mechanisms.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Reset state for each file
    this.contractStateVars.clear();
    this.constructorOnlyVars.clear();
    this.currentContract = null;

    // Walk the AST to find all contracts and analyze them
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Track current contract for state variable analysis
    if (node.type === 'ContractDefinition') {
      const previousContract = this.currentContract;
      this.currentContract = node;
      this.collectContractStateVars(node);
      this.analyzeConstructorOnlyVars(node);

      // Recursively walk contract contents
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

      this.currentContract = previousContract;
      return;
    }

    // Check for FunctionCall nodes (send/transfer)
    if (node.type === 'FunctionCall') {
      this.checkFunctionCall(node, context);
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
   * Collect state variables from a contract
   */
  private collectContractStateVars(contract: any): void {
    this.contractStateVars.clear();

    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return;
    }

    for (const node of contract.subNodes) {
      if (node.type === 'StateVariableDeclaration' && node.variables) {
        for (const variable of node.variables) {
          this.contractStateVars.set(variable.name, {
            isConstant: variable.isDeclaredConst,
            isImmutable: variable.isImmutable,
            node: variable,
          });
        }
      }
    }
  }

  /**
   * Analyze which state variables are only assigned in constructor
   */
  private analyzeConstructorOnlyVars(contract: any): void {
    this.constructorOnlyVars.clear();

    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return;
    }

    // Find constructor and collect assignments
    const constructorAssignments = new Set<string>();
    const otherAssignments = new Set<string>();

    for (const node of contract.subNodes) {
      if (node.type === 'FunctionDefinition') {
        if (node.isConstructor || node.name === 'constructor' || node.name === null) {
          // Constructor function
          this.collectAssignments(node, constructorAssignments);
        } else {
          // Non-constructor function
          this.collectAssignments(node, otherAssignments);
        }
      }
    }

    // Variables assigned in constructor but not in other functions are constructor-only
    for (const varName of constructorAssignments) {
      if (!otherAssignments.has(varName)) {
        this.constructorOnlyVars.add(varName);
      }
    }
  }

  /**
   * Collect all state variable assignments in a function
   */
  private collectAssignments(functionNode: any, assignments: Set<string>): void {
    if (!functionNode.body) {
      return;
    }

    this.findStateVarAssignments(functionNode.body, assignments);
  }

  /**
   * Recursively find state variable assignments
   */
  private findStateVarAssignments(node: any, assignments: Set<string>): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for assignment operations
    if (node.type === 'BinaryOperation' && node.operator === '=') {
      const varName = this.getVarNameFromExpression(node.left);
      if (varName && this.contractStateVars.has(varName)) {
        assignments.add(varName);
      }
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.findStateVarAssignments(child, assignments));
      } else if (value && typeof value === 'object') {
        this.findStateVarAssignments(value, assignments);
      }
    }
  }

  /**
   * Get variable name from an expression (handles Identifier and MemberAccess)
   */
  private getVarNameFromExpression(node: any): string | null {
    if (!node) {
      return null;
    }

    if (node.type === 'Identifier') {
      return node.name;
    }

    if (node.type === 'MemberAccess') {
      // Handle this.varName
      if (
        node.expression &&
        node.expression.type === 'Identifier' &&
        node.expression.name === 'this'
      ) {
        return node.memberName;
      }
      return node.memberName;
    }

    return null;
  }

  /**
   * Check if a function call is a send or transfer
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    if (!node.expression || node.expression.type !== 'MemberAccess') {
      return;
    }

    const memberAccess = node.expression;
    const methodName = memberAccess.memberName;

    // Check if it's send() or transfer()
    if (methodName !== 'send' && methodName !== 'transfer') {
      return;
    }

    // Get the recipient address expression
    let recipient = memberAccess.expression;

    // Unwrap any type conversions (payable, address, etc.)
    recipient = this.unwrapTypeConversions(recipient);

    // Check if the recipient is safe
    if (this.isSafeRecipient(recipient)) {
      return;
    }

    // Report the issue
    this.reportArbitrarySend(node, recipient, methodName, context);
  }

  /**
   * Unwrap type conversion wrappers like payable() or address()
   */
  private unwrapTypeConversions(node: any): any {
    if (!node) {
      return node;
    }

    // If it's a FunctionCall, check if it's a type conversion
    while (node.type === 'FunctionCall') {
      const callee = node.expression;

      // Check if it's a type conversion (ElementaryTypeNameExpression or Identifier for common types)
      if (callee && callee.type === 'ElementaryTypeNameExpression') {
        if (node.arguments && node.arguments.length === 1) {
          // Unwrap this layer
          node = node.arguments[0];
          continue;
        }
      }

      // Also handle Identifier type conversions (less common but possible)
      if (
        callee &&
        callee.type === 'Identifier' &&
        (callee.name === 'payable' || callee.name === 'address')
      ) {
        if (node.arguments && node.arguments.length === 1) {
          node = node.arguments[0];
          continue;
        }
      }

      // Not a type conversion, stop unwrapping
      break;
    }

    return node;
  }

  /**
   * Check if a recipient address is safe (not arbitrary)
   */
  private isSafeRecipient(recipient: any): boolean {
    if (!recipient) {
      return false;
    }

    // Safe: msg.sender
    if (this.isMsgSender(recipient)) {
      return true;
    }

    // Safe: hardcoded address literal
    if (this.isAddressLiteral(recipient)) {
      return true;
    }

    // Safe: constant or immutable state variables
    if (this.isConstantOrImmutableVar(recipient)) {
      return true;
    }

    // Unsafe: function parameters, mappings, arrays, mutable storage
    return false;
  }

  /**
   * Check if expression is msg.sender
   * Note: Type conversions (payable, address) are already unwrapped by caller
   */
  private isMsgSender(node: any): boolean {
    if (!node) {
      return false;
    }

    // Check for msg.sender (already unwrapped)
    if (node.type === 'MemberAccess') {
      const expression = node.expression;
      const memberName = node.memberName;

      if (
        expression &&
        expression.type === 'Identifier' &&
        expression.name === 'msg' &&
        memberName === 'sender'
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if expression is a hardcoded address literal
   * Note: Type conversions (payable, address) are already unwrapped by caller
   */
  private isAddressLiteral(node: any): boolean {
    if (!node) {
      return false;
    }

    // Check for address literal (NumberLiteral for hex addresses, already unwrapped)
    if (node.type === 'NumberLiteral') {
      return true;
    }

    return false;
  }

  /**
   * Check if expression is a constant, immutable, or constructor-only variable
   */
  private isConstantOrImmutableVar(node: any): boolean {
    if (node.type !== 'Identifier') {
      return false;
    }

    const varInfo = this.contractStateVars.get(node.name);
    if (!varInfo) {
      return false;
    }

    // Safe if constant, immutable, or constructor-only
    return (
      varInfo.isConstant ||
      varInfo.isImmutable ||
      this.constructorOnlyVars.has(node.name)
    );
  }

  /**
   * Report an arbitrary send issue
   */
  private reportArbitrarySend(
    node: any,
    recipient: any,
    methodName: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) {
      return;
    }

    const recipientType = this.getRecipientType(recipient);

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Arbitrary ${methodName}() detected. The recipient address (${recipientType}) can be controlled by external input, potentially allowing fund drainage. Use withdrawal patterns or implement strict access controls.`,
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
   * Get a human-readable description of the recipient type
   */
  private getRecipientType(recipient: any): string {
    if (!recipient) {
      return 'unknown';
    }

    if (recipient.type === 'Identifier') {
      return `parameter or variable '${recipient.name}'`;
    }

    if (recipient.type === 'IndexAccess') {
      return 'mapping or array element';
    }

    if (recipient.type === 'MemberAccess') {
      return `member access '${recipient.memberName}'`;
    }

    if (recipient.type === 'FunctionCall') {
      return 'function return value';
    }

    return 'user-controlled address';
  }
}
