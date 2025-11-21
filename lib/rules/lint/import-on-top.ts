/**
 * Import On Top Rule
 *
 * Strictly requires all import statements at the top of the file.
 * Complement to imports-on-top with stricter enforcement.
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that strictly enforces all import statements to be at the file top.
 * No code definitions should come before imports (except pragma).
 */
export class ImportOnTopRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/import-on-top',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Import On Top',
      description:
        'Requires all import statements to be placed at the top of the file, ' +
        'immediately after pragma directives and before any contract, interface, or library definitions.',
      recommendation:
        'Move all import statements to the top of the file, right after the pragma directive. ' +
        'This improves code organization and makes dependencies immediately visible.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    const imports: Array<{ node: any; line: number }> = [];
    const definitions: Array<{ type: string; line: number; name: string }> = [];

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
            name: nodeAny.name || 'unnamed',
          });
        }

        return undefined;
      },
    });

    // Check each import - none should come after any definition
    for (const importItem of imports) {
      const definitionsBefore = definitions.filter(def => def.line < importItem.line);

      if (definitionsBefore.length > 0) {
        const defType = definitionsBefore[0]!.type.replace('Definition', '').toLowerCase();

        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Import statement must be at the top of the file. Found after ${defType} definition.`,
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
          metadata: {
            suggestion:
              'Move this import statement to the top of the file, after the pragma directive.',
          },
        });
      }
    }
  }
}
