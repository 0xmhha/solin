/**
 * Curly On Same Line Rule
 *
 * Enforces opening curly brace on same line
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces opening curly brace on same line:
 * - Opening brace should be on the same line as the declaration/statement
 * - Follows K&R style (Kernighan & Ritchie)
 * - Applies to contracts, functions, if statements, loops, etc.
 */
export class CurlyOnSameLineRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/curly-on-same-line',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Curly On Same Line',
      description:
        'Enforces K&R style brace placement: opening curly brace should be on the same line as the declaration/statement.',
      recommendation:
        'Place opening curly braces on the same line as the declaration. For example: `function test() public {` instead of placing the brace on a new line.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkBracePlacement(node, context);
        return undefined;
      },
    });
  }

  /**
   * Check if opening brace is on the same line
   */
  private checkBracePlacement(node: ASTNode, context: AnalysisContext): void {
    // Check various node types that have braces
    const nodeTypes = [
      'ContractDefinition',
      'FunctionDefinition',
      'IfStatement',
      'ForStatement',
      'WhileStatement',
      'DoWhileStatement',
    ];

    if (!nodeTypes.includes(node.type)) {
      return;
    }

    const nodeWithLoc = node as any;
    if (!nodeWithLoc.loc) {
      return;
    }

    // Get the body/block
    let bodyNode: any = null;

    if (node.type === 'ContractDefinition' || node.type === 'FunctionDefinition') {
      // For contracts and functions, check if body exists
      if (nodeWithLoc.body) {
        bodyNode = nodeWithLoc.body;
      }
    } else if (node.type === 'IfStatement') {
      // For if statements, check the true body
      if (nodeWithLoc.trueBody && nodeWithLoc.trueBody.type === 'Block') {
        bodyNode = nodeWithLoc.trueBody;
      }
    } else if (
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    ) {
      // For loops, check the body
      if (nodeWithLoc.body && nodeWithLoc.body.type === 'Block') {
        bodyNode = nodeWithLoc.body;
      }
    }

    if (!bodyNode || !bodyNode.loc) {
      return;
    }

    // Get the line where the node starts and where the body starts
    const declarationLine = nodeWithLoc.loc.start.line;
    const bodyStartLine = bodyNode.loc.start.line;

    // If body is on a new line, check if opening brace is on same line as declaration
    // We need to check the source to find the actual opening brace
    if (bodyStartLine > declarationLine) {
      // Find the line with the opening brace
      const braceLine = this.findOpeningBraceLine(context, declarationLine, bodyStartLine);

      if (braceLine && braceLine > declarationLine) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Opening curly brace should be on the same line as the ${this.getNodeTypeName(node.type)}.`,
          location: {
            start: {
              line: braceLine,
              column: 0,
            },
            end: {
              line: braceLine,
              column: context.getLineText(braceLine).length,
            },
          },
        });
      }
    }
  }

  /**
   * Find the line containing the opening brace
   */
  private findOpeningBraceLine(
    context: AnalysisContext,
    startLine: number,
    endLine: number,
  ): number | null {
    for (let line = startLine; line <= endLine; line++) {
      const lineText = context.getLineText(line);
      if (lineText.trim().startsWith('{')) {
        return line;
      }
    }
    return null;
  }

  /**
   * Get human-readable name for node type
   */
  private getNodeTypeName(nodeType: string): string {
    switch (nodeType) {
      case 'ContractDefinition':
        return 'contract declaration';
      case 'FunctionDefinition':
        return 'function declaration';
      case 'IfStatement':
        return 'if statement';
      case 'ForStatement':
        return 'for loop';
      case 'WhileStatement':
        return 'while loop';
      case 'DoWhileStatement':
        return 'do-while loop';
      default:
        return 'declaration';
    }
  }
}
