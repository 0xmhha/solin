/**
 * Unsafe Cast Security Rule
 *
 * Detects unsafe type downcasts that may cause data loss or unexpected behavior.
 * Downcasting from larger to smaller integer types without bounds checking can truncate values.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class UnsafeCastRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/unsafe-cast',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Unsafe Type Downcast',
      description:
        'Detects unsafe downcasts from larger to smaller integer types that may cause silent data loss or unexpected behavior. Downcasting uint256 to uint8 can truncate values exceeding 255, leading to incorrect calculations, broken logic, or security vulnerabilities. Solidity 0.8+ prevents overflow but not data loss from downcasts.',
      recommendation:
        'Add bounds checking before downcasting: require(value <= type(uint8).max, "Value too large"). Use SafeCast library from OpenZeppelin for safe downcasting with automatic validation. Consider redesigning to use consistent type sizes throughout.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionCall') {
      this.checkCast(node, context);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkCast(node: any, context: AnalysisContext): void {
    // Type cast can have different expression types
    let targetTypeName: string | null = null;

    if (node.expression?.type === 'ElementaryTypeName') {
      // For built-in types like uint8, int256, etc.
      targetTypeName = node.expression.name;
    } else if (node.expression?.type === 'ElementaryTypeNameExpression') {
      // Alternative representation in some parser versions
      targetTypeName = node.expression.typeName?.name;
    } else if (node.expression?.type === 'Identifier') {
      // For regular identifier-based casts
      targetTypeName = node.expression.name;
    }

    if (!targetTypeName) return;

    // Check if it's an integer type cast
    const targetType = this.parseIntegerType(targetTypeName);
    if (!targetType) return;

    // Get the argument being cast
    const arg = node.arguments && node.arguments[0];
    if (!arg) return;

    // Try to infer source type
    const sourceType = this.inferType(arg);
    if (!sourceType) return;

    // Check if it's an unsafe downcast
    if (this.isUnsafeDowncast(sourceType, targetType)) {
      this.reportIssue(node, sourceType, targetType, context);
    }
  }

  private parseIntegerType(typeName: string): { signed: boolean; bits: number } | null {
    // Match uint<bits> or int<bits>
    const uintMatch = typeName.match(/^uint(\d+)$/);
    if (uintMatch && uintMatch[1]) {
      const bits = parseInt(uintMatch[1], 10);
      return { signed: false, bits };
    }

    const intMatch = typeName.match(/^int(\d+)$/);
    if (intMatch && intMatch[1]) {
      const bits = parseInt(intMatch[1], 10);
      return { signed: true, bits };
    }

    // Default uint/int to 256 bits
    if (typeName === 'uint') {
      return { signed: false, bits: 256 };
    }
    if (typeName === 'int') {
      return { signed: true, bits: 256 };
    }

    return null;
  }

  private inferType(node: any): { signed: boolean; bits: number } | null {
    if (!node) return null;

    // If it's a variable declaration or parameter with explicit type
    if (node.type === 'Identifier') {
      // Try to infer from variable name (heuristic: assume uint256 for unknown identifiers)
      // This is a simplified approach; more sophisticated type inference would track variable declarations
      return { signed: false, bits: 256 };
    }

    // If it's a literal, infer from value
    if (node.type === 'NumberLiteral' || node.type === 'Literal') {
      // Assume uint256 for literals
      return { signed: false, bits: 256 };
    }

    // If it's another type cast, parse the type
    if (node.type === 'FunctionCall' && node.expression?.type === 'Identifier') {
      return this.parseIntegerType(node.expression.name);
    }

    // Default to uint256 (most common in Solidity)
    return { signed: false, bits: 256 };
  }

  private isUnsafeDowncast(
    source: { signed: boolean; bits: number },
    target: { signed: boolean; bits: number }
  ): boolean {
    // Downcast: target has fewer bits than source
    if (target.bits >= source.bits) {
      return false; // Upcast or same size (safe)
    }

    // Signed/unsigned mismatch also requires attention, but primarily focus on bit width
    return true;
  }

  private reportIssue(
    node: any,
    sourceType: { signed: boolean; bits: number },
    targetType: { signed: boolean; bits: number },
    context: AnalysisContext
  ): void {
    if (!node.loc) return;

    const sourceTypeName = `${sourceType.signed ? 'int' : 'uint'}${sourceType.bits}`;
    const targetTypeName = `${targetType.signed ? 'int' : 'uint'}${targetType.bits}`;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Unsafe downcast from ${sourceTypeName} to ${targetTypeName} detected. Downcasting can cause silent data loss if the value exceeds ${targetTypeName} max (${this.getMaxValue(
        targetType
      )}). Add bounds check: require(value <= type(${targetTypeName}).max) or use SafeCast library.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }

  private getMaxValue(type: { signed: boolean; bits: number }): string {
    if (type.signed) {
      return `2^${type.bits - 1} - 1`;
    } else {
      return `2^${type.bits} - 1`;
    }
  }
}
