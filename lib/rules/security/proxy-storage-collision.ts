/**
 * Proxy Storage Collision Security Rule
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class ProxyStorageCollisionRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/proxy-storage-collision',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Proxy Storage Collision',
      description:
        'Detects potential storage collisions in upgradeable proxy patterns where proxy and implementation storage layouts may overlap.',
      recommendation:
        'Use unstructured storage pattern for proxy state. Follow EIP-1967 for proxy storage slots. Use OpenZeppelin upgradeable contracts library.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'ContractDefinition') {
      this.checkProxy(node, context);
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

  private checkProxy(node: any, context: AnalysisContext): void {
    const name = node.name?.toLowerCase() || '';

    if (name.includes('proxy') || name.includes('upgradeable') || name.includes('delegate')) {
      const hasStateVars = this.hasStateVariables(node);

      if (hasStateVars && node.loc) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Proxy contract '${node.name}' has state variables. This may cause storage collisions. Use unstructured storage pattern (EIP-1967).`,
          location: {
            start: { line: node.loc.start.line, column: node.loc.start.column },
            end: { line: node.loc.end.line, column: node.loc.end.column },
          },
        });
      }
    }
  }

  private hasStateVariables(node: any): boolean {
    if (!node.subNodes) return false;

    return node.subNodes.some((subNode: any) => subNode.type === 'StateVariableDeclaration');
  }
}
