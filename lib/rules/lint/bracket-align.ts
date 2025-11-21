/**
 * Bracket Align Rule
 *
 * Enforces consistent bracket alignment
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces consistent bracket alignment:
 * - Opening and closing brackets should be aligned
 * - Closing bracket should match the indentation of the line with opening bracket
 */
export class BracketAlignRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/bracket-align',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Bracket Align',
      description:
        'Enforces consistent bracket alignment for better code readability. Opening and closing brackets should have matching indentation.',
      recommendation:
        'Align closing brackets with the same indentation as the line containing the opening bracket.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkBracketAlignment(node, context);
        return undefined;
      },
    });
  }

  /**
   * Check bracket alignment for blocks
   */
  private checkBracketAlignment(node: ASTNode, context: AnalysisContext): void {
    // Check various block types
    const blockTypes = [
      'Block',
      'ContractDefinition',
      'FunctionDefinition',
      'IfStatement',
      'ForStatement',
      'WhileStatement',
    ];

    if (!blockTypes.includes(node.type)) {
      return;
    }

    const nodeWithLoc = node as any;
    if (!nodeWithLoc.loc) {
      return;
    }

    const startLine = nodeWithLoc.loc.start.line;
    const endLine = nodeWithLoc.loc.end.line;

    // Skip single-line blocks
    if (startLine === endLine) {
      return;
    }

    // Get the source lines
    const startLineText = context.getLineText(startLine);
    const endLineText = context.getLineText(endLine);

    // Calculate indentation (number of leading spaces/tabs)
    const startIndent = this.getIndentation(startLineText);
    const endIndent = this.getIndentation(endLineText);

    // Check if closing bracket has same indentation as opening line
    // Allow some flexibility for different styles
    if (Math.abs(startIndent - endIndent) > 2) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Closing bracket on line ${endLine} is not aligned with opening bracket on line ${startLine}.`,
        location: {
          start: {
            line: endLine,
            column: 0,
          },
          end: {
            line: endLine,
            column: endLineText.length,
          },
        },
      });
    }
  }

  /**
   * Get indentation level (number of leading whitespace characters)
   */
  private getIndentation(line: string): number {
    const match = line.match(/^(\s*)/);
    return match && match[1] ? match[1].length : 0;
  }
}
