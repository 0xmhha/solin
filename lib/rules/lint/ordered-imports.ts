/**
 * Ordered Imports Rule
 *
 * Enforces alphabetical ordering of imports
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces alphabetical ordering of import statements.
 * Improves code organization and makes it easier to find imports.
 */
export class OrderedImportsRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/ordered-imports',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Ordered Imports',
      description: 'Import statements should be ordered alphabetically',
      recommendation:
        'Order import statements alphabetically by their path. This improves code organization and makes it easier to find specific imports.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    const imports: Array<{ path: string; node: any; line: number }> = [];

    // Collect all imports with their paths and line numbers
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'ImportDirective') {
          const importNode = node as any;
          if (importNode.path && importNode.loc) {
            imports.push({
              path: importNode.path,
              node: importNode,
              line: importNode.loc.start.line,
            });
          }
        }
        return undefined;
      },
    });

    // Check if imports are in alphabetical order
    for (let i = 1; i < imports.length; i++) {
      const prevImport = imports[i - 1];
      const currentImport = imports[i];

      if (prevImport && currentImport) {
        // Compare paths alphabetically (case-sensitive)
        if (prevImport.path.localeCompare(currentImport.path) > 0) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `Import '${currentImport.path}' should come before '${prevImport.path}' (alphabetical order)`,
            location: {
              start: {
                line: currentImport.node.loc.start.line,
                column: currentImport.node.loc.start.column,
              },
              end: {
                line: currentImport.node.loc.end.line,
                column: currentImport.node.loc.end.column,
              },
            },
            metadata: {
              suggestion: `Reorder imports alphabetically`,
            },
          });
        }
      }
    }
  }
}
