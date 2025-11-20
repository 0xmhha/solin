/**
 * Type Confusion Security Rule
 *
 * Detects dangerous type conversions that can lead to data loss, overflow,
 * or unexpected behavior. Type confusion vulnerabilities occur when values
 * are cast between incompatible types without proper validation.
 *
 * @example
 * // Vulnerable: Unsafe downcasting
 * function unsafeCast(uint256 value) public returns (uint8) {
 *   return uint8(value); // Can overflow/truncate!
 * }
 *
 * // Safe: Validate before casting
 * function safeCast(uint256 value) public returns (uint8) {
 *   require(value <= type(uint8).max, "Value too large");
 *   return uint8(value);
 * }
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class TypeConfusionRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/type-confusion',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Type Confusion Vulnerability',
      description:
        'Detects dangerous type conversions that can cause data loss, overflow, or unexpected behavior. ' +
        'Downcasting (e.g., uint256 to uint8) without validation can silently truncate values. ' +
        'Type confusion between addresses, contracts, and integers can lead to critical vulnerabilities.',
      recommendation:
        'Always validate before downcasting: require(value <= type(targetType).max). ' +
        'Use OpenZeppelin SafeCast library for type conversions. ' +
        'Avoid casting between incompatible types (address <-> uint, bytes <-> uint). ' +
        'Be explicit about type conversions and document why they are safe.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkFunction(node: any, context: AnalysisContext): void {
    if (!node.body) return;

    this.checkTypeCasts(node.body, context);
  }

  private checkTypeCasts(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for type casting function calls
    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      if (expr?.type === 'ElementaryTypeName' || expr?.type === 'ElementaryTypeNameExpression') {
        this.checkTypeCast(node, expr, context);
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.checkTypeCasts(child, context));
      } else if (value && typeof value === 'object') {
        this.checkTypeCasts(value, context);
      }
    }
  }

  private checkTypeCast(node: any, typeExpr: any, context: AnalysisContext): void {
    const targetType = this.getTypeName(typeExpr);
    if (!targetType) return;

    const argument = node.arguments?.[0];
    if (!argument) return;

    // Check for dangerous downcasting
    if (this.isDowncast(targetType)) {
      // Check if there's a require statement validating the cast
      if (!this.hasValidation(node, targetType)) {
        this.reportIssue(
          node,
          `Unsafe type cast to ${targetType} without validation. Downcasting can cause data loss or overflow. ` +
            `Add validation: require(value <= type(${targetType}).max, "Value too large"). ` +
            'Consider using OpenZeppelin SafeCast library.',
          context
        );
      }
    }

    // Check for address <-> uint conversions
    if (this.isAddressUintConversion(targetType, argument)) {
      this.reportIssue(
        node,
        `Type confusion: converting between address and uint types. This can lead to unexpected behavior. ` +
          'Ensure this conversion is intentional and properly validated.',
        context
      );
    }

    // Check for bytes <-> uint conversions without length check
    if (this.isBytesUintConversion(targetType, argument)) {
      this.reportIssue(
        node,
        'Type confusion: converting between bytes and uint without length validation. ' +
          'This can lead to incorrect values if byte length does not match target type size.',
        context
      );
    }

    // Check for contract <-> address conversions
    if (this.isContractAddressConversion(targetType)) {
      this.reportIssue(
        node,
        'Type confusion: converting contract type to address. While syntactically valid, ' +
          'ensure this is intentional as it loses type safety. Consider keeping the contract type.',
        context
      );
    }
  }

  private getTypeName(typeExpr: any): string | null {
    if (typeExpr.name) return typeExpr.name;
    if (typeExpr.typeName?.name) return typeExpr.typeName.name;
    return null;
  }

  private isDowncast(targetType: string): boolean {
    // Check if target type is a smaller integer type
    const smallTypes = [
      'uint8',
      'uint16',
      'uint24',
      'uint32',
      'uint40',
      'uint48',
      'uint56',
      'uint64',
      'uint72',
      'uint80',
      'uint88',
      'uint96',
      'uint104',
      'uint112',
      'uint120',
      'uint128',
      'uint136',
      'uint144',
      'uint152',
      'uint160',
      'uint168',
      'uint176',
      'uint184',
      'uint192',
      'uint200',
      'uint208',
      'uint216',
      'uint224',
      'uint232',
      'uint240',
      'uint248',
      'int8',
      'int16',
      'int24',
      'int32',
      'int40',
      'int48',
      'int56',
      'int64',
      'int72',
      'int80',
      'int88',
      'int96',
      'int104',
      'int112',
      'int120',
      'int128',
      'int136',
      'int144',
      'int152',
      'int160',
      'int168',
      'int176',
      'int184',
      'int192',
      'int200',
      'int208',
      'int216',
      'int224',
      'int232',
      'int240',
      'int248',
    ];
    return smallTypes.includes(targetType);
  }

  private hasValidation(castNode: any, targetType: string): boolean {
    // This is a simplified check - in a full implementation, we would
    // analyze the control flow to see if there's a require/assert before the cast
    // For now, we'll check if the function containing this cast has require statements

    // Look for sibling require statements (simplified)
    const funcBody = this.findParentFunctionBody(castNode);
    if (funcBody) {
      return this.hasRequireForType(funcBody, targetType);
    }

    return false;
  }

  private findParentFunctionBody(_node: any): any {
    // Simplified: in real implementation, we'd track parent nodes during traversal
    return null;
  }

  private hasRequireForType(body: any, targetType: string): boolean {
    if (!body || typeof body !== 'object') return false;

    if (body.type === 'FunctionCall') {
      const expr = body.expression;
      if (expr?.type === 'Identifier' && expr.name === 'require') {
        // Check if require validates the type cast
        const condition = body.arguments?.[0];
        if (condition && this.mentionsType(condition, targetType)) {
          return true;
        }
      }
    }

    for (const key in body) {
      if (key === 'loc' || key === 'range') continue;
      const value = body[key];
      if (Array.isArray(value)) {
        if (value.some(child => this.hasRequireForType(child, targetType))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.hasRequireForType(value, targetType)) {
          return true;
        }
      }
    }

    return false;
  }

  private mentionsType(node: any, targetType: string): boolean {
    const nodeStr = JSON.stringify(node);
    return nodeStr.includes(targetType) || nodeStr.includes('type(') || nodeStr.includes('.max');
  }

  private isAddressUintConversion(targetType: string, argument: any): boolean {
    // Check if converting between address and uint
    const isTargetAddress = targetType === 'address' || targetType === 'address payable';
    const isTargetUint = targetType.startsWith('uint') || targetType.startsWith('int');

    if (isTargetAddress || isTargetUint) {
      // Check argument type (simplified)
      const argType = this.inferArgumentType(argument);
      if (argType === 'address' && isTargetUint) return true;
      if (argType?.startsWith('uint') && isTargetAddress) return true;
    }

    return false;
  }

  private isBytesUintConversion(targetType: string, argument: any): boolean {
    const isTargetBytes = targetType.startsWith('bytes');
    const isTargetUint = targetType.startsWith('uint') || targetType.startsWith('int');

    if (isTargetBytes || isTargetUint) {
      const argType = this.inferArgumentType(argument);
      if (argType?.startsWith('bytes') && isTargetUint) return true;
      if (argType?.startsWith('uint') && isTargetBytes) return true;
    }

    return false;
  }

  private isContractAddressConversion(targetType: string): boolean {
    return targetType === 'address' || targetType === 'address payable';
  }

  private inferArgumentType(argument: any): string | null {
    if (!argument) return null;

    // Try to infer type from the argument
    if (argument.type === 'FunctionCall') {
      const expr = argument.expression;
      if (expr?.type === 'ElementaryTypeName' || expr?.type === 'ElementaryTypeNameExpression') {
        return this.getTypeName(expr);
      }
    }

    if (argument.type === 'Identifier') {
      // Would need type information from context
      // For now, return null (simplified)
      return null;
    }

    return null;
  }

  private reportIssue(node: any, message: string, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
