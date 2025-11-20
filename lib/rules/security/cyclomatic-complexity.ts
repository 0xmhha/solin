/**
 * Cyclomatic Complexity Security Rule
 *
 * Detects functions with high cyclomatic complexity (many decision points).
 * High complexity indicates functions that are hard to test, understand,
 * and maintain. Complex functions are more likely to contain bugs.
 *
 * @see https://en.wikipedia.org/wiki/Cyclomatic_complexity
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects functions with high cyclomatic complexity:
 * - Complexity > 11 (standard threshold)
 * - Counts decision points: if, while, for, &&, ||, ?:, case
 * - Base complexity is 1
 *
 * Does not flag:
 * - Simple functions with low complexity
 * - Functions with clear control flow
 *
 * @example Problematic
 * ```solidity
 * // Bad: Too complex (hard to test and maintain)
 * function complex(uint x) public {
 *   if (x == 1) { ... }
 *   else if (x == 2) { ... }
 *   else if (x == 3) { ... }
 *   // ... many more conditions
 * }
 * ```
 *
 * @example Better
 * ```solidity
 * // Good: Split into smaller functions
 * function handleCase1() private { ... }
 * function handleCase2() private { ... }
 * function simple(uint x) public {
 *   if (x == 1) handleCase1();
 *   else if (x == 2) handleCase2();
 * }
 * ```
 */
export class CyclomaticComplexityRule extends AbstractRule {
  private static readonly MAX_COMPLEXITY = 11;

  constructor() {
    super({
      id: 'security/cyclomatic-complexity',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'High Cyclomatic Complexity',
      description:
        'Detects functions with high cyclomatic complexity (more than 11 decision points). ' +
        'Complex functions are harder to understand, test, and maintain. They are more ' +
        'likely to contain bugs and security vulnerabilities.',
      recommendation:
        'Refactor complex functions into smaller, focused functions. ' +
        'Extract decision logic into separate helper functions. ' +
        'Consider using lookup tables or polymorphism to reduce conditional complexity.',
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

    // Check functions
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
   * Check function complexity
   */
  private checkFunction(node: any, context: AnalysisContext): void {
    const complexity = this.calculateComplexity(node);

    if (complexity > CyclomaticComplexityRule.MAX_COMPLEXITY) {
      const functionName = node.name || 'anonymous';
      this.reportIssue(
        node,
        context,
        complexity,
        `Function '${functionName}' has cyclomatic complexity of ${complexity}, ` +
          `which exceeds the recommended maximum of ${CyclomaticComplexityRule.MAX_COMPLEXITY}. ` +
          `Consider refactoring into smaller functions.`
      );
    }
  }

  /**
   * Calculate cyclomatic complexity of a function
   */
  private calculateComplexity(node: any): number {
    let complexity = 1; // Base complexity

    const countDecisionPoints = (n: any): void => {
      if (!n || typeof n !== 'object') {
        return;
      }

      // Count decision points
      if (
        n.type === 'IfStatement' ||
        n.type === 'WhileStatement' ||
        n.type === 'ForStatement' ||
        n.type === 'DoWhileStatement' ||
        n.type === 'ConditionalExpression' // ternary operator
      ) {
        complexity++;
      }

      // Count logical operators
      if (n.type === 'BinaryOperation') {
        if (n.operator === '&&' || n.operator === '||') {
          complexity++;
        }
      }

      // Recursively count in all child nodes
      for (const key in n) {
        if (key === 'loc' || key === 'range') {
          continue;
        }

        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(child => countDecisionPoints(child));
        } else if (value && typeof value === 'object') {
          countDecisionPoints(value);
        }
      }
    };

    countDecisionPoints(node.body);
    return complexity;
  }

  /**
   * Report a cyclomatic-complexity issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
    complexity: number,
    message: string
  ): void {
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
      metadata: {
        suggestion: `Current complexity: ${complexity}. Target: ≤${CyclomaticComplexityRule.MAX_COMPLEXITY}. Refactor into ${Math.ceil(complexity / 6)} smaller functions.`,
      },
    });
  }
}
