/**
 * Constructor Above Modifiers Rule
 *
 * Enforces constructor placement before modifier definitions.
 * Follows common Solidity style conventions for member ordering.
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces constructor to be placed before modifier definitions.
 * This follows the Solidity style guide recommendation for member ordering.
 */
export class ConstructorAboveModifiersRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/constructor-above-modifiers',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Constructor Above Modifiers',
      description:
        'Enforces that the constructor is placed before modifier definitions within a contract. ' +
        'This follows the Solidity style guide recommendations for member ordering.',
      recommendation:
        'Place the constructor before any modifier definitions in your contract. ' +
        'The recommended order is: state variables, events, constructor, modifiers, functions.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        // Check each contract definition
        if (
          node.type === 'ContractDefinition' ||
          node.type === 'InterfaceDefinition' ||
          node.type === 'LibraryDefinition'
        ) {
          this.checkContractOrdering(node, context);
        }

        return undefined;
      },
    });
  }

  /**
   * Check ordering of constructor and modifiers within a contract
   */
  private checkContractOrdering(contractNode: ASTNode, context: AnalysisContext): void {
    const subNodes = (contractNode as any).subNodes;

    if (!subNodes || !Array.isArray(subNodes)) {
      return;
    }

    let constructorLine: number | null = null;
    const modifierLines: number[] = [];

    // Find constructor and modifiers
    for (const node of subNodes) {
      if (!node.loc) {
        continue;
      }

      if (node.type === 'FunctionDefinition' && (node as any).isConstructor) {
        constructorLine = node.loc.start.line;
      } else if (node.type === 'ModifierDefinition') {
        modifierLines.push(node.loc.start.line);
      }
    }

    // Check if constructor exists and if any modifiers are defined before it
    if (constructorLine !== null && modifierLines.length > 0) {
      const modifiersBeforeConstructor = modifierLines.filter(line => line < constructorLine);

      if (modifiersBeforeConstructor.length > 0) {
        // Find the constructor node to report the issue
        for (const node of subNodes) {
          if (node.type === 'FunctionDefinition' && (node as any).isConstructor && node.loc) {
            context.report({
              ruleId: this.metadata.id,
              severity: this.metadata.severity,
              category: this.metadata.category,
              message: `Constructor should be placed before modifier definitions. Found ${modifiersBeforeConstructor.length} modifier(s) defined before the constructor.`,
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
                suggestion:
                  'Move the constructor definition to appear before any modifier definitions.',
              },
            });
            break;
          }
        }
      }
    }
  }
}
