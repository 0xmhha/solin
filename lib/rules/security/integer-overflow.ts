/**
 * Integer Overflow Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class IntegerOverflowRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/integer-overflow',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Integer Overflow/Underflow',
      description:
        'Detects potential integer overflow/underflow in Solidity versions before 0.8.0. Arithmetic operations without SafeMath can wrap around.',
      recommendation:
        'Use Solidity ^0.8.0 with built-in overflow checks, or use SafeMath library for older versions. Always validate arithmetic operations.',
    });
  }

  analyze(context: AnalysisContext): void {
    const version = this.getSolidityVersion(context.ast);

    // Only flag if version is < 0.8.0
    if (version && this.isVulnerableVersion(version)) {
      this.walkAst(context.ast, context);
    }
  }

  private getSolidityVersion(node: any): string | null {
    if (!node) return null;

    if (node.type === 'PragmaDirective' && node.name === 'solidity') {
      return node.value;
    }

    if (typeof node === 'object') {
      for (const key in node) {
        if (key === 'loc' || key === 'range') continue;
        const value = node[key];
        if (Array.isArray(value)) {
          for (const child of value) {
            const version = this.getSolidityVersion(child);
            if (version) return version;
          }
        } else if (value && typeof value === 'object') {
          const version = this.getSolidityVersion(value);
          if (version) return version;
        }
      }
    }

    return null;
  }

  private isVulnerableVersion(version: string): boolean {
    // Check if version is < 0.8.0
    return !version.includes('0.8') && !version.includes('>=0.8');
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'BinaryOperation') {
      this.checkOperation(node, context);
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

  private checkOperation(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    const dangerousOps = ['+', '-', '*', '/', '**'];

    if (dangerousOps.includes(node.operator)) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Unchecked arithmetic operation '${node.operator}' in Solidity < 0.8.0. Use SafeMath library to prevent overflow/underflow.`,
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
  }
}
