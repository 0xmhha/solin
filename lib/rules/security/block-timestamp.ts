/**
 * Block Timestamp Security Rule
 *
 * Detects dangerous use of block.timestamp for time-sensitive operations.
 * Miners can manipulate timestamps within a 15-second window, making them
 * unsuitable for critical time-based logic, randomness, or exact time comparisons.
 *
 * @see https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/timestamp-dependence/
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects dangerous usage of block.timestamp in time-sensitive operations:
 * - Equality/inequality comparisons (==, !=)
 * - Modulo operations for randomness (%)
 * - Use in cryptographic hashing for randomness
 * - Critical access control based on exact timestamps
 *
 * Safe patterns:
 * - Range comparisons (>=, <=, >, <)
 * - Duration calculations (timestamp - other)
 * - Time additions (timestamp + duration)
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: Exact timestamp comparison
 * require(block.timestamp == deadline);
 *
 * // Bad: Randomness from timestamp
 * uint random = block.timestamp % 100;
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: Range comparison
 * require(block.timestamp >= unlockTime);
 *
 * // Good: Duration calculation
 * uint duration = block.timestamp - startTime;
 * ```
 */
export class BlockTimestampRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/block-timestamp',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Dangerous Block Timestamp Usage',
      description:
        'Detects dangerous use of block.timestamp in time-sensitive operations. ' +
        'Miners can manipulate block timestamps within a ~15 second window, making them ' +
        'unsuitable for randomness, exact time comparisons, or critical access control.',
      recommendation:
        'Use block.timestamp only with range comparisons (>=, <=, >, <). ' +
        'Avoid equality checks (==, !=) and modulo operations. ' +
        'For randomness, use Chainlink VRF or commit-reveal schemes. ' +
        'For time-sensitive operations, consider using block.number instead.',
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

    // Check for binary operations with timestamp
    if (node.type === 'BinaryOperation') {
      this.checkBinaryOperation(node, context);
    }

    // Check for function calls with timestamp (e.g., keccak256)
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
   * Check if binary operation involves dangerous timestamp usage
   */
  private checkBinaryOperation(node: any, context: AnalysisContext): void {
    const operator = node.operator;
    const left = node.left;
    const right = node.right;

    // Check if either operand is a timestamp
    const hasTimestamp =
      this.isTimestampExpression(left) || this.isTimestampExpression(right);

    if (!hasTimestamp) {
      return;
    }

    // Dangerous operators
    if (operator === '==') {
      this.reportIssue(
        node,
        context,
        'Dangerous equality comparison with block.timestamp. ' +
          'Exact timestamp matches are unreliable as miners can manipulate block times. ' +
          'Use >= or <= for time-based conditions.'
      );
    } else if (operator === '!=') {
      this.reportIssue(
        node,
        context,
        'Dangerous inequality comparison with block.timestamp. ' +
          'Exact timestamp checks are unreliable. Use range comparisons (>=, <=, >, <) instead.'
      );
    } else if (operator === '%') {
      this.reportIssue(
        node,
        context,
        'Dangerous use of block.timestamp with modulo operator for randomness. ' +
          'Miners can manipulate timestamps to influence outcomes. ' +
          'Consider using Chainlink VRF or commit-reveal schemes for randomness.'
      );
    }
    // Safe operators: >=, <=, >, <, -, +
  }

  /**
   * Check if function call uses timestamp for randomness
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    if (!node.expression) {
      return;
    }

    // Check for hashing functions (keccak256, sha256, etc.)
    const isHashFunction =
      (node.expression.type === 'Identifier' &&
        (node.expression.name === 'keccak256' ||
          node.expression.name === 'sha256' ||
          node.expression.name === 'sha3' ||
          node.expression.name === 'ripemd160')) ||
      (node.expression.type === 'MemberAccess' &&
        node.expression.memberName === 'keccak256');

    if (isHashFunction && this.containsTimestamp(node.arguments)) {
      this.reportIssue(
        node,
        context,
        'Using block.timestamp in cryptographic hashing for randomness. ' +
          'Miners can manipulate timestamps to influence hash outputs. ' +
          'Use Chainlink VRF or other secure randomness sources for critical logic.'
      );
    }
  }

  /**
   * Check if an expression is block.timestamp
   */
  private isTimestampExpression(node: any): boolean {
    if (!node) {
      return false;
    }

    // Check for block.timestamp
    if (node.type === 'MemberAccess') {
      const memberName = node.memberName;
      const expression = node.expression;

      if (
        memberName === 'timestamp' &&
        expression &&
        expression.type === 'Identifier' &&
        expression.name === 'block'
      ) {
        return true;
      }
    }

    // Check for 'now' keyword (deprecated)
    if (node.type === 'Identifier' && node.name === 'now') {
      return true;
    }

    // Handle parentheses
    if (node.type === 'TupleExpression') {
      if (node.components && Array.isArray(node.components)) {
        return node.components.some((component: any) =>
          this.isTimestampExpression(component)
        );
      }
    }

    return false;
  }

  /**
   * Check if arguments contain timestamp
   */
  private containsTimestamp(args: any[]): boolean {
    if (!args || !Array.isArray(args)) {
      return false;
    }

    return args.some((arg) => this.hasTimestampInTree(arg));
  }

  /**
   * Recursively check if node tree contains timestamp
   */
  private hasTimestampInTree(node: any): boolean {
    if (!node || typeof node !== 'object') {
      return false;
    }

    if (this.isTimestampExpression(node)) {
      return true;
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some((child) => this.hasTimestampInTree(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.hasTimestampInTree(value)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Report a timestamp-related issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
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
    });
  }
}
