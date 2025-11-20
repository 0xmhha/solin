/**
 * Dead Code Security Rule
 *
 * Detects unreachable code after return, revert, throw, etc.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects unreachable (dead) code:
 * - Code after return, revert, throw statements
 * - Code after require(false) or assert(false)
 * - Helps identify potential bugs and cleanup opportunities
 */
export class DeadCode extends AbstractRule {
  constructor() {
    super({
      id: 'security/dead-code',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Unreachable code detected',
      description:
        'Detects unreachable code that appears after return, revert, throw, or unconditional assertion failures. Dead code may indicate logic errors or unnecessary clutter.',
      recommendation:
        'Remove unreachable code to improve code clarity and potentially identify logic errors.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find dead code
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check function bodies for dead code
    if (node.type === 'FunctionDefinition' && node.body) {
      this.checkBlock(node.body, context);
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
   * Check a block for dead code
   */
  private checkBlock(block: any, context: AnalysisContext): void {
    if (!block || !block.statements || !Array.isArray(block.statements)) {
      return;
    }

    const statements = block.statements;

    for (let i = 0; i < statements.length - 1; i++) {
      const stmt = statements[i];

      if (this.isTerminatingStatement(stmt)) {
        // Next statement is unreachable
        const nextStmt = statements[i + 1];
        if (nextStmt && nextStmt.loc) {
          this.reportIssue(nextStmt, context);
        }
        break; // No need to check further
      }
    }

    // Recursively check nested blocks
    for (const stmt of statements) {
      this.checkNestedBlocks(stmt, context);
    }
  }

  /**
   * Check if a statement terminates execution
   */
  private isTerminatingStatement(stmt: any): boolean {
    if (!stmt) {
      return false;
    }

    // Return statement
    if (stmt.type === 'ReturnStatement') {
      return true;
    }

    // Throw statement
    if (stmt.type === 'ThrowStatement') {
      return true;
    }

    // Revert statement
    if (stmt.type === 'ExpressionStatement' && stmt.expression) {
      const expr = stmt.expression;

      // revert() or revert("message")
      if (expr.type === 'FunctionCall' && expr.expression) {
        const callee = expr.expression;
        if (callee.type === 'Identifier' && callee.name === 'revert') {
          return true;
        }
      }
    }

    // require(false) or assert(false)
    if (stmt.type === 'ExpressionStatement' && stmt.expression) {
      const expr = stmt.expression;

      if (expr.type === 'FunctionCall' && expr.expression && expr.arguments) {
        const callee = expr.expression;
        const args = expr.arguments;

        if (callee.type === 'Identifier' &&
            (callee.name === 'require' || callee.name === 'assert') &&
            args.length > 0) {
          const firstArg = args[0];

          // Check for literal false
          if (firstArg.type === 'BooleanLiteral' && firstArg.value === false) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check nested blocks within a statement
   */
  private checkNestedBlocks(stmt: any, context: AnalysisContext): void {
    if (!stmt) {
      return;
    }

    // Check if/else blocks
    if (stmt.type === 'IfStatement') {
      if (stmt.trueBody) {
        this.checkBlock(stmt.trueBody, context);
      }
      if (stmt.falseBody) {
        this.checkBlock(stmt.falseBody, context);
      }
    }

    // Check while/for loops
    if (stmt.type === 'WhileStatement' || stmt.type === 'ForStatement') {
      if (stmt.body) {
        this.checkBlock(stmt.body, context);
      }
    }

    // Check do-while loops
    if (stmt.type === 'DoWhileStatement') {
      if (stmt.body) {
        this.checkBlock(stmt.body, context);
      }
    }
  }

  /**
   * Report issue for dead code
   */
  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        'Unreachable code detected. This code will never be executed and should be removed.',
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
