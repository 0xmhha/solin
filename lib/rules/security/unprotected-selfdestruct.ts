/**
 * Unprotected Selfdestruct Security Rule
 *
 * Detects selfdestruct calls that are not properly protected by access controls.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class UnprotectedSelfdestructRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/unprotected-selfdestruct',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Unprotected Selfdestruct',
      description:
        'Detects selfdestruct calls without proper access control. Unprotected selfdestruct allows ' +
        'anyone to destroy the contract and drain its funds.',
      recommendation:
        'Protect selfdestruct with access control modifiers (onlyOwner). ' +
        'Ensure only authorized addresses can destroy the contract.',
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

    // Check if function has selfdestruct
    if (this.hasSelfdestructCall(node.body)) {
      // Check if function has protection
      if (!this.hasAccessControl(node)) {
        this.reportIssue(
          node,
          'Unprotected selfdestruct call. Anyone can destroy this contract and drain its funds. ' +
            'Add access control: require(msg.sender == owner) or use onlyOwner modifier.',
          context
        );
      }
    }
  }

  private hasSelfdestructCall(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      if (expr?.type === 'Identifier' && expr.name === 'selfdestruct') {
        return true;
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some(child => this.hasSelfdestructCall(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.hasSelfdestructCall(value)) {
          return true;
        }
      }
    }

    return false;
  }

  private hasAccessControl(node: any): boolean {
    // Check modifiers
    if (node.modifiers && Array.isArray(node.modifiers)) {
      const hasOwnerModifier = node.modifiers.some((mod: any) => {
        const name = mod.name || '';
        return (
          name.toLowerCase().includes('owner') ||
          name.toLowerCase().includes('admin') ||
          name.toLowerCase().includes('authorized')
        );
      });
      if (hasOwnerModifier) return true;
    }

    // Check for require(msg.sender == owner) pattern
    if (node.body && this.hasOwnerCheck(node.body)) {
      return true;
    }

    return false;
  }

  private hasOwnerCheck(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      if (expr?.type === 'Identifier' && expr.name === 'require') {
        const condition = node.arguments?.[0];
        if (this.isOwnerComparison(condition)) {
          return true;
        }
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some(child => this.hasOwnerCheck(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.hasOwnerCheck(value)) {
          return true;
        }
      }
    }

    return false;
  }

  private isOwnerComparison(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    if (node.type === 'BinaryOperation' && node.operator === '==') {
      const leftText = this.getNodeText(node.left);
      const rightText = this.getNodeText(node.right);
      return (
        (leftText.includes('sender') && rightText.includes('owner')) ||
        (rightText.includes('sender') && leftText.includes('owner'))
      );
    }

    return false;
  }

  private getNodeText(node: any): string {
    if (!node) return '';
    if (node.type === 'Identifier') return node.name || '';
    if (node.type === 'MemberAccess') {
      return this.getNodeText(node.expression) + '.' + node.memberName;
    }
    return '';
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
