/**
 * Return Bomb Security Rule
 *
 * Detects external calls that copy return data to memory without size limits.
 * Malicious contracts can return extremely large data causing out-of-gas DoS attacks.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class ReturnBombRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/return-bomb',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Return Bomb Vulnerability',
      description:
        'Detects low-level calls (.call, .delegatecall, .staticcall) that copy return data to memory. ' +
        'Malicious contracts can return extremely large data (return bomb) causing out-of-gas DoS attacks ' +
        'through excessive memory expansion costs.',
      recommendation:
        'Avoid copying return data from untrusted external calls. ' +
        'Use (bool success, ) = target.call("") to ignore return data, or implement size limits. ' +
        'If return data is needed, validate the size before copying or use assembly for controlled access.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for variable declaration statements (tuple destructuring)
    if (node.type === 'VariableDeclarationStatement') {
      this.checkVariableDeclaration(node, context);
    }

    // Recursively traverse
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

  private checkVariableDeclaration(node: any, context: AnalysisContext): void {
    if (!node.initialValue) return;

    // Check if initial value is a low-level call
    if (!this.isLowLevelCall(node.initialValue)) return;

    // Check if variables include bytes memory capture
    if (this.capturesReturnData(node.variables)) {
      this.reportIssue(node, context);
    }
  }

  private isLowLevelCall(node: any): boolean {
    if (node.type !== 'FunctionCall') return false;

    // For call{value: ...}("") pattern - NameValueExpression
    if (node.expression?.type === 'NameValueExpression') {
      const innerExpr = node.expression.expression;
      if (innerExpr?.type === 'MemberAccess') {
        const memberName = innerExpr.memberName;
        return memberName === 'call' || memberName === 'delegatecall' || memberName === 'staticcall';
      }
    }

    // For direct call() pattern - MemberAccess
    if (node.expression?.type === 'MemberAccess') {
      const memberName = node.expression.memberName;
      return memberName === 'call' || memberName === 'delegatecall' || memberName === 'staticcall';
    }

    return false;
  }

  private capturesReturnData(variables: any[]): boolean {
    if (!variables || !Array.isArray(variables)) return false;

    // Check if there are at least 2 variables (bool success, bytes memory data)
    if (variables.length < 2) return false;

    // Check if second variable is bytes memory type
    const secondVar = variables[1];
    if (!secondVar) return false;

    // Check if it's not null (empty slot would be null in tuple destructuring)
    if (secondVar === null) return false;

    // Check if typeName indicates bytes
    if (secondVar.typeName) {
      // Check for ElementaryTypeName with name 'bytes'
      if (secondVar.typeName.type === 'ElementaryTypeName' && secondVar.typeName.name === 'bytes') {
        return true;
      }
    }

    return false;
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    const callType = this.getCallType(node.initialValue);

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Return bomb vulnerability detected in ${callType}() call. ` +
        'Copying return data to memory without size limits allows malicious contracts to send extremely large data, ' +
        'causing out-of-gas DoS through excessive memory expansion costs. ' +
        `Use (bool success, ) = target.${callType}("") to ignore return data, or implement size limits before copying.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }

  private getCallType(node: any): string {
    if (!node || node.type !== 'FunctionCall') return 'call';

    // For NameValueExpression pattern
    if (node.expression?.type === 'NameValueExpression') {
      const innerExpr = node.expression.expression;
      if (innerExpr?.type === 'MemberAccess') {
        return innerExpr.memberName || 'call';
      }
    }

    // For MemberAccess pattern
    if (node.expression?.type === 'MemberAccess') {
      return node.expression.memberName || 'call';
    }

    return 'call';
  }
}
