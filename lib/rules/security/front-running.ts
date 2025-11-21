/**
 * Front Running Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class FrontRunningRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/front-running',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Front Running Vulnerability',
      description:
        'Detects transaction ordering dependence (TOD) vulnerabilities where transaction order affects execution outcome.',
      recommendation:
        'Use commit-reveal schemes. Implement batch auctions. Use submarine sends. Consider using Flashbots or private mempools.',
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
    if (!node.body || !node.loc) return;

    const hasStateRead = this.hasStateRead(node.body);
    const hasStateWrite = this.hasStateWrite(node.body);
    const hasValueTransfer = this.hasValueTransfer(node.body);

    // If function reads state, then writes based on that state, it's vulnerable to front-running
    if (hasStateRead && hasStateWrite && hasValueTransfer) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message:
          'Potential front-running vulnerability: function reads state, modifies state, and transfers value. Consider using commit-reveal or other anti-front-running patterns.',
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
  }

  private hasStateRead(node: any): boolean {
    return this.searchPattern(node, n => n.type === 'IndexAccess');
  }

  private hasStateWrite(node: any): boolean {
    return this.searchPattern(node, n => n.type === 'BinaryOperation' && n.operator === '=');
  }

  private hasValueTransfer(node: any): boolean {
    return this.searchPattern(
      node,
      n => n.type === 'MemberAccess' && (n.memberName === 'transfer' || n.memberName === 'send')
    );
  }

  private searchPattern(node: any, predicate: (n: any) => boolean): boolean {
    if (!node || typeof node !== 'object') return false;
    if (predicate(node)) return true;

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some(child => this.searchPattern(child, predicate))) return true;
      } else if (value && typeof value === 'object') {
        if (this.searchPattern(value, predicate)) return true;
      }
    }

    return false;
  }
}
