/**
 * Two Lines Top Level Rule
 *
 * Requires exactly two blank lines between contract/library/interface definitions.
 * Helps visually separate major code sections.
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces two blank lines between top-level definitions
 * (contracts, interfaces, libraries).
 */
export class TwoLinesTopLevelRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/two-lines-top-level',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Two Lines Between Top Level Definitions',
      description:
        'Requires exactly two blank lines between contract, interface, and library definitions. ' +
        'This provides clear visual separation between major code sections.',
      recommendation:
        'Maintain exactly two blank lines between contract, interface, and library definitions. ' +
        'This helps distinguish between major code sections and improves readability.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    const definitions: Array<{ type: string; line: number; endLine: number }> = [];

    // Collect contract, interface, and library definitions
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (!node.loc) {
          return undefined;
        }

        // Only check top-level definitions
        if (
          node.type === 'ContractDefinition' ||
          node.type === 'InterfaceDefinition' ||
          node.type === 'LibraryDefinition'
        ) {
          definitions.push({
            type: node.type,
            line: node.loc.start.line,
            endLine: node.loc.end.line,
          });
        }

        return undefined;
      },
    });

    // Sort by line number
    definitions.sort((a, b) => a.line - b.line);

    // Check spacing between consecutive definitions (should be exactly 2 blank lines)
    for (let i = 0; i < definitions.length - 1; i++) {
      const current = definitions[i]!;
      const next = definitions[i + 1]!;

      const blankLines = next.line - current.endLine - 1;

      if (blankLines !== 2) {
        const message =
          blankLines < 2
            ? `Expected two blank lines between top-level definitions, but found ${blankLines}. Add ${2 - blankLines} more blank line(s).`
            : `Expected two blank lines between top-level definitions, but found ${blankLines}. Remove ${blankLines - 2} blank line(s).`;

        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message,
          location: {
            start: {
              line: next.line,
              column: 0,
            },
            end: {
              line: next.line,
              column: 1,
            },
          },
          metadata: {
            suggestion:
              'Maintain exactly two blank lines between contract, interface, and library definitions.',
          },
        });
      }
    }
  }
}
