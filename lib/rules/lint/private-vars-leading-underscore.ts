/**
 * Private Vars Leading Underscore Rule
 *
 * Enforces leading underscore for private/internal variables
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces leading underscore for private/internal state variables:
 * - Private variables should start with _
 * - Internal variables should start with _
 * - Constants and immutables are exempt
 * - Public/external variables should not have underscore
 */
export class PrivateVarsLeadingUnderscoreRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/private-vars-leading-underscore',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Private Vars Leading Underscore',
      description:
        'Enforces leading underscore naming convention for private and internal state variables to improve code readability and distinguish them from public variables.',
      recommendation:
        'Prefix private and internal state variables with an underscore (_). For example: _balance, _owner, _counter.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkStateVariable(node, context);
        return undefined;
      },
    });
  }

  /**
   * Check state variable declarations
   */
  private checkStateVariable(node: ASTNode, context: AnalysisContext): void {
    if (node.type !== 'StateVariableDeclaration') {
      return;
    }

    const stateVar = node as any;
    const variables = stateVar.variables || [];

    for (const variable of variables) {
      if (!variable.name || !variable.loc) {
        continue;
      }

      const name = variable.name;
      // In Solidity, state variables without visibility modifier are internal by default
      const visibility = variable.visibility || 'default';
      const isConstant = variable.isDeclaredConst || false;
      const isImmutable = variable.isImmutable || false;

      // Skip constants and immutables
      if (isConstant || isImmutable) {
        continue;
      }

      // Check private, internal, and default (which is internal) variables
      if (visibility === 'private' || visibility === 'internal' || visibility === 'default') {
        if (!name.startsWith('_')) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `${visibility.charAt(0).toUpperCase() + visibility.slice(1)} variable '${name}' should start with an underscore (_${name}).`,
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
          });
        }
      }
    }
  }
}
