/**
 * Uninitialized Local Variable Security Rule
 *
 * Detects uninitialized local variables, especially storage pointers,
 * which can lead to unexpected behavior or security vulnerabilities.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class UninitializedLocalRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/uninitialized-local',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Uninitialized Local Variable',
      description:
        'Detects uninitialized local variables, particularly storage pointers. ' +
        'Uninitialized storage pointers can point to arbitrary storage slots, causing state corruption.',
      recommendation:
        'Always initialize local variables. For structs, use explicit initialization: ' +
        'Data memory data = Data(value); or Data storage data = storageArray[index];',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'VariableDeclarationStatement') {
      this.checkVariableDeclaration(node, context);
    }

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
    if (!node.variables || !Array.isArray(node.variables)) return;

    for (const variable of node.variables) {
      // Check if variable is uninitialized
      if (!node.initialValue) {
        const typeName = variable.typeName;
        const storageLocation = variable.storageLocation;

        // Check for uninitialized storage pointers or complex types
        if (
          storageLocation === 'storage' ||
          typeName?.type === 'UserDefinedTypeName' ||
          typeName?.type === 'ArrayTypeName'
        ) {
          this.reportIssue(
            node,
            `Uninitialized local variable '${variable.name}'. This can lead to unexpected behavior. ` +
              'Always initialize local variables, especially storage pointers and complex types.',
            context
          );
        }
      }
    }
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
