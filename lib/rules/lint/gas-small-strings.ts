/**
 * Gas Small Strings Lint Rule
 *
 * Recommends using bytes32 instead of string for short fixed-length strings (≤32 bytes)
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects short strings that should use bytes32:
 * - String state variables with short literal initialization (≤32 bytes)
 * - String constants with short values
 * - bytes32 is more gas-efficient for fixed-length strings
 * - Storage: bytes32 uses 1 slot, string uses 2+ slots for short strings
 * - Memory: bytes32 is cheaper to pass around
 */
export class GasSmallStrings extends AbstractRule {
  private static readonly MAX_BYTES32_LENGTH = 32;

  constructor() {
    super({
      id: 'lint/gas-small-strings',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Use bytes32 instead of string for short fixed-length strings',
      description:
        'Detects string variables initialized with short literals (≤32 bytes). Using bytes32 is more gas-efficient for fixed-length strings.',
      recommendation:
        'Replace string with bytes32 for fixed-length strings ≤32 bytes. Convert using bytes32(bytes("value")) if needed.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find string variable declarations
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for StateVariableDeclaration with string type
    if (node.type === 'StateVariableDeclaration') {
      this.checkStateVariable(node, context);
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
   * Check if state variable is a short string
   */
  private checkStateVariable(node: any, context: AnalysisContext): void {
    if (!node.variables || node.variables.length === 0) {
      return;
    }

    for (const variable of node.variables) {
      // Check if variable type is string
      if (!this.isStringType(variable.typeName)) {
        continue;
      }

      // Check if there's an initialization expression
      if (!node.initialValue) {
        // Cannot determine string length without initialization
        continue;
      }

      // Check if initialization is a short string literal
      const stringLength = this.getStringLiteralLength(node.initialValue);
      if (
        stringLength !== null &&
        stringLength <= GasSmallStrings.MAX_BYTES32_LENGTH
      ) {
        this.reportIssue(variable, stringLength, context);
      }
    }
  }

  /**
   * Check if type is string
   */
  private isStringType(typeNode: any): boolean {
    if (!typeNode) {
      return false;
    }

    // ElementaryTypeName with name 'string'
    if (
      typeNode.type === 'ElementaryTypeName' &&
      typeNode.name === 'string'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get string literal length if node is a StringLiteral
   * Returns null if not a string literal or cannot determine length
   */
  private getStringLiteralLength(node: any): number | null {
    if (!node) {
      return null;
    }

    // Direct string literal
    if (node.type === 'StringLiteral') {
      return node.value ? node.value.length : 0;
    }

    // Type conversion: string(...)
    if (node.type === 'FunctionCall') {
      const funcName = this.getFunctionName(node);
      if (funcName === 'string' && node.arguments && node.arguments.length > 0) {
        return this.getStringLiteralLength(node.arguments[0]);
      }
    }

    return null;
  }

  /**
   * Get function name from function call
   */
  private getFunctionName(node: any): string {
    if (!node.expression) {
      return '';
    }

    if (node.expression.type === 'Identifier') {
      return node.expression.name || '';
    }

    if (node.expression.type === 'ElementaryTypeNameExpression') {
      return node.expression.typeName?.name || '';
    }

    return '';
  }

  /**
   * Report issue for short string
   */
  private reportIssue(
    variable: any,
    stringLength: number,
    context: AnalysisContext
  ): void {
    if (!variable.loc) {
      return;
    }

    const varName = variable.name || 'variable';
    const savings = this.estimateGasSavings(stringLength);

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Variable '${varName}' is a short string (${stringLength} bytes). Use bytes32 instead for gas savings (~${savings} gas per read). Convert: bytes32 ${varName} = bytes32(bytes("value"));`,
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
   * Estimate gas savings for using bytes32 vs string
   */
  private estimateGasSavings(stringLength: number): number {
    // Approximate gas savings:
    // - SLOAD for string: ~2100 gas (length) + ~2100 gas (data) = ~4200 gas
    // - SLOAD for bytes32: ~2100 gas
    // - Savings: ~2100 gas per read
    // - For very short strings, savings can be higher due to packing
    return stringLength <= 31 ? 2100 : 2000;
  }
}
