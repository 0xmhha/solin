/**
 * Visibility Modifiers Rule
 *
 * Enforces explicit visibility modifiers for functions and state variables
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces explicit visibility modifiers:
 * - Functions must have explicit visibility (public, external, internal, private)
 * - State variables should have explicit visibility (public, internal, private)
 */
export class VisibilityModifiersRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/visibility-modifiers',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Explicit Visibility Modifiers',
      description: 'Functions and state variables must have explicit visibility modifiers',
      recommendation:
        'Always specify visibility modifiers explicitly. Use public, external, internal, or private for functions and state variables.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkVisibility(node, context);
        return undefined;
      },
    });
  }

  /**
   * Check visibility modifiers for different node types
   */
  private checkVisibility(node: ASTNode, context: AnalysisContext): void {
    // Check function visibility
    if (node.type === 'FunctionDefinition') {
      this.checkFunctionVisibility(node, context);
    }

    // Check state variable visibility
    if (node.type === 'StateVariableDeclaration') {
      this.checkStateVariableVisibility(node, context);
    }
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
        message: `Function '${functionName}' should have explicit visibility modifier (public, external, internal, or private)`,
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
   * Check if state variable has explicit visibility modifier
   */
  private checkStateVariableVisibility(node: any, context: AnalysisContext): void {
    const variables = node.variables || [];

    for (const variable of variables) {
      if (!variable.loc) {
        continue;
      }

      const name = variable.name;
      const visibility = variable.visibility;
      const isConstant = variable.isDeclaredConst || false;

      // Constants can have implicit visibility (internal by default)
      // This is a design decision - we can be lenient with constants
      if (isConstant) {
        continue;
      }

      // Check if visibility is missing or default
      if (!visibility || visibility === 'default') {
        const variableName = name || 'unnamed variable';
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `State variable '${variableName}' should have explicit visibility modifier (public, internal, or private)`,
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

  /**
   * Check if a function is special (constructor, fallback, receive)
   * These functions don't need or can't have certain visibility modifiers
   */
  private isSpecialFunction(name: string, node: any): boolean {
    // Constructor (0.7.0+ doesn't use visibility)
    if (name === 'constructor' || node.isConstructor) {
      return true;
    }

    // Fallback and receive functions (must be external)
    if (name === 'fallback' || name === 'receive' || node.isFallback || node.isReceiveEther) {
      return true;
    }

    return false;
  }
}
