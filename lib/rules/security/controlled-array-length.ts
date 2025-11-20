/**
 * Controlled Array Length Security Rule
 *
 * Detects loops that iterate over arrays with lengths controlled by external actors.
 * This can lead to denial-of-service (DOS) attacks where an attacker provides
 * a very large array, causing the transaction to run out of gas.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#unbounded-loops
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects loops over externally-controlled arrays:
 * - for loops with array.length as upper bound where array is from parameters
 * - while loops checking array.length where array is from parameters
 * - Loops over memory/calldata arrays passed as function parameters
 *
 * This can cause denial-of-service when attackers provide large arrays.
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: External array controls loop iterations
 * function processUsers(address[] memory users) public {
 *   for (uint i = 0; i < users.length; i++) {
 *     // Gas-intensive operation
 *   }
 * }
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: Bounded iteration
 * function processUsers(address[] memory users) public {
 *   uint max = users.length > 100 ? 100 : users.length;
 *   for (uint i = 0; i < max; i++) {
 *     // Process with limit
 *   }
 * }
 * ```
 */
export class ControlledArrayLengthRule extends AbstractRule {
  private externalArrays: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/controlled-array-length',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Controlled Array Length',
      description:
        'Detects loops that iterate over arrays with lengths controlled by external actors. ' +
        'An attacker can provide a very large array, causing the transaction to run out of gas ' +
        'and creating a denial-of-service condition.',
      recommendation:
        'Limit the number of loop iterations by: ' +
        '1) Setting a maximum iteration count, ' +
        '2) Using pagination with start/end indices, ' +
        '3) Processing arrays off-chain and submitting results, or ' +
        '4) Using pull-over-push patterns for batch operations.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.externalArrays.clear();
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check function definitions for external array parameters
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
   * Check function for external array parameters and loops
   */
  private checkFunction(node: any, context: AnalysisContext): void {
    // Reset for each function
    this.externalArrays.clear();

    // Collect external/public function parameters that are arrays
    if (node.parameters) {
      for (const param of node.parameters) {
        if (this.isExternalArray(param)) {
          this.externalArrays.add(param.name);
        }
      }
    }

    // If no external arrays, no risk
    if (this.externalArrays.size === 0) {
      return;
    }

    // Check for loops in function body
    if (node.body) {
      this.checkForLoops(node.body, context);
    }
  }

  /**
   * Check if parameter is an external array (memory or calldata)
   */
  private isExternalArray(param: any): boolean {
    if (!param || !param.typeName) {
      return false;
    }

    const typeName = param.typeName;

    // Check if it's an array type
    if (typeName.type === 'ArrayTypeName') {
      // Check storage location (memory or calldata indicates external)
      const location = param.storageLocation;
      return location === 'memory' || location === 'calldata';
    }

    return false;
  }

  /**
   * Check for loops that use external array length
   */
  private checkForLoops(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for-loops
    if (node.type === 'ForStatement') {
      this.checkForStatement(node, context);
    }

    // Check while-loops
    if (node.type === 'WhileStatement') {
      this.checkWhileStatement(node, context);
    }

    // Recursively check nested statements
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.checkForLoops(child, context));
      } else if (value && typeof value === 'object') {
        this.checkForLoops(value, context);
      }
    }
  }

  /**
   * Check for-statement for external array length usage
   */
  private checkForStatement(node: any, context: AnalysisContext): void {
    if (!node.conditionExpression) {
      return;
    }

    const arrayName = this.getArrayNameFromCondition(node.conditionExpression);
    if (arrayName && this.externalArrays.has(arrayName)) {
      this.reportIssue(
        node,
        context,
        `Loop iterates over externally-controlled array '${arrayName}.length'. ` +
          'An attacker can provide a very large array causing denial-of-service. ' +
          'Consider limiting iterations or using pagination.'
      );
    }
  }

  /**
   * Check while-statement for external array length usage
   */
  private checkWhileStatement(node: any, context: AnalysisContext): void {
    if (!node.condition) {
      return;
    }

    const arrayName = this.getArrayNameFromCondition(node.condition);
    if (arrayName && this.externalArrays.has(arrayName)) {
      this.reportIssue(
        node,
        context,
        `While loop uses externally-controlled array '${arrayName}.length'. ` +
          'This can lead to denial-of-service attacks. ' +
          'Limit iterations or refactor to avoid unbounded loops.'
      );
    }
  }

  /**
   * Extract array name from loop condition (e.g., i < array.length)
   */
  private getArrayNameFromCondition(condition: any): string | null {
    if (!condition || typeof condition !== 'object') {
      return null;
    }

    // Check binary operations like i < array.length
    if (condition.type === 'BinaryOperation') {
      const right = condition.right;

      // Check if right side is array.length
      if (right && right.type === 'MemberAccess' && right.memberName === 'length') {
        const arrayExpr = right.expression;
        if (arrayExpr && arrayExpr.type === 'Identifier') {
          return arrayExpr.name;
        }
        // Handle array access like arrays[i].length
        if (arrayExpr && arrayExpr.type === 'IndexAccess') {
          const baseArray = this.getBaseArrayName(arrayExpr);
          if (baseArray) {
            return baseArray;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get base array name from nested index access
   */
  private getBaseArrayName(node: any): string | null {
    if (!node) {
      return null;
    }

    if (node.type === 'Identifier') {
      return node.name;
    }

    if (node.type === 'IndexAccess' && node.base) {
      return this.getBaseArrayName(node.base);
    }

    return null;
  }

  /**
   * Report a controlled array length issue
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
