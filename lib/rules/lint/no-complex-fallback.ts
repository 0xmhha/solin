/**
 * No Complex Fallback Rule
 *
 * Disallows complex logic in fallback functions
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that disallows complex logic in fallback/receive functions:
 * - Should only emit events or be empty
 * - No loops, conditionals, function calls, or state modifications
 * - Keeps gas costs predictable and prevents reentrancy issues
 */
export class NoComplexFallbackRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/no-complex-fallback',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'No Complex Fallback',
      description:
        'Disallows complex logic in fallback and receive functions. These functions should be simple to avoid unexpected gas costs and reentrancy issues.',
      recommendation:
        'Keep fallback and receive functions simple. Only emit events or keep them empty. Move complex logic to dedicated functions.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkFallbackFunction(node, context);
        return undefined;
      },
    });
  }

  /**
   * Check if function is fallback/receive and has complex logic
   */
  private checkFallbackFunction(node: ASTNode, context: AnalysisContext): void {
    if (node.type !== 'FunctionDefinition') {
      return;
    }

    const func = node as any;

    // Check if this is a fallback or receive function
    const isFallback = func.isFallback || func.name === 'fallback';
    const isReceive = func.isReceiveEther || func.name === 'receive';

    if (!isFallback && !isReceive) {
      return;
    }

    // Check body for complex statements
    const body = func.body;
    if (!body || !body.statements) {
      return;
    }

    const functionType = isFallback ? 'fallback' : 'receive';

    for (const statement of body.statements) {
      if (this.isComplexStatement(statement)) {
        if (func.loc) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `${functionType} function contains complex logic. Keep it simple to avoid unexpected gas costs and reentrancy issues.`,
            location: {
              start: {
                line: func.loc.start.line,
                column: func.loc.start.column,
              },
              end: {
                line: func.loc.end.line,
                column: func.loc.end.column,
              },
            },
          });
        }
        return;
      }
    }
  }

  /**
   * Check if a statement is considered complex
   */
  private isComplexStatement(statement: any): boolean {
    if (!statement || !statement.type) {
      return false;
    }

    // Allow only EmitStatement (event emissions)
    if (statement.type === 'EmitStatement' || statement.type === 'EventEmitStatement') {
      return false;
    }

    // Everything else is considered complex
    // Including: IfStatement, ForStatement, WhileStatement, ExpressionStatement,
    // FunctionCall, assignments, etc.
    const complexTypes = [
      'IfStatement',
      'ForStatement',
      'WhileStatement',
      'DoWhileStatement',
      'ExpressionStatement',
      'VariableDeclarationStatement',
      'ReturnStatement',
      'Block',
    ];

    return complexTypes.includes(statement.type);
  }
}
