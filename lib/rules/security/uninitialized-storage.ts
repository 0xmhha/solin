/**
 * Uninitialized Storage Security Rule
 *
 * Detects uninitialized local storage pointers that can lead to unexpected behavior.
 * Uninitialized storage pointers point to storage slot 0, which can:
 * - Overwrite critical state variables unexpectedly
 * - Cause data corruption
 * - Lead to security vulnerabilities
 *
 * Note: This is primarily an issue in Solidity < 0.5.0.
 * Starting from 0.5.0, uninitialized storage pointers cause compilation errors.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects uninitialized local storage pointers:
 * - Storage struct variables without initialization
 * - Storage array variables without initialization
 * - Local storage variables declared but not assigned
 *
 * Safe patterns (excluded):
 * - Memory variables (not storage)
 * - Storage variables with initialization
 * - Storage variables assigned in declaration
 * - State variables (not local variables)
 */
export class UninitializedStorageRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/uninitialized-storage',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Uninitialized Storage Pointer',
      description:
        'Detects uninitialized local storage pointers. Uninitialized storage pointers point to storage slot 0, which can overwrite critical state variables and cause unexpected behavior. This is a critical issue in Solidity < 0.5.0.',
      recommendation:
        'Always initialize storage pointers when declaring them. Use explicit initialization like "MyStruct storage s = stateVar;" or use memory instead of storage for local variables. Upgrade to Solidity 0.5.0+ where this causes a compilation error.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST to find uninitialized storage pointers
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for function definitions (local scope)
    if (node.type === 'FunctionDefinition') {
      this.checkFunctionBody(node, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check function body for uninitialized storage variables
   */
  private checkFunctionBody(functionNode: any, context: AnalysisContext): void {
    if (!functionNode.body) {
      return;
    }

    // Walk the function body to find variable declarations
    this.checkStatements(functionNode.body, context);
  }

  /**
   * Check statements for uninitialized storage variables
   */
  private checkStatements(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for variable declaration statement
    if (node.type === 'VariableDeclarationStatement') {
      this.checkVariableDeclaration(node, context);
    }

    // Recursively check nested statements (blocks, loops, etc.)
    if (node.type === 'Block' && node.statements) {
      for (const statement of node.statements) {
        this.checkStatements(statement, context);
      }
    }

    // Check for loops
    if (
      node.type === 'ForStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    ) {
      if (node.body) {
        this.checkStatements(node.body, context);
      }
    }

    // Check if statement
    if (node.type === 'IfStatement') {
      if (node.trueBody) {
        this.checkStatements(node.trueBody, context);
      }
      if (node.falseBody) {
        this.checkStatements(node.falseBody, context);
      }
    }

    // Recursively check all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range' || key === 'statements' || key === 'body') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkStatements(child, context));
      } else if (value && typeof value === 'object') {
        this.checkStatements(value, context);
      }
    }
  }

  /**
   * Check variable declaration for uninitialized storage
   */
  private checkVariableDeclaration(node: any, context: AnalysisContext): void {
    if (!node.variables || !Array.isArray(node.variables)) {
      return;
    }

    for (const variable of node.variables) {
      // Check if it's a storage variable
      if (!this.isStorageVariable(variable)) {
        continue;
      }

      // Check if it's uninitialized
      if (this.isUninitialized(node, variable)) {
        this.reportUninitializedStorage(variable, context);
      }
    }
  }

  /**
   * Check if variable is a storage type
   */
  private isStorageVariable(variable: any): boolean {
    if (!variable) {
      return false;
    }

    // Check for explicit storage location
    if (variable.storageLocation === 'storage') {
      return true;
    }

    // Check if it's a reference type without explicit memory location
    // (In older Solidity, reference types default to storage in local scope)
    if (variable.typeName) {
      const typeName = variable.typeName;

      // Arrays
      if (typeName.type === 'ArrayTypeName') {
        // If no explicit storage location, it might be storage (in older Solidity)
        return variable.storageLocation === 'storage';
      }

      // Structs
      if (typeName.type === 'UserDefinedTypeName') {
        // Structs are reference types
        return variable.storageLocation === 'storage';
      }

      // Mappings (always storage)
      if (typeName.type === 'Mapping') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if variable is uninitialized
   */
  private isUninitialized(declarationNode: any, _variable: any): boolean {
    // Check if there's an initial value in the declaration statement
    if (declarationNode.initialValue) {
      return false;
    }

    // If no initialValue, it's uninitialized
    return true;
  }

  /**
   * Report an uninitialized storage pointer
   */
  private reportUninitializedStorage(variable: any, context: AnalysisContext): void {
    if (!variable.loc) {
      return;
    }

    const variableName = variable.name || '(anonymous)';
    const variableType = this.getVariableTypeDescription(variable);

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Uninitialized storage pointer '${variableName}' (${variableType}). This points to storage slot 0 and can overwrite critical state variables. Initialize the pointer or use 'memory' instead. Note: This causes a compilation error in Solidity 0.5.0+.`,
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

  /**
   * Get human-readable description of variable type
   */
  private getVariableTypeDescription(variable: any): string {
    if (!variable.typeName) {
      return 'unknown type';
    }

    const typeName = variable.typeName;

    if (typeName.type === 'ArrayTypeName') {
      return 'storage array';
    }

    if (typeName.type === 'UserDefinedTypeName') {
      const name = typeName.namePath || 'struct';
      return `storage ${name}`;
    }

    if (typeName.type === 'Mapping') {
      return 'storage mapping';
    }

    return 'storage variable';
  }
}
