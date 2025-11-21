/**
 * Use Calldata Over Memory Lint Rule
 *
 * Recommends using calldata over memory for external function parameters
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects memory parameters in external functions:
 * - External functions receive parameters from calldata (transaction data)
 * - Using memory requires copying data from calldata to memory (~60 gas per word)
 * - Using calldata reads directly from transaction data (no copy cost)
 * - Savings: ~60 gas per 32-byte word for arrays, strings, bytes, structs
 * - For 10-element uint256 array: ~600 gas saved
 *
 * Note: public functions need memory if called internally, so only flag external
 */
export class UseCalldataOverMemory extends AbstractRule {
  constructor() {
    super({
      id: 'gas/use-calldata-over-memory',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Use calldata instead of memory for external function parameters',
      description:
        'Detects memory parameters in external functions. Using calldata saves ~60 gas per 32-byte word by avoiding memory copies. For a 10-element array, saves ~600 gas.',
      recommendation:
        'Change memory to calldata for external function parameters (arrays, strings, bytes, structs). Calldata reads directly from transaction data without copying to memory.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find external functions
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for FunctionDefinition nodes
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
   * Check if function is external and has memory parameters
   */
  private checkFunction(node: any, context: AnalysisContext): void {
    // Only check external functions
    // public functions may be called internally, requiring memory
    if (!this.isExternalFunction(node)) {
      return;
    }

    // Check parameters
    if (!node.parameters || !Array.isArray(node.parameters)) {
      return;
    }

    for (const param of node.parameters) {
      if (this.isMemoryParameter(param)) {
        this.reportMemoryParameter(param, context);
      }
    }
  }

  /**
   * Check if function is external
   */
  private isExternalFunction(node: any): boolean {
    if (!node.visibility) {
      return false;
    }

    return node.visibility === 'external';
  }

  /**
   * Check if parameter uses memory for a reference type
   */
  private isMemoryParameter(param: any): boolean {
    if (!param || !param.typeName) {
      return false;
    }

    // Check if storage location is explicitly memory
    if (param.storageLocation !== 'memory') {
      return false;
    }

    // Check if type is a reference type (arrays, strings, bytes, structs)
    return this.isReferenceType(param.typeName);
  }

  /**
   * Check if type is a reference type that can use calldata
   */
  private isReferenceType(typeName: any): boolean {
    if (!typeName || !typeName.type) {
      return false;
    }

    // Arrays (including dynamic arrays and fixed-size arrays)
    if (typeName.type === 'ArrayTypeName') {
      return true;
    }

    // Structs (user-defined types)
    if (typeName.type === 'UserDefinedTypeName') {
      return true;
    }

    // Elementary types: string and bytes
    if (typeName.type === 'ElementaryTypeName') {
      const name = typeName.name;
      // string and bytes (dynamic)
      if (name === 'string' || name === 'bytes') {
        return true;
      }
    }

    return false;
  }

  /**
   * Report memory parameter that should use calldata
   */
  private reportMemoryParameter(param: any, context: AnalysisContext): void {
    if (!param.loc) {
      return;
    }

    const typeName = this.getTypeName(param.typeName);
    const paramName = param.name || 'parameter';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Parameter '${paramName}' uses memory for ${typeName}. Use calldata to save ~60 gas per 32-byte word by avoiding memory copy.`,
      location: {
        start: {
          line: param.loc.start.line,
          column: param.loc.start.column,
        },
        end: {
          line: param.loc.end.line,
          column: param.loc.end.column,
        },
      },
    });
  }

  /**
   * Get human-readable type name
   */
  private getTypeName(typeName: any): string {
    if (!typeName || !typeName.type) {
      return 'reference type';
    }

    if (typeName.type === 'ArrayTypeName') {
      const baseType = this.getTypeName(typeName.baseTypeName);
      return `${baseType}[]`;
    }

    if (typeName.type === 'UserDefinedTypeName') {
      return typeName.namePath || 'struct';
    }

    if (typeName.type === 'ElementaryTypeName') {
      return typeName.name;
    }

    return 'reference type';
  }
}
