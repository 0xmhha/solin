/**
 * Array Out of Bounds Security Rule
 *
 * Detects potential array access out of bounds vulnerabilities.
 * Accessing an array without bounds checking can cause transaction reverts
 * or allow attackers to DOS the contract.
 *
 * @example Vulnerable code:
 * ```solidity
 * uint[] data;
 * function get(uint i) public view returns (uint) {
 *   return data[i]; // No bounds check!
 * }
 * ```
 *
 * @example Safe code:
 * ```solidity
 * function get(uint i) public view returns (uint) {
 *   require(i < data.length, "Out of bounds");
 *   return data[i];
 * }
 * ```
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class ArrayOutOfBoundsRule extends AbstractRule {
  private stateArrays: Set<string> = new Set();
  private currentFunction: any = null;
  private checkedIndices: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/array-out-of-bounds',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Array Access Without Bounds Check',
      description:
        'Detects array access without proper bounds checking. Accessing arrays with unchecked indices can cause transaction reverts or enable denial-of-service attacks. Always validate array indices before access.',
      recommendation:
        'Always check array bounds before accessing elements. Use require(index < array.length) or if (index < array.length) before array access. Consider using SafeMath or OpenZeppelin libraries for safe array operations.',
    });
  }

  analyze(context: AnalysisContext): void {
    // First pass: collect state arrays
    this.stateArrays.clear();
    this.collectStateArrays(context.ast);

    // Second pass: check array accesses
    this.walkAst(context.ast, context);
  }

  private collectStateArrays(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'StateVariableDeclaration') {
      node.variables?.forEach((variable: any) => {
        if (variable.typeName?.type === 'ArrayTypeName') {
          this.stateArrays.add(variable.name);
        }
      });
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.collectStateArrays(child));
      } else if (value && typeof value === 'object') {
        this.collectStateArrays(value);
      }
    }
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Track current function for context
    if (node.type === 'FunctionDefinition') {
      const prevFunction = this.currentFunction;
      const prevChecked = new Set(this.checkedIndices);

      this.currentFunction = node;
      this.checkedIndices.clear();

      // Collect bounds checks in this function
      if (node.body) {
        this.collectBoundsChecks(node.body);
      }

      // Check array accesses in function
      if (node.body) {
        this.checkFunctionBody(node.body, context);
      }

      this.currentFunction = prevFunction;
      this.checkedIndices = prevChecked;
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

  private collectBoundsChecks(node: any): void {
    if (!node || typeof node !== 'object') return;

    // Look for require statements with bounds checks
    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      if (expr?.type === 'Identifier' && expr.name === 'require') {
        // Check if condition is a bounds check
        const condition = node.arguments?.[0];
        if (condition) {
          this.extractBoundsCheck(condition);
        }
      }
    }

    // Look for if statements with bounds checks
    if (node.type === 'IfStatement') {
      if (node.condition) {
        this.extractBoundsCheck(node.condition);
      }
    }

    // Look for for loops with bounds checks
    if (node.type === 'ForStatement') {
      if (node.conditionExpression) {
        this.extractBoundsCheck(node.conditionExpression);
      }
    }

    // Look for while loops with bounds checks
    if (node.type === 'WhileStatement') {
      if (node.condition) {
        this.extractBoundsCheck(node.condition);
      }
    }

    // Recursively check children
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.collectBoundsChecks(child));
      } else if (value && typeof value === 'object') {
        this.collectBoundsChecks(value);
      }
    }
  }

  private extractBoundsCheck(condition: any): void {
    if (!condition) return;

    // Look for comparisons like: index < array.length
    if (condition.type === 'BinaryOperation') {
      const { left, operator, right } = condition;

      // Check for: index < array.length or array.length > index
      if (operator === '<' || operator === '>') {
        const indexSide = operator === '<' ? left : right;
        const lengthSide = operator === '<' ? right : left;

        // Check if right side is array.length
        if (lengthSide?.type === 'MemberAccess' && lengthSide.memberName === 'length') {
          const arrayName = this.getIdentifierName(lengthSide.expression);
          const indexName = this.getIdentifierName(indexSide);

          if (arrayName && indexName) {
            this.checkedIndices.add(`${arrayName}:${indexName}`);
          }
        }
      }
    }
  }

  private checkFunctionBody(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for array access
    if (node.type === 'IndexAccess') {
      this.checkArrayAccess(node, context);
    }

    // Recursively check children
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.checkFunctionBody(child, context));
      } else if (value && typeof value === 'object') {
        this.checkFunctionBody(value, context);
      }
    }
  }

  private checkArrayAccess(node: any, context: AnalysisContext): void {
    const base = node.base;
    const index = node.index;

    if (!base || !index) return;

    // Get array name
    const arrayName = this.getIdentifierName(base);
    if (!arrayName) return;

    // Only check state arrays (not memory/calldata)
    if (!this.stateArrays.has(arrayName)) return;

    // Skip if this is inside a loop condition checking array length
    if (this.isInLoopCondition(node)) return;

    // Get index name/expression
    const indexName = this.getIdentifierName(index);

    // Check if this access has been bounds checked
    if (indexName && this.checkedIndices.has(`${arrayName}:${indexName}`)) {
      return;
    }

    // Report issue
    this.reportIssue(node, arrayName, context);
  }

  private isInLoopCondition(_node: any): boolean {
    // This is a simplified check - in practice, we'd need to track parent nodes
    // For now, we'll be conservative and allow some false negatives
    return false;
  }

  private getIdentifierName(node: any): string | null {
    if (!node) return null;

    if (node.type === 'Identifier') {
      return node.name;
    }

    if (node.type === 'MemberAccess') {
      return this.getIdentifierName(node.expression);
    }

    return null;
  }

  private reportIssue(node: any, arrayName: string, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Array '${arrayName}' accessed without bounds check. Add require(index < ${arrayName}.length) or if (index < ${arrayName}.length) before accessing the array to prevent out-of-bounds errors and potential DOS attacks.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
