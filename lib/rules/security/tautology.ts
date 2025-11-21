/**
 * Tautology Security Rule
 *
 * Detects tautological comparisons that are always true or always false.
 * These indicate logic errors or dead code and should be removed or fixed.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#tautology-or-contradiction
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects tautological comparisons:
 * - unsigned >= 0 (always true)
 * - unsigned < 0 (always false)
 * - unsigned > type(uint).max (always false)
 * - x == x, x >= x, x <= x (always true)
 * - x != x, x > x, x < x (always false)
 *
 * These indicate logic errors or misunderstanding of types.
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: Tautologies
 * uint x;
 * if (x >= 0) { } // Always true
 * if (x < 0) { }  // Always false
 * if (x == x) { } // Always true
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: Meaningful comparisons
 * int x;
 * if (x >= 0) { } // Valid for signed
 * if (x >= y) { } // Compare different vars
 * ```
 */
export class TautologyRule extends AbstractRule {
  // Type max values for common unsigned types
  private static readonly TYPE_MAX: Record<string, number> = {
    uint8: 255,
    uint16: 65535,
    uint24: 16777215,
    uint32: 4294967295,
    // For larger types, we can't represent exact values but can detect patterns
  };

  constructor() {
    super({
      id: 'security/tautology',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Tautological Comparison',
      description:
        'Detects comparisons that are always true or always false (tautologies/contradictions). ' +
        'These indicate logic errors, dead code, or misunderstanding of Solidity types ' +
        '(e.g., unsigned integers cannot be negative).',
      recommendation:
        'Remove tautological comparisons or fix the logic. ' +
        'For unsigned types, remember they cannot be negative. ' +
        'Use appropriate type ranges and avoid comparing variables to themselves.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check binary operations
    if (node.type === 'BinaryOperation') {
      this.checkBinaryOperation(node, context);
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
   * Check binary operation for tautologies
   */
  private checkBinaryOperation(node: any, context: AnalysisContext): void {
    const operator = node.operator;
    const left = node.left;
    const right = node.right;

    // Check for x op x patterns (comparing variable to itself)
    if (this.areEqualExpressions(left, right)) {
      this.checkSelfComparison(node, operator, context);
      return;
    }

    // Check for unsigned comparisons with 0
    this.checkUnsignedZeroComparison(node, left, right, operator, context);

    // Check for unsigned comparisons beyond type max
    this.checkUnsignedMaxComparison(node, left, right, operator, context);
  }

  /**
   * Check if two expressions are structurally equal (same variable/expression)
   */
  private areEqualExpressions(left: any, right: any): boolean {
    if (!left || !right) {
      return false;
    }

    // Simple identifier comparison
    if (left.type === 'Identifier' && right.type === 'Identifier') {
      return left.name === right.name;
    }

    // Member access comparison (e.g., this.value == this.value)
    if (left.type === 'MemberAccess' && right.type === 'MemberAccess') {
      return (
        left.memberName === right.memberName &&
        this.areEqualExpressions(left.expression, right.expression)
      );
    }

    return false;
  }

  /**
   * Check self-comparison (x op x)
   */
  private checkSelfComparison(node: any, operator: string, context: AnalysisContext): void {
    const alwaysTrue = ['==', '>=', '<='];
    const alwaysFalse = ['!=', '>', '<'];

    if (alwaysTrue.includes(operator)) {
      this.reportIssue(
        node,
        context,
        `Tautological comparison: expression ${operator} itself is always true. ` +
          'This indicates a logic error or dead code. Remove or fix the comparison.'
      );
    } else if (alwaysFalse.includes(operator)) {
      this.reportIssue(
        node,
        context,
        `Contradictory comparison: expression ${operator} itself is always false. ` +
          'This indicates a logic error or dead code. Remove or fix the comparison.'
      );
    }
  }

  /**
   * Check unsigned type comparisons with 0
   */
  private checkUnsignedZeroComparison(
    node: any,
    left: any,
    right: any,
    operator: string,
    context: AnalysisContext
  ): void {
    // Check if comparing to 0
    const isZero = (n: any) => n && n.type === 'NumberLiteral' && n.number === '0';

    if (isZero(right) && operator === '>=') {
      if (this.isUnsignedType(left, context)) {
        this.reportIssue(
          node,
          context,
          'Tautological comparison: unsigned value >= 0 is always true. ' +
            'Unsigned integers cannot be negative. Remove this check.'
        );
      }
    } else if (isZero(left) && operator === '<=') {
      if (this.isUnsignedType(right, context)) {
        this.reportIssue(
          node,
          context,
          'Tautological comparison: 0 <= unsigned value is always true. ' +
            'Unsigned integers cannot be negative. Remove this check.'
        );
      }
    } else if (isZero(right) && operator === '<') {
      if (this.isUnsignedType(left, context)) {
        this.reportIssue(
          node,
          context,
          'Contradictory comparison: unsigned value < 0 is always false. ' +
            'Unsigned integers cannot be negative. Remove or fix this condition.'
        );
      }
    } else if (isZero(left) && operator === '>') {
      if (this.isUnsignedType(right, context)) {
        this.reportIssue(
          node,
          context,
          'Contradictory comparison: 0 > unsigned value is always false. ' +
            'Unsigned integers cannot be negative. Remove or fix this condition.'
        );
      }
    }
  }

  /**
   * Check unsigned type comparisons with type max
   */
  private checkUnsignedMaxComparison(
    node: any,
    left: any,
    right: any,
    operator: string,
    context: AnalysisContext
  ): void {
    // For small uint types, check if comparing beyond max
    if (
      right &&
      right.type === 'NumberLiteral' &&
      operator === '>' &&
      left &&
      left.type === 'Identifier'
    ) {
      const typeName = this.getVariableType(left, context);
      if (typeName && TautologyRule.TYPE_MAX[typeName]) {
        const maxValue = TautologyRule.TYPE_MAX[typeName];
        const compareValue = parseInt(right.number, 10);

        if (compareValue >= maxValue) {
          this.reportIssue(
            node,
            context,
            `Contradictory comparison: ${typeName} value cannot be > ${maxValue}. ` +
              `Maximum value for ${typeName} is ${maxValue}. This comparison is always false.`
          );
        }
      }
    }
  }

  /**
   * Check if expression is an unsigned type
   */
  private isUnsignedType(node: any, context: AnalysisContext): boolean {
    if (!node) {
      return false;
    }

    const typeName = this.getVariableType(node, context);
    return typeName ? typeName.startsWith('uint') : false;
  }

  /**
   * Get variable type name (simplified - checks common patterns)
   */
  private getVariableType(node: any, context: AnalysisContext): string | null {
    // This is a simplified implementation
    // In a full implementation, we'd track variable declarations

    if (node.type === 'Identifier') {
      // Look for variable declaration in AST
      const varDecl = this.findVariableDeclaration(node.name, context.ast);
      if (varDecl && varDecl.typeName) {
        return this.getTypeNameString(varDecl.typeName);
      }
    }

    return null;
  }

  /**
   * Find variable declaration in AST
   */
  private findVariableDeclaration(name: string, ast: any): any {
    if (!ast || typeof ast !== 'object') {
      return null;
    }

    if (ast.type === 'VariableDeclaration' && ast.name === name) {
      return ast;
    }

    for (const key in ast) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = ast[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          const result = this.findVariableDeclaration(name, child);
          if (result) {
            return result;
          }
        }
      } else if (value && typeof value === 'object') {
        const result = this.findVariableDeclaration(name, value);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  /**
   * Get type name as string
   */
  private getTypeNameString(typeName: any): string | null {
    if (!typeName) {
      return null;
    }

    if (typeName.type === 'ElementaryTypeName') {
      return typeName.name;
    }

    return null;
  }

  /**
   * Report a tautology issue
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
