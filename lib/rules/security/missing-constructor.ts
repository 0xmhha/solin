/**
 * Missing Constructor Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class MissingConstructorRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/missing-constructor',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Missing Constructor in Inherited Contract',
      description:
        'Detects contracts that inherit from other contracts but do not call parent constructors, potentially leaving state uninitialized.',
      recommendation:
        'Always call parent constructors in derived contracts. Use constructor() ParentContract() syntax to ensure proper initialization.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'ContractDefinition') {
      this.checkContract(node, context);
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

  private checkContract(node: any, context: AnalysisContext): void {
    const baseContracts = node.baseContracts || [];

    if (baseContracts.length === 0) return;

    const hasConstructor = this.hasConstructorWithParentCall(node);

    if (!hasConstructor && node.loc) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Contract '${node.name}' inherits from base contracts but may not call parent constructors. Ensure proper initialization.`,
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
  }

  private hasConstructorWithParentCall(node: any): boolean {
    if (!node.subNodes) return false;

    for (const subNode of node.subNodes) {
      if (subNode.type === 'FunctionDefinition' && subNode.isConstructor) {
        return true;
      }
    }

    return false;
  }
}
