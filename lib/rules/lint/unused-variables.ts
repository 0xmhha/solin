/**
 * Unused Variables Lint Rule
 *
 * Detects declared but unused variables and parameters
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import { ASTWalker } from '@parser/ast-walker';

/**
 * Rule that detects unused variables:
 * - Local variables that are declared but never used
 * - Function parameters that are never referenced
 * - Ignores variables starting with underscore (intentionally unused)
 * - Does not check state variables (they may be accessed externally)
 */
export class UnusedVariablesRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/unused-variables',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Unused Variables',
      description: 'Detects declared but unused local variables and function parameters',
      recommendation:
        'Remove unused variables to improve code clarity and reduce gas costs. If a variable is intentionally unused (e.g., required by interface), prefix it with underscore (_).',
    });
    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST and find all function definitions
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if this is a function definition
    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check a function for unused variables
   */
  private checkFunction(functionNode: any, context: AnalysisContext): void {
    const declared = new Map<string, any>(); // variable name -> declaration node
    const used = new Set<string>();

    // Collect function parameters
    const parameters = functionNode.parameters || [];
    for (const param of parameters) {
      if (param.name) {
        declared.set(param.name, param);
      }
    }

    // Collect local variable declarations
    if (functionNode.body) {
      this.collectLocalVariables(functionNode.body, declared);
    }

    // Collect variable usages
    if (functionNode.body) {
      this.collectVariableUsages(functionNode.body, used, declared);
    }

    // Report unused variables
    for (const [varName, varNode] of declared) {
      // Skip variables starting with underscore (intentionally unused)
      if (varName.startsWith('_')) {
        continue;
      }

      // Skip if variable is used
      if (used.has(varName)) {
        continue;
      }

      // Report unused variable
      if (varNode.loc) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Variable '${varName}' is declared but never referenced.`,
          location: {
            start: {
              line: varNode.loc.start.line,
              column: varNode.loc.start.column,
            },
            end: {
              line: varNode.loc.end.line,
              column: varNode.loc.end.column,
            },
          },
        });
      }
    }
  }

  /**
   * Collect local variable declarations in function body using ASTWalker
   */
  private collectLocalVariables(body: any, declared: Map<string, any>): void {
    if (!body) {
      return;
    }

    this.walker.walk(body, {
      enter: (node: any) => {
        // Handle VariableDeclarationStatement
        if (node.type === 'VariableDeclarationStatement') {
          const variables = node.variables || [];
          for (const variable of variables) {
            if (variable && variable.name) {
              declared.set(variable.name, variable);
            }
          }
        }
        // Handle VariableDeclaration (different AST structure)
        else if (node.type === 'VariableDeclaration') {
          if (node.name) {
            declared.set(node.name, node);
          }
          const declarations = node.declarations || [];
          for (const decl of declarations) {
            if (decl && decl.name) {
              declared.set(decl.name, decl);
            }
          }
        }
        return undefined;
      },
    });
  }

  /**
   * Collect variable usages by walking all nodes recursively
   * This ensures we catch usages in nested scopes, loop conditions, function arguments, etc.
   */
  private collectVariableUsages(body: any, used: Set<string>, declared: Map<string, any>): void {
    if (!body) {
      return;
    }

    this.findIdentifierUsages(body, used, declared);
  }

  /**
   * Recursively find all Identifier usages in the AST
   */
  private findIdentifierUsages(node: any, used: Set<string>, declared: Map<string, any>): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if this is an Identifier that represents a variable usage
    if (node.type === 'Identifier') {
      const name = node.name;
      if (name && declared.has(name)) {
        used.add(name);
      }
    }

    // Recursively check all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      // Skip the name property of VariableDeclaration to avoid counting declarations as usages
      if (key === 'name' && node.type === 'VariableDeclaration') {
        continue;
      }

      // Skip variables array in VariableDeclarationStatement
      if (key === 'variables' && node.type === 'VariableDeclarationStatement') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          this.findIdentifierUsages(child, used, declared);
        }
      } else if (value && typeof value === 'object') {
        this.findIdentifierUsages(value, used, declared);
      }
    }
  }
}
