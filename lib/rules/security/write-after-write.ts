/**
 * Write After Write Security Rule
 *
 * Detects redundant writes to the same variable.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class WriteAfterWriteRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/write-after-write',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Write After Write',
      description:
        'Detects redundant writes where a variable is written multiple times without being read. ' +
        'This wastes gas and may indicate a logic error.',
      recommendation:
        'Remove redundant writes. If both writes are intentional, document why or refactor the logic.',
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
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkFunction(node: any, context: AnalysisContext): void {
    if (!node.body) return;

    const writes = new Map<string, any[]>();
    this.collectWrites(node.body, writes);

    // Check for variables written multiple times
    for (const [varName, writeNodes] of writes) {
      if (writeNodes.length > 1) {
        this.reportIssue(
          writeNodes[writeNodes.length - 1],
          `Redundant write to '${varName}'. Variable is written ${writeNodes.length} times without being read. ` +
            'This wastes gas and may indicate a logic error. Remove redundant assignments.',
          context
        );
      }
    }
  }

  private collectWrites(node: any, writes: Map<string, any[]>): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'BinaryOperation' && node.operator === '=') {
      const left = node.left;
      if (left?.type === 'Identifier') {
        const varName = left.name;
        if (!writes.has(varName)) {
          writes.set(varName, []);
        }
        writes.get(varName)!.push(node);
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.collectWrites(child, writes));
      } else if (value && typeof value === 'object') {
        this.collectWrites(value, writes);
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
