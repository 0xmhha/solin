/**
 * Storage Array Delete Security Rule
 *
 * Detects dangerous delete operations on storage arrays.
 * Deleting a storage array sets its length to 0 but doesn't free gas,
 * and can leave orphaned data in storage leading to unexpected behavior.
 *
 * @example Vulnerable code:
 * ```solidity
 * uint[] public data;
 * function clear() public { delete data; } // Dangerous!
 * ```
 *
 * @example Safe alternative:
 * ```solidity
 * // Use pop() in a loop or create a new array
 * function clear() public {
 *   while(data.length > 0) { data.pop(); }
 * }
 * ```
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class StorageArrayDeleteRule extends AbstractRule {
  private stateVariables: Map<string, any> = new Map();

  constructor() {
    super({
      id: 'security/storage-array-delete',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Dangerous Delete on Storage Array',
      description:
        'Detects delete operations on storage arrays. Using delete on a storage array sets its length to 0 but does not free storage gas, and can leave orphaned data causing unexpected behavior or gas issues. Delete on arrays can also create gaps in storage that are difficult to manage.',
      recommendation:
        'Avoid using delete on storage arrays. Instead, use array.pop() in a loop to properly clean up elements, or implement a more efficient data structure like a mapping. If you need to clear an array, consider creating a new empty array or using a library like OpenZeppelin\'s EnumerableSet.',
    });
  }

  analyze(context: AnalysisContext): void {
    // First pass: collect state variables that are arrays
    this.stateVariables.clear();
    this.collectStateVariables(context.ast);

    // Second pass: detect delete operations
    this.walkAst(context.ast, context);
  }

  private collectStateVariables(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'StateVariableDeclaration') {
      node.variables?.forEach((variable: any) => {
        if (variable.typeName?.type === 'ArrayTypeName') {
          this.stateVariables.set(variable.name, variable);
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

    // Check for delete statements
    if (node.type === 'UnaryOperation' && node.operator === 'delete') {
      this.checkDeleteOperation(node, context);
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

  private checkDeleteOperation(node: any, context: AnalysisContext): void {
    const subExpression = node.subExpression;
    if (!subExpression) return;

    // Check if deleting an array identifier directly
    if (subExpression.type === 'Identifier') {
      const varName = subExpression.name;
      if (this.stateVariables.has(varName)) {
        this.reportIssue(node, varName, 'array', context);
        return;
      }
    }

    // Check if deleting an array element (array[index])
    if (subExpression.type === 'IndexAccess') {
      const baseExpr = subExpression.base;
      if (baseExpr?.type === 'Identifier') {
        const varName = baseExpr.name;
        if (this.stateVariables.has(varName)) {
          this.reportIssue(node, varName, 'element', context);
          return;
        }
      }
    }
  }

  private reportIssue(
    node: any,
    arrayName: string,
    deleteType: 'array' | 'element',
    context: AnalysisContext
  ): void {
    if (!node.loc) return;

    const message =
      deleteType === 'array'
        ? `Dangerous delete operation on storage array '${arrayName}'. Using delete on storage arrays sets length to 0 but doesn't free gas and leaves orphaned storage data. Use array.pop() in a loop instead, or redesign to use a mapping.`
        : `Dangerous delete operation on storage array element '${arrayName}[index]'. Deleting array elements with delete creates gaps and doesn't reduce array length. Use array.pop() for last element or swap-and-pop pattern for other elements.`;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
