/**
 * Array Declaration Rule
 *
 * Enforces consistent array declaration style.
 * Prefers type[] over array<type> style (which is not valid in Solidity anyway).
 * This rule mainly validates that array declarations follow Solidity conventions.
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces consistent array declaration style.
 * Ensures arrays are declared using the standard Solidity syntax: type[]
 */
export class ArrayDeclarationRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/array-declaration',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Array Declaration Style',
      description:
        'Enforces consistent array declaration style. ' +
        'Arrays should be declared using the standard Solidity syntax (e.g., uint256[] instead of unconventional formats).',
      recommendation:
        'Use the standard Solidity array declaration syntax: type[] for dynamic arrays and type[size] for fixed-size arrays. ' +
        'Ensure consistent spacing around brackets.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        // Check array type declarations
        if (node.type === 'ArrayTypeName') {
          this.checkArrayDeclaration(node, context);
        }

        return undefined;
      },
    });
  }

  /**
   * Check array declaration for style consistency
   */
  private checkArrayDeclaration(node: ASTNode, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    // Get the line text to check for spacing issues in raw source
    const lineText = context.getLineText(node.loc.start.line);
    const lineSubstring = lineText.substring(
      node.loc.start.column,
      Math.min(node.loc.end.column + 10, lineText.length),
    );

    // Check for unusual spacing (e.g., "uint256 []" instead of "uint256[]")
    // Look for type followed by space(s) and bracket
    if (/\w\s+\[/.test(lineSubstring)) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Avoid spaces before array brackets. Use 'type[]' instead of 'type []'.`,
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
          suggestion: lineSubstring.replace(/(\w)\s+\[/g, '$1['),
        },
      });
    }
  }
}
