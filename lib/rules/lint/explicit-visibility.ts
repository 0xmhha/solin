/**
 * Explicit Visibility Rule
 *
 * Enforces explicit visibility modifiers for functions
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces explicit visibility modifiers for functions.
 * Functions must have explicit visibility: public, external, internal, or private.
 * Constructors, fallback, and receive functions are excluded as they have special rules.
 */
export class ExplicitVisibilityRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/explicit-visibility',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Explicit Function Visibility',
      description:
        'Functions must have explicit visibility modifiers (public, external, internal, or private)',
      recommendation:
        'Always specify visibility modifiers explicitly for functions. This improves code readability and prevents unintended function exposure.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'FunctionDefinition') {
          this.checkFunctionVisibility(node, context);
        }
        return undefined;
      },
    });
  }

  /**
   * Check if function has explicit visibility modifier
   */
  private checkFunctionVisibility(node: any, context: AnalysisContext): void {
    const name = node.name;
    const visibility = node.visibility;

    if (!node.loc) {
      return;
    }

    // Skip special functions that don't need explicit visibility
    if (this.isSpecialFunction(name, node)) {
      return;
    }

    // Check if visibility is missing or default
    if (!visibility || visibility === 'default') {
      const functionName = name || 'unnamed function';
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Function '${functionName}' must have explicit visibility modifier (public, external, internal, or private)`,
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
      });
    }
  }

  /**
   * Check if a function is special (constructor, fallback, receive)
   * These functions don't need or can't have certain visibility modifiers
   */
  private isSpecialFunction(name: string, node: any): boolean {
    // Constructor
    if (name === 'constructor' || node.isConstructor) {
      return true;
    }

    // Fallback and receive functions
    if (name === 'fallback' || name === 'receive' || node.isFallback || node.isReceiveEther) {
      return true;
    }

    return false;
  }
}
