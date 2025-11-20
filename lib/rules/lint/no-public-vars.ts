/**
 * No Public Vars Rule
 *
 * Disallows public state variables (suggests private with getter)
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that disallows public state variables.
 * Recommends using private variables with explicit getter functions instead.
 * Constants and immutable variables are allowed to be public.
 */
export class NoPublicVarsRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/no-public-vars',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'No Public State Variables',
      description:
        'Public state variables should be avoided. Use private variables with explicit getter functions instead.',
      recommendation:
        'Replace public state variables with private variables and explicit getter functions. This provides better control over access patterns and gas optimization. Constants and immutable variables are allowed to be public.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'StateVariableDeclaration') {
          this.checkStateVariable(node, context);
        }
        return undefined;
      },
    });
  }

  /**
   * Check if state variable is public and should be flagged
   */
  private checkStateVariable(node: any, context: AnalysisContext): void {
    const variables = node.variables || [];

    for (const variable of variables) {
      if (!variable.loc) {
        continue;
      }

      const name = variable.name;
      const visibility = variable.visibility;
      const isConstant = variable.isDeclaredConst || false;
      const isImmutable = variable.isImmutable || false;

      // Allow public constants and immutable variables
      if (isConstant || isImmutable) {
        continue;
      }

      // Check if variable is public
      if (visibility === 'public') {
        const variableName = name || 'unnamed variable';
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `State variable '${variableName}' should not be public. Use private visibility with an explicit getter function instead.`,
          location: {
            start: {
              line: variable.loc.start.line,
              column: variable.loc.start.column,
            },
            end: {
              line: variable.loc.end.line,
              column: variable.loc.end.column,
            },
          },
          metadata: {
            suggestion: `Change to: ${variable.typeName?.type || 'type'} private _${variableName}; and add a public getter function.`,
          },
        });
      }
    }
  }
}
