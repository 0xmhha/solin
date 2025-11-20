/**
 * State Variable Default Security Rule
 *
 * Detects state variables explicitly initialized to their default values.
 * This is redundant and wastes gas during deployment. State variables are
 * automatically initialized to default values (0, false, address(0), etc.).
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#redundant-initializations
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects redundant default value initializations:
 * - uint/int = 0
 * - bool = false
 * - address = address(0)
 * - Other types = default value
 *
 * Does not flag:
 * - Non-default initializations
 * - Uninitialized variables (already default)
 *
 * @example Wasteful
 * ```solidity
 * // Bad: Redundant (wastes gas)
 * uint256 public value = 0;
 * bool public flag = false;
 * address public owner = address(0);
 * ```
 *
 * @example Efficient
 * ```solidity
 * // Good: Let defaults be implicit (saves gas)
 * uint256 public value;
 * bool public flag;
 * address public owner;
 *
 * // Or initialize to non-default:
 * uint256 public value = 100;
 * bool public flag = true;
 * ```
 */
export class StateVariableDefaultRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/state-variable-default',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Redundant Default Value',
      description:
        'Detects state variables explicitly initialized to their default values. ' +
        'This is redundant and wastes gas during deployment. State variables are ' +
        'automatically initialized to defaults (0, false, address(0), etc.).',
      recommendation:
        'Remove explicit initializations to default values. Let Solidity use implicit defaults. ' +
        'This saves deployment gas and reduces code clutter.',
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

    // Check state variable declarations
    if (node.type === 'StateVariableDeclaration') {
      this.checkStateVariable(node, context);
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
   * Check if state variable is initialized to default value
   */
  private checkStateVariable(node: any, context: AnalysisContext): void {
    if (!node.variables || !Array.isArray(node.variables)) {
      return;
    }

    for (const variable of node.variables) {
      if (!variable.expression) {
        continue; // No initialization
      }

      if (this.isDefaultValue(variable.expression, variable.typeName)) {
        this.reportIssue(
          variable,
          context,
          `State variable '${variable.name || 'unnamed'}' is initialized to its default value. ` +
            'This is redundant and wastes gas. Remove the explicit initialization.'
        );
      }
    }
  }

  /**
   * Check if expression is a default value
   */
  private isDefaultValue(expr: any, _typeName: any): boolean {
    if (!expr) {
      return false;
    }

    // Check for literal 0
    if (expr.type === 'NumberLiteral') {
      return expr.number === 0 || expr.number === '0';
    }

    // Check for false
    if (expr.type === 'BooleanLiteral') {
      return expr.value === false;
    }

    // Check for address(0)
    if (expr.type === 'FunctionCall') {
      const func = expr.expression;
      if (
        func &&
        func.type === 'ElementaryTypeName' &&
        func.name === 'address'
      ) {
        // Check if argument is 0
        if (expr.arguments && expr.arguments.length === 1) {
          const arg = expr.arguments[0];
          if (arg.type === 'NumberLiteral' && (arg.number === 0 || arg.number === '0')) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Report a state-variable-default issue
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
      metadata: {
        suggestion: 'Remove the explicit initialization to save deployment gas.',
      },
    });
  }
}
