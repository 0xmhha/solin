/**
 * Naming Convention Rule
 *
 * Enforces Solidity naming conventions for better code readability
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that enforces naming conventions:
 * - Contract names: PascalCase
 * - Function names: camelCase
 * - Constants: UPPER_SNAKE_CASE
 * - Private variables: _leadingUnderscore
 */
export class NamingConventionRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/naming-convention',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Naming Convention',
      description: 'Enforces Solidity naming conventions for contracts, functions, variables, and constants',
      recommendation:
        'Follow naming conventions: PascalCase for contracts, camelCase for functions, UPPER_SNAKE_CASE for constants, and _leadingUnderscore for private variables.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkNamingConvention(node, context);
        return undefined;
      },
    });
  }

  /**
   * Check naming conventions for different node types
   */
  private checkNamingConvention(node: ASTNode, context: AnalysisContext): void {
    // Check contract names (PascalCase)
    if (node.type === 'ContractDefinition') {
      this.checkContractName(node, context);
    }

    // Check function names (camelCase)
    if (node.type === 'FunctionDefinition') {
      this.checkFunctionName(node, context);
    }

    // Check state variable names
    if (node.type === 'StateVariableDeclaration') {
      this.checkStateVariableName(node, context);
    }
  }

  /**
   * Check if contract name follows PascalCase convention
   */
  private checkContractName(node: any, context: AnalysisContext): void {
    const name = node.name;

    if (!name || !node.loc) {
      return;
    }

    if (!this.isPascalCase(name)) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Contract name '${name}' should use PascalCase convention`,
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
   * Check if function name follows camelCase convention
   */
  private checkFunctionName(node: any, context: AnalysisContext): void {
    const name = node.name;

    if (!name || !node.loc) {
      return;
    }

    // Skip special functions
    if (this.isSpecialFunction(name, node)) {
      return;
    }

    if (!this.isCamelCase(name)) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Function name '${name}' should use camelCase convention`,
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
   * Check if state variable name follows convention
   */
  private checkStateVariableName(node: any, context: AnalysisContext): void {
    const variables = node.variables || [];

    for (const variable of variables) {
      if (!variable.name || !variable.loc) {
        continue;
      }

      const name = variable.name;
      const isConstant = variable.isDeclaredConst || false;
      const visibility = variable.visibility || 'default';

      // Constants should be UPPER_SNAKE_CASE
      if (isConstant) {
        if (!this.isUpperSnakeCase(name)) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `Constant '${name}' should use UPPER_SNAKE_CASE convention`,
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
      // Private variables should start with underscore
      else if (visibility === 'private') {
        if (!name.startsWith('_')) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `Private variable '${name}' should start with an underscore (_${name})`,
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

  /**
   * Check if a name is in PascalCase
   */
  private isPascalCase(name: string): boolean {
    // PascalCase: starts with uppercase, can contain letters and numbers
    // No underscores, first character must be uppercase
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * Check if a name is in camelCase
   */
  private isCamelCase(name: string): boolean {
    // camelCase: starts with lowercase, can contain letters and numbers
    // No underscores, first character must be lowercase
    return /^[a-z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * Check if a name is in UPPER_SNAKE_CASE
   */
  private isUpperSnakeCase(name: string): boolean {
    // UPPER_SNAKE_CASE: all uppercase letters, numbers, and underscores
    // Must start with uppercase letter
    return /^[A-Z][A-Z0-9_]*$/.test(name);
  }

  /**
   * Check if a function is special (constructor, fallback, receive)
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
