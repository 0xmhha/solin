/**
 * Separate By One Line Rule
 *
 * Enforces exactly one blank line between top-level declarations.
 * Helps maintain consistent spacing and readability.
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces one blank line between top-level declarations.
 * Applies to imports, contracts, interfaces, libraries, and functions.
 */
export class SeparateByOneLineRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/separate-by-one-line',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Separate By One Line',
      description:
        'Enforces exactly one blank line between top-level declarations such as imports, ' +
        'contracts, interfaces, libraries, and function definitions.',
      recommendation:
        'Maintain exactly one blank line between top-level declarations. ' +
        'This improves code readability and follows common Solidity style conventions.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    const declarations: Array<{ type: string; line: number; endLine: number }> = [];

    // Collect top-level declarations
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (!node.loc) {
          return undefined;
        }

        // Top-level elements to check
        if (
          node.type === 'ImportDirective' ||
          node.type === 'ContractDefinition' ||
          node.type === 'InterfaceDefinition' ||
          node.type === 'LibraryDefinition' ||
          node.type === 'PragmaDirective'
        ) {
          declarations.push({
            type: node.type,
            line: node.loc.start.line,
            endLine: node.loc.end.line,
          });
        }

        // Also check function spacing within contracts
        if (
          node.type === 'ContractDefinition' ||
          node.type === 'InterfaceDefinition' ||
          node.type === 'LibraryDefinition'
        ) {
          this.checkContractMemberSpacing(node, context);
        }

        return undefined;
      },
    });

    // Sort by line number
    declarations.sort((a, b) => a.line - b.line);

    // Check spacing between consecutive declarations
    for (let i = 0; i < declarations.length - 1; i++) {
      const current = declarations[i]!;
      const next = declarations[i + 1]!;

      const blankLines = next.line - current.endLine - 1;

      if (blankLines === 0) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Missing blank line between declarations. Add one blank line for better readability.`,
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
            suggestion: 'Add exactly one blank line between these declarations.',
          },
        });
      } else if (blankLines > 1) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Too many blank lines between declarations (found ${blankLines}). Use exactly one blank line.`,
          location: {
            start: {
              line: current.endLine + 1,
              column: 0,
            },
            end: {
              line: next.line,
              column: 0,
            },
          },
          metadata: {
            suggestion: 'Reduce to exactly one blank line between declarations.',
          },
        });
      }
    }
  }

  /**
   * Check spacing between contract members (functions, modifiers, etc.)
   */
  private checkContractMemberSpacing(contractNode: ASTNode, context: AnalysisContext): void {
    const subNodes = (contractNode as any).subNodes;

    if (!subNodes || !Array.isArray(subNodes)) {
      return;
    }

    const members: Array<{ line: number; endLine: number }> = [];

    for (const node of subNodes) {
      if (!node.loc) {
        continue;
      }

      // Check functions, modifiers, events, state variables
      if (
        node.type === 'FunctionDefinition' ||
        node.type === 'ModifierDefinition' ||
        node.type === 'EventDefinition' ||
        node.type === 'StateVariableDeclaration'
      ) {
        members.push({
          line: node.loc.start.line,
          endLine: node.loc.end.line,
        });
      }
    }

    // Sort by line number
    members.sort((a, b) => a.line - b.line);

    // Check spacing between consecutive members
    for (let i = 0; i < members.length - 1; i++) {
      const current = members[i]!;
      const next = members[i + 1]!;

      const blankLines = next.line - current.endLine - 1;

      if (blankLines === 0) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Missing blank line between contract members. Add one blank line for better readability.`,
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
            suggestion: 'Add exactly one blank line between contract members.',
          },
        });
      } else if (blankLines > 1) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Too many blank lines between contract members (found ${blankLines}). Use exactly one blank line.`,
          location: {
            start: {
              line: current.endLine + 1,
              column: 0,
            },
            end: {
              line: next.line,
              column: 0,
            },
          },
          metadata: {
            suggestion: 'Reduce to exactly one blank line between contract members.',
          },
        });
      }
    }
  }
}
