/**
 * Double Spend Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class DoubleSpendRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/double-spend',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Double Spend Vulnerability',
      description:
        'Detects patterns where tokens or ether could be spent twice due to missing balance updates or reentrancy.',
      recommendation:
        'Update balances before transfers. Use checks-effects-interactions pattern. Implement reentrancy guards.',
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

    const transfers: any[] = [];
    const balanceUpdates: any[] = [];

    this.collectTransfersAndUpdates(node.body, transfers, balanceUpdates);

    // Check if transfers happen before balance updates
    for (const transfer of transfers) {
      const hasUpdateBefore = balanceUpdates.some(
        update => update.loc?.start.line < transfer.loc?.start.line
      );

      if (!hasUpdateBefore && transfer.loc) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message:
            'Potential double-spend: transfer before balance update. Update balances before transferring to prevent reentrancy-based double spending.',
          location: {
            start: { line: transfer.loc.start.line, column: transfer.loc.start.column },
            end: { line: transfer.loc.end.line, column: transfer.loc.end.column },
          },
        });
      }
    }
  }

  private collectTransfersAndUpdates(node: any, transfers: any[], updates: any[]): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'MemberAccess') {
      if (
        node.memberName === 'transfer' ||
        node.memberName === 'send' ||
        node.memberName === 'call'
      ) {
        transfers.push(node);
      }
    }

    if (node.type === 'BinaryOperation' && node.operator === '=') {
      if (node.left?.type === 'IndexAccess') {
        updates.push(node);
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.collectTransfersAndUpdates(child, transfers, updates));
      } else if (value && typeof value === 'object') {
        this.collectTransfersAndUpdates(value, transfers, updates);
      }
    }
  }
}
