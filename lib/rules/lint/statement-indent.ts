/**
 * Statement Indent Rule
 *
 * Enforces consistent statement indentation within functions and blocks.
 * Checks that statements at the same level have consistent indentation.
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces consistent statement indentation.
 * Ensures statements at the same block level use consistent indentation.
 */
export class StatementIndentRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/statement-indent',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Statement Indentation',
      description:
        'Enforces consistent indentation for statements within blocks. ' +
        'Statements at the same nesting level should have the same indentation.',
      recommendation:
        'Ensure all statements within the same block have consistent indentation. ' +
        'Use a consistent number of spaces (typically 4) for each indentation level.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        // Check blocks and statements
        if (node.type === 'Block' && (node as any).statements) {
          this.checkBlockStatements(node, context);
        }

        return undefined;
      },
    });
  }

  /**
   * Check statements within a block for consistent indentation
   */
  private checkBlockStatements(blockNode: ASTNode, context: AnalysisContext): void {
    const statements = (blockNode as any).statements as ASTNode[];

    if (!statements || statements.length === 0) {
      return;
    }

    // Track indentation of each statement
    const indentations: Array<{ line: number; indent: number; node: ASTNode }> = [];

    for (const stmt of statements) {
      if (!stmt.loc) {
        continue;
      }

      const line = stmt.loc.start.line;
      const lineText = context.getLineText(line);
      const indent = lineText.length - lineText.trimStart().length;

      indentations.push({ line, indent, node: stmt });
    }

    // Find the most common indentation (expected)
    const indentCounts = new Map<number, number>();
    for (const { indent } of indentations) {
      indentCounts.set(indent, (indentCounts.get(indent) || 0) + 1);
    }

    let expectedIndent = 0;
    let maxCount = 0;
    for (const [indent, count] of indentCounts) {
      if (count > maxCount) {
        maxCount = count;
        expectedIndent = indent;
      }
    }

    // Report statements with different indentation
    for (const { indent, node } of indentations) {
      if (indent !== expectedIndent && node.loc) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Statement has inconsistent indentation. Expected ${expectedIndent} spaces but found ${indent} spaces.`,
          location: {
            start: {
              line: node.loc.start.line,
              column: 0,
            },
            end: {
              line: node.loc.start.line,
              column: indent,
            },
          },
        });
      }
    }
  }
}
