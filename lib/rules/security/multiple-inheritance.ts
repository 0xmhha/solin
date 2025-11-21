/**
 * Multiple Inheritance Security Rule
 *
 * Detects contracts using multiple inheritance
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects multiple inheritance:
 * - Can increase complexity
 * - May cause diamond problem
 * - Should be used carefully
 */
export class MultipleInheritance extends AbstractRule {
  constructor() {
    super({
      id: 'security/multiple-inheritance',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Multiple inheritance detected',
      description:
        'Detects contracts that inherit from multiple base contracts. Multiple inheritance can increase complexity and may lead to unexpected behavior.',
      recommendation:
        "Consider simplifying inheritance hierarchy. Ensure proper understanding of Solidity's C3 linearization and the diamond problem.",
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find contracts
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check contracts
    if (node.type === 'ContractDefinition') {
      this.checkContract(node, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check contract for multiple inheritance
   */
  private checkContract(contract: any, context: AnalysisContext): void {
    if (!contract.baseContracts || !Array.isArray(contract.baseContracts)) {
      return;
    }

    if (contract.baseContracts.length > 1) {
      this.reportIssue(contract, contract.baseContracts.length, context);
    }
  }

  /**
   * Report issue for multiple inheritance
   */
  private reportIssue(contract: any, count: number, context: AnalysisContext): void {
    if (!contract.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Contract '${contract.name || 'Unknown'}' inherits from ${count} base contracts. Multiple inheritance increases complexity.`,
      location: {
        start: {
          line: contract.loc.start.line,
          column: contract.loc.start.column,
        },
        end: {
          line: contract.loc.end.line,
          column: contract.loc.end.column,
        },
      },
    });
  }
}
