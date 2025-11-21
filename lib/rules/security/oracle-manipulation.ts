/**
 * Oracle Manipulation Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class OracleManipulationRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/oracle-manipulation',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Oracle Manipulation Vulnerability',
      description:
        'Detects potential oracle manipulation where price or data feeds may be vulnerable to manipulation through flash loans or single-source dependencies.',
      recommendation:
        'Use multiple oracle sources. Implement time-weighted average prices (TWAP). Add sanity checks on price changes. Use Chainlink or other decentralized oracles.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionCall') {
      this.checkPriceQuery(node, context);
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

  private checkPriceQuery(node: any, context: AnalysisContext): void {
    const expr = node.expression;
    if (!expr || expr.type !== 'MemberAccess') return;

    const methodName = expr.memberName;
    const priceKeywords = ['price', 'getPrice', 'latestAnswer', 'getReserves', 'balance'];

    const isPriceQuery = priceKeywords.some(keyword =>
      methodName?.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isPriceQuery && node.loc) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Potential oracle manipulation: price query detected. Ensure multiple oracles, TWAP, or other manipulation-resistant mechanisms are used.`,
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
  }
}
