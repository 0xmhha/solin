/**
 * Imports On Top Rule
 *
 * Requires import statements at the top of files
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that requires all import statements to be at the top of the file,
 * after the pragma directive. Imports should come before any contract,
 * interface, or library definitions.
 */
export class ImportsOnTopRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/imports-on-top',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Imports On Top',
      description:
        'Import statements must be placed at the top of the file, after pragma directives and before any contract definitions',
      recommendation:
        'Move all import statements to the top of the file, immediately after the pragma directive. This improves code organization and readability.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    const imports: Array<{ node: any; line: number }> = [];
    const definitions: Array<{ type: string; line: number }> = [];

    // Collect all imports and definitions with their line numbers
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (!node.loc) {
          return undefined;
        }

        const nodeAny = node as any;

        if (node.type === 'ImportDirective') {
          imports.push({
            node: nodeAny,
            line: node.loc.start.line,
          });
        } else if (
          node.type === 'ContractDefinition' ||
          node.type === 'InterfaceDefinition' ||
          node.type === 'LibraryDefinition'
        ) {
          definitions.push({
            type: node.type,
            line: node.loc.start.line,
          });
        }

        return undefined;
      },
    });

    // Check each import to see if it comes after any definitions
    for (const importItem of imports) {
      const hasDefinitionBefore = definitions.some(
        (def) => def.line < importItem.line,
      );

      if (hasDefinitionBefore) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Import statement should be at the top of the file, before any contract, interface, or library definitions`,
          location: {
            start: {
              line: importItem.node.loc.start.line,
              column: importItem.node.loc.start.column,
            },
            end: {
              line: importItem.node.loc.end.line,
              column: importItem.node.loc.end.column,
            },
          },
        });
      }
    }
  }
}
