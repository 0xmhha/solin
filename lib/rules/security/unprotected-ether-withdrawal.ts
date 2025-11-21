/**
 * Unprotected Ether Withdrawal Security Rule
 *
 * Detects public/external functions that can withdraw ether without proper access control.
 * Functions that transfer ether should be protected by modifiers or require statements.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class UnprotectedEtherWithdrawalRule extends AbstractRule {
  private static readonly COMMON_PROTECTION_MODIFIERS = [
    'onlyOwner',
    'onlyAdmin',
    'onlyAuthorized',
    'authorized',
    'restricted',
  ];

  constructor() {
    super({
      id: 'security/unprotected-ether-withdrawal',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Unprotected Ether Withdrawal',
      description:
        'Detects public or external functions that can withdraw ether without proper access control. ' +
        'Functions that transfer ether (transfer, send, call with value) should be protected by access control ' +
        'modifiers or require statements to prevent unauthorized fund drainage.',
      recommendation:
        'Add access control to ether withdrawal functions: use modifiers (onlyOwner, onlyAuthorized), ' +
        'require statements checking sender authorization, or change visibility to internal/private. ' +
        'Never allow arbitrary addresses to withdraw contract funds.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check function definitions
    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
    }

    // Recursively traverse
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
    // Skip if not public or external
    if (!this.isPublicOrExternal(node)) {
      return;
    }

    // Skip if view or pure
    if (node.stateMutability === 'view' || node.stateMutability === 'pure') {
      return;
    }

    // Skip if function has protection modifiers
    if (this.hasProtectionModifier(node)) {
      return;
    }

    // Check if function body contains ether transfers
    if (this.hasEtherTransfer(node.body)) {
      // Check if function has require statements for access control
      if (!this.hasRequireCheck(node.body)) {
        this.reportIssue(node, context);
      }
    }
  }

  private isPublicOrExternal(node: any): boolean {
    return node.visibility === 'public' || node.visibility === 'external';
  }

  private hasProtectionModifier(node: any): boolean {
    if (!node.modifiers || !Array.isArray(node.modifiers)) {
      return false;
    }

    for (const modifier of node.modifiers) {
      if (modifier.name) {
        const modifierName = modifier.name.toLowerCase();
        // Check for common protection modifiers
        if (
          UnprotectedEtherWithdrawalRule.COMMON_PROTECTION_MODIFIERS.some(name =>
            modifierName.includes(name.toLowerCase())
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private hasEtherTransfer(node: any): boolean {
    if (!node) return false;

    // Check for transfer/send/call
    const found = this.findEtherTransfers(node);
    return found.length > 0;
  }

  private findEtherTransfers(node: any, transfers: any[] = []): any[] {
    if (!node || typeof node !== 'object') return transfers;

    // Check for transfer/send (direct member access)
    if (node.type === 'FunctionCall' && node.expression?.type === 'MemberAccess') {
      const memberName = node.expression.memberName;
      if (memberName === 'transfer' || memberName === 'send') {
        transfers.push(node);
      }
    }

    // Check for call{value: amount}("") - uses NameValueExpression
    if (node.type === 'FunctionCall' && node.expression?.type === 'NameValueExpression') {
      const innerExpr = node.expression.expression;
      if (innerExpr?.type === 'MemberAccess' && innerExpr.memberName === 'call') {
        const args = node.expression.arguments;
        if (args?.names && args.names.includes('value')) {
          transfers.push(node);
        }
      }
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.findEtherTransfers(child, transfers));
      } else if (value && typeof value === 'object') {
        this.findEtherTransfers(value, transfers);
      }
    }

    return transfers;
  }

  private hasRequireCheck(node: any): boolean {
    if (!node) return false;

    const found = this.findRequireStatements(node);
    return found.length > 0;
  }

  private findRequireStatements(node: any, requires: any[] = []): any[] {
    if (!node || typeof node !== 'object') return requires;

    // Check for require function call
    if (
      node.type === 'FunctionCall' &&
      node.expression?.type === 'Identifier' &&
      node.expression?.name === 'require'
    ) {
      requires.push(node);
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.findRequireStatements(child, requires));
      } else if (value && typeof value === 'object') {
        this.findRequireStatements(value, requires);
      }
    }

    return requires;
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    const funcName = node.name || 'anonymous';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Unprotected ether withdrawal detected in function '${funcName}'. ` +
        'Public/external functions that transfer ether should have access control (modifiers or require statements). ' +
        'Without protection, any address can drain contract funds. ' +
        'Add onlyOwner modifier or require(msg.sender == authorized) check.',
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
