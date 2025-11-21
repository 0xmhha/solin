/**
 * Boolean Constant Security Rule
 *
 * Detects comparisons with boolean constants (true/false) which are redundant
 * and indicate poor code quality or potential logic errors.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#boolean-equality
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects redundant boolean constant comparisons:
 * - flag == true (should be: flag)
 * - flag == false (should be: !flag)
 * - flag != true (should be: !flag)
 * - flag != false (should be: flag)
 *
 * These comparisons are redundant and reduce code readability.
 * They may also indicate a misunderstanding of boolean logic.
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: Redundant comparison
 * if (flag == true) { }
 * require(approved == false);
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: Direct boolean usage
 * if (flag) { }
 * require(!approved);
 * ```
 */
export class BooleanConstantRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/boolean-cst',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Boolean Constant Comparison',
      description:
        'Detects redundant comparisons with boolean constants (true/false). ' +
        'These comparisons are unnecessary and reduce code readability. ' +
        'They may indicate a misunderstanding of boolean logic or potential bugs.',
      recommendation:
        'Replace "x == true" with "x", "x == false" with "!x", ' +
        '"x != true" with "!x", and "x != false" with "x". ' +
        'Use boolean variables directly in conditions.',
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

    // Check for binary operations
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
   * Check if binary operation compares with boolean constant
   */
  private checkBinaryOperation(node: any, context: AnalysisContext): void {
    const operator = node.operator;
    const left = node.left;
    const right = node.right;

    // Only check equality and inequality operators
    if (operator !== '==' && operator !== '!=') {
      return;
    }

    const leftIsBool = this.isBooleanConstant(left);
    const rightIsBool = this.isBooleanConstant(right);

    // One side must be a boolean constant
    if (!leftIsBool && !rightIsBool) {
      return;
    }

    // Determine which side is the boolean and what value it has
    const boolValue = leftIsBool ? this.getBooleanValue(left) : this.getBooleanValue(right);

    // Build recommendation based on the comparison
    let recommendation: string;

    if (operator === '==' && boolValue === true) {
      recommendation = `Replace "expression == true" with just "expression"`;
    } else if (operator === '==' && boolValue === false) {
      recommendation = `Replace "expression == false" with "!expression"`;
    } else if (operator === '!=' && boolValue === true) {
      recommendation = `Replace "expression != true" with "!expression"`;
    } else {
      // operator === '!=' && boolValue === false
      recommendation = `Replace "expression != false" with just "expression"`;
    }

    this.reportIssue(
      node,
      context,
      `Redundant boolean constant comparison. ${recommendation}. ` +
        'Direct boolean usage is clearer and less error-prone.'
    );
  }

  /**
   * Check if node is a boolean constant (true or false)
   */
  private isBooleanConstant(node: any): boolean {
    if (!node) {
      return false;
    }

    // Check for BooleanLiteral
    if (node.type === 'BooleanLiteral') {
      return true;
    }

    // Check for true/false as identifiers (in older Solidity versions)
    if (node.type === 'Identifier' && (node.name === 'true' || node.name === 'false')) {
      return true;
    }

    return false;
  }

  /**
   * Get the value of a boolean constant node
   */
  private getBooleanValue(node: any): boolean {
    if (node.type === 'BooleanLiteral') {
      return node.value;
    }

    if (node.type === 'Identifier') {
      return node.name === 'true';
    }

    return false;
  }

  /**
   * Report a boolean constant issue
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
