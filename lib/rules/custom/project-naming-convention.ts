/**
 * Project Naming Convention Rule
 *
 * Enforces project-specific naming conventions:
 * - Stack variables (input, output, local): single _ prefix → _amount, _from
 * - Private/internal state variables: double __ prefix → __owner, __balances
 * - Constants: UPPER_SNAKE_CASE (no prefix) → DOMAIN_SEPARATOR
 * - Private/internal functions: single _ prefix → _executeTransfer()
 * - Naming conflicts: use _ suffix for stack variable → _balance_
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

interface FunctionContext {
  name: string;
  visibility: string;
  parameters: string[];
  localVariables: string[];
}

/**
 * Rule that enforces project-specific naming conventions:
 * - Stack variables: _prefix (single underscore)
 * - Private/internal state variables: __prefix (double underscore)
 * - Constants: UPPER_SNAKE_CASE
 * - Private/internal functions: _prefix (single underscore)
 */
export class ProjectNamingConventionRule extends AbstractRule {
  private walker: ASTWalker;
  private stateVariables: Set<string> = new Set();
  private currentFunction: FunctionContext | null = null;

  constructor() {
    super({
      id: 'custom/project-naming-convention',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Project Naming Convention',
      description:
        'Enforces project-specific naming conventions for variables and functions',
      recommendation:
        'Follow naming conventions: _prefix for stack variables, __prefix for private/internal state, UPPER_CASE for constants, _prefix for private/internal functions.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    // Reset state for each file
    this.stateVariables.clear();
    this.currentFunction = null;

    // First pass: collect state variables
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'StateVariableDeclaration') {
          this.collectStateVariables(node);
        }
        return undefined;
      },
    });

    // Second pass: check naming conventions
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkNamingConvention(node, context);
        return undefined;
      },
    });
  }

  /**
   * Collect state variable names for conflict detection
   */
  private collectStateVariables(node: any): void {
    const variables = node.variables || [];
    for (const variable of variables) {
      if (variable.name) {
        this.stateVariables.add(variable.name);
      }
    }
  }

  /**
   * Check naming conventions for different node types
   */
  private checkNamingConvention(node: ASTNode, context: AnalysisContext): void {
    // Track function context
    if (node.type === 'FunctionDefinition') {
      this.checkFunctionName(node, context);
      this.enterFunction(node);
    }

    // Check state variable names
    if (node.type === 'StateVariableDeclaration') {
      this.checkStateVariableName(node, context);
    }

    // Check function parameters (stack variables)
    if (node.type === 'VariableDeclaration' && this.currentFunction) {
      this.checkLocalVariableName(node, context);
    }
  }

  /**
   * Enter function context
   */
  private enterFunction(node: any): void {
    this.currentFunction = {
      name: node.name || '',
      visibility: node.visibility || 'default',
      parameters: [],
      localVariables: [],
    };

    // Collect parameter names
    const params = node.parameters || [];
    for (const param of params) {
      if (param.name) {
        this.currentFunction.parameters.push(param.name);
      }
    }
  }

  /**
   * Check function naming convention
   * Private/internal functions should start with single _
   */
  private checkFunctionName(node: any, context: AnalysisContext): void {
    const name = node.name;
    const visibility = node.visibility || 'default';

    if (!name || !node.loc) {
      return;
    }

    // Skip special functions
    if (this.isSpecialFunction(name, node)) {
      return;
    }

    // Private/internal functions should start with single underscore
    if (visibility === 'private' || visibility === 'internal') {
      if (!name.startsWith('_')) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Private/internal function '${name}' should start with underscore (_${name})`,
          location: {
            start: { line: node.loc.start.line, column: node.loc.start.column },
            end: { line: node.loc.end.line, column: node.loc.end.column },
          },
        });
      } else if (name.startsWith('__')) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Private/internal function '${name}' should use single underscore, not double (${name.replace(/^__/, '_')})`,
          location: {
            start: { line: node.loc.start.line, column: node.loc.start.column },
            end: { line: node.loc.end.line, column: node.loc.end.column },
          },
        });
      }
    }
    // Public/external functions should NOT start with underscore
    else if (visibility === 'public' || visibility === 'external') {
      if (name.startsWith('_')) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Public/external function '${name}' should not start with underscore`,
          location: {
            start: { line: node.loc.start.line, column: node.loc.start.column },
            end: { line: node.loc.end.line, column: node.loc.end.column },
          },
        });
      }
    }
  }

  /**
   * Check state variable naming convention
   * - Constants: UPPER_SNAKE_CASE (no prefix)
   * - Private/internal: double underscore prefix (__var)
   */
  private checkStateVariableName(node: any, context: AnalysisContext): void {
    const variables = node.variables || [];

    for (const variable of variables) {
      if (!variable.name || !variable.loc) {
        continue;
      }

      const name = variable.name;
      const isConstant = variable.isDeclaredConst || false;
      const isImmutable = variable.isDeclaredImmut || false;
      const visibility = variable.visibility || 'default';

      // Constants should be UPPER_SNAKE_CASE without prefix
      if (isConstant || isImmutable) {
        if (!this.isUpperSnakeCase(name)) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `Constant/immutable '${name}' should use UPPER_SNAKE_CASE (e.g., ${this.toUpperSnakeCase(name)})`,
            location: {
              start: { line: variable.loc.start.line, column: variable.loc.start.column },
              end: { line: variable.loc.end.line, column: variable.loc.end.column },
            },
          });
        }
      }
      // Private/internal state variables should start with double underscore
      else if (visibility === 'private' || visibility === 'internal') {
        if (!name.startsWith('__')) {
          const suggestion = name.startsWith('_') ? `_${name}` : `__${name}`;
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `Private/internal state variable '${name}' should start with double underscore (${suggestion})`,
            location: {
              start: { line: variable.loc.start.line, column: variable.loc.start.column },
              end: { line: variable.loc.end.line, column: variable.loc.end.column },
            },
          });
        }
      }
    }
  }

  /**
   * Check local variable (stack variable) naming convention
   * Stack variables should start with single underscore
   * If conflict with state variable, use trailing underscore
   */
  private checkLocalVariableName(node: any, context: AnalysisContext): void {
    const name = node.name;

    if (!name || !node.loc) {
      return;
    }

    // Skip if this is a state variable declaration (handled separately)
    if (node.isStateVar) {
      return;
    }

    // Stack variables should start with single underscore
    if (!name.startsWith('_')) {
      // Check for potential naming conflict with state variables
      const hasConflict = this.stateVariables.has(name) || this.stateVariables.has(`__${name}`);
      const suggestion = hasConflict ? `_${name}_` : `_${name}`;

      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Stack variable '${name}' should start with underscore (${suggestion})`,
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
    // Check for double underscore (reserved for state variables)
    else if (name.startsWith('__')) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Stack variable '${name}' should use single underscore, double is reserved for state variables`,
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
  }

  /**
   * Check if a name is in UPPER_SNAKE_CASE
   */
  private isUpperSnakeCase(name: string): boolean {
    return /^[A-Z][A-Z0-9_]*$/.test(name);
  }

  /**
   * Convert name to UPPER_SNAKE_CASE
   */
  private toUpperSnakeCase(name: string): string {
    // Remove leading underscores
    const cleanName = name.replace(/^_+/, '');
    // Convert camelCase to UPPER_SNAKE_CASE
    return cleanName
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toUpperCase();
  }

  /**
   * Check if a function is special (constructor, fallback, receive)
   */
  private isSpecialFunction(name: string, node: any): boolean {
    if (name === 'constructor' || node.isConstructor) {
      return true;
    }
    if (name === 'fallback' || name === 'receive' || node.isFallback || node.isReceiveEther) {
      return true;
    }
    return false;
  }
}
