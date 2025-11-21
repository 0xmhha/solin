/**
 * Cache Array Length Lint Rule
 *
 * Detects uncached array.length in loop conditions for gas optimization
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects array.length used directly in loop conditions:
 * - for (uint i = 0; i < array.length; i++) should cache length
 * - while (i < array.length) should cache length
 * - Checks if array is modified in loop body
 * - Provides gas optimization guidance
 */
export class CacheArrayLengthRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/cache-array-length',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Cache Array Length',
      description:
        'Detects array.length used directly in loop conditions without caching. Reading array.length in every iteration wastes gas, especially for storage arrays.',
      recommendation:
        'Cache the array length in a local variable before the loop to save gas. For storage arrays, this saves ~100 gas per iteration. For memory/calldata arrays, the savings are smaller but still worthwhile.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find loops
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for loops
    if (node.type === 'ForStatement') {
      this.checkForLoop(node, context);
    } else if (node.type === 'WhileStatement') {
      this.checkWhileLoop(node, context);
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
   * Check for loop for uncached array.length
   */
  private checkForLoop(node: any, context: AnalysisContext): void {
    if (!node.conditionExpression || !node.body) {
      return;
    }

    // Find array.length in condition
    const arrayNames = this.findArrayLengthAccess(node.conditionExpression);
    if (arrayNames.length === 0) {
      return;
    }

    // Check each array
    for (const arrayName of arrayNames) {
      // Check if array is modified in loop body
      if (this.isArrayModifiedInLoop(arrayName, node.body)) {
        continue; // Skip if array is modified
      }

      // Report issue
      this.reportIssue(arrayName, node, context);
    }
  }

  /**
   * Check while loop for uncached array.length
   */
  private checkWhileLoop(node: any, context: AnalysisContext): void {
    if (!node.condition || !node.body) {
      return;
    }

    // Find array.length in condition
    const arrayNames = this.findArrayLengthAccess(node.condition);
    if (arrayNames.length === 0) {
      return;
    }

    // Check each array
    for (const arrayName of arrayNames) {
      // Check if array is modified in loop body
      if (this.isArrayModifiedInLoop(arrayName, node.body)) {
        continue; // Skip if array is modified
      }

      // Report issue
      this.reportIssue(arrayName, node, context);
    }
  }

  /**
   * Find array.length access in an expression
   * Returns array of array names found
   */
  private findArrayLengthAccess(node: any): string[] {
    const arrayNames: string[] = [];

    const walk = (n: any): void => {
      if (!n || typeof n !== 'object') {
        return;
      }

      // Check for MemberAccess: something.length
      if (n.type === 'MemberAccess' && n.memberName === 'length') {
        const arrayName = this.getArrayName(n.expression);
        if (arrayName) {
          arrayNames.push(arrayName);
        }
      }

      // Recursively walk
      for (const key in n) {
        if (key === 'loc' || key === 'range') {
          continue;
        }

        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(child => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(node);
    return arrayNames;
  }

  /**
   * Get array name from expression
   * Supports: arrayName, structName.arrayName, etc.
   */
  private getArrayName(node: any): string | null {
    if (!node) {
      return null;
    }

    // Direct identifier: items.length
    if (node.type === 'Identifier') {
      return node.name;
    }

    // Member access: data.items.length
    if (node.type === 'MemberAccess') {
      return node.memberName;
    }

    return null;
  }

  /**
   * Check if array is modified in loop body
   */
  private isArrayModifiedInLoop(arrayName: string, loopBody: any): boolean {
    let isModified = false;

    const walk = (node: any): void => {
      if (!node || typeof node !== 'object' || isModified) {
        return;
      }

      // Check for function call: array.push(), array.pop(), etc.
      if (node.type === 'FunctionCall') {
        const calledArray = this.getCalledArrayName(node);
        if (calledArray === arrayName) {
          const method = this.getMethodName(node);
          if (this.isArrayModifyingMethod(method)) {
            isModified = true;
            return;
          }
        }
      }

      // Recursively walk
      for (const key in node) {
        if (key === 'loc' || key === 'range') {
          continue;
        }

        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(child => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(loopBody);
    return isModified;
  }

  /**
   * Get array name from function call
   */
  private getCalledArrayName(node: any): string | null {
    if (node.type !== 'FunctionCall') {
      return null;
    }

    // Check if expression is MemberAccess: array.method()
    if (node.expression && node.expression.type === 'MemberAccess') {
      const arrayName = this.getArrayName(node.expression.expression);
      return arrayName;
    }

    return null;
  }

  /**
   * Get method name from function call
   */
  private getMethodName(node: any): string | null {
    if (node.type !== 'FunctionCall') {
      return null;
    }

    if (node.expression && node.expression.type === 'MemberAccess') {
      return node.expression.memberName;
    }

    return null;
  }

  /**
   * Check if method modifies array
   */
  private isArrayModifyingMethod(method: string | null): boolean {
    if (!method) {
      return false;
    }

    const modifyingMethods = ['push', 'pop'];
    return modifyingMethods.includes(method);
  }

  /**
   * Report issue for uncached array.length
   */
  private reportIssue(arrayName: string, node: any, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Array length '${arrayName}.length' is read on every iteration. Cache it in a local variable before the loop to save gas (~100 gas per iteration for storage arrays).`,
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
