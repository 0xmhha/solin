/**
 * No Mixed Declaration Rule
 *
 * Disallows mixing variable declarations and statements
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces grouping variable declarations at the beginning of blocks:
 * - All variable declarations should be at the start of a block
 * - Prevents mixing declarations with statements for better readability
 */
export class NoMixedDeclarationRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/no-mixed-declaration',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'No Mixed Declaration',
      description:
        'Disallows mixing variable declarations and statements. All declarations should be grouped at the beginning of blocks for better readability.',
      recommendation:
        'Group all variable declarations at the beginning of each block before any statements.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkBlock(node, context);
        return undefined;
      },
    });
  }

  /**
   * Check if a block has mixed declarations and statements
   */
  private checkBlock(node: ASTNode, context: AnalysisContext): void {
    // Check function bodies
    if (node.type === 'FunctionDefinition') {
      const body = (node as any).body;
      if (body && body.type === 'Block') {
        this.checkStatements(body, context);
      }
    }

    // Check standalone blocks
    if (node.type === 'Block') {
      this.checkStatements(node, context);
    }
  }

  /**
   * Check statements in a block for mixed declarations
   */
  private checkStatements(blockNode: any, context: AnalysisContext): void {
    const statements = blockNode.statements || [];

    if (statements.length === 0) {
      return;
    }

    let foundNonDeclaration = false;

    for (const statement of statements) {
      const isDeclaration = this.isVariableDeclaration(statement);

      if (!isDeclaration) {
        foundNonDeclaration = true;
      } else if (foundNonDeclaration && isDeclaration) {
        // Found a declaration after a non-declaration statement
        if (statement.loc) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message:
              'Variable declaration should not be mixed with statements. Group all declarations at the beginning of the block.',
            location: {
              start: {
                line: statement.loc.start.line,
                column: statement.loc.start.column,
              },
              end: {
                line: statement.loc.end.line,
                column: statement.loc.end.column,
              },
            },
          });
        }
      }
    }
  }

  /**
   * Check if a statement is a variable declaration
   */
  private isVariableDeclaration(statement: any): boolean {
    return (
      statement.type === 'VariableDeclarationStatement' ||
      statement.type === 'VariableDeclaration'
    );
  }
}
