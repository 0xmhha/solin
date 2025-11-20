/**
 * One Contract Per File Rule
 *
 * Enforces one contract/interface/library per file
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces having only one contract, interface, or library per file.
 * This improves code organization and makes it easier to locate specific contracts.
 */
export class OneContractPerFileRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/one-contract-per-file',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'One Contract Per File',
      description:
        'Each file should contain only one contract, interface, or library definition',
      recommendation:
        'Split multiple contract definitions into separate files. This improves code organization, makes it easier to locate specific contracts, and follows best practices for maintainability.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    const definitions: Array<{ type: string; name: string; node: any }> = [];

    // Collect all top-level contract/interface/library definitions
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        const nodeAny = node as any;

        if (
          node.type === 'ContractDefinition' ||
          node.type === 'InterfaceDefinition' ||
          node.type === 'LibraryDefinition'
        ) {
          definitions.push({
            type: this.getDefinitionTypeName(node.type),
            name: nodeAny.name || 'unnamed',
            node: nodeAny,
          });
        }

        return undefined;
      },
    });

    // Report issue if more than one definition exists
    if (definitions.length > 1) {
      const names = definitions.map((def) => def.name).join(', ');
      const firstDefinition = definitions[0];

      if (firstDefinition && firstDefinition.node.loc) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `File contains ${definitions.length} contract/interface/library definitions (${names}). Each file should contain only one contract, interface, or library.`,
          location: {
            start: {
              line: firstDefinition.node.loc.start.line,
              column: firstDefinition.node.loc.start.column,
            },
            end: {
              line: firstDefinition.node.loc.end.line,
              column: firstDefinition.node.loc.end.column,
            },
          },
          metadata: {
            suggestion: `Split into ${definitions.length} separate files, one for each definition`,
          },
        });
      }
    }
  }

  /**
   * Get human-readable name for definition type
   */
  private getDefinitionTypeName(type: string): string {
    switch (type) {
      case 'ContractDefinition':
        return 'contract';
      case 'InterfaceDefinition':
        return 'interface';
      case 'LibraryDefinition':
        return 'library';
      default:
        return 'definition';
    }
  }
}
