/**
 * Unchecked Calls Security Rule
 *
 * Detects unchecked return values from low-level calls
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects unchecked low-level calls:
 * - .call(), .delegatecall(), .send() must have return values checked
 * - Prevents silent failures in fund transfers
 * - Use require(), assert(), or if statements to validate
 */
export class UncheckedCallsRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/unchecked-calls',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Unchecked Low-Level Calls',
      description:
        'Low-level calls (.call, .delegatecall, .send) must have their return values checked',
      recommendation:
        'Always check the return value of low-level calls using require(), assert(), or if statements. Use .transfer() instead of .send() if you want automatic revert on failure.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST and check every node
    this.walkAst(context.ast, context, null);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext, parent: any): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if this is a low-level call that needs checking
    if (this.isLowLevelCall(node)) {
      this.checkLowLevelCall(node, parent, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context, node));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context, node);
      }
    }
  }

  /**
   * Check if a node is a low-level call (.call, .delegatecall, .send)
   */
  private isLowLevelCall(node: any): boolean {
    // Check for FunctionCall node
    if (node.type !== 'FunctionCall') {
      return false;
    }

    // Check if the expression is a MemberAccess
    const expression = node.expression;
    if (!expression || expression.type !== 'MemberAccess') {
      return false;
    }

    // Check if the member name is one of the low-level calls
    const memberName = expression.memberName;
    return memberName === 'call' || memberName === 'delegatecall' || memberName === 'send';
  }

  /**
   * Check if a low-level call has its return value checked
   */
  private checkLowLevelCall(node: any, parent: any, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    const callType = node.expression.memberName;

    // Check if the return value is being used
    // If parent is ExpressionStatement, the return value is ignored
    if (parent && parent.type === 'ExpressionStatement') {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Unchecked ${callType}() call. The return value must be checked with require(), assert(), or if statement.`,
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
      return;
    }

    // If parent is not ExpressionStatement, the return value is likely being used
    // This includes:
    // - VariableDeclarationStatement (bool success = call())
    // - BinaryOperation (assignment or comparison)
    // - ReturnStatement
    // - FunctionCall arguments (require(call()))
    // We consider these as "checked" or at least "used"
  }
}
