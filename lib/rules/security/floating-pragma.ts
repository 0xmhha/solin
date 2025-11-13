/**
 * Floating Pragma Security Rule
 *
 * Detects non-fixed pragma directives that allow multiple compiler versions.
 * Using floating pragmas can lead to different bytecode being generated
 * depending on the compiler version used.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class FloatingPragmaRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/floating-pragma',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Floating Pragma',
      description:
        'Detects floating pragma directives that do not lock the Solidity version. Floating pragmas (^, >, <, >=, <=) allow the contract to be compiled with different compiler versions, potentially producing different bytecode and introducing bugs or vulnerabilities.',
      recommendation:
        'Lock the pragma to a specific Solidity version to ensure consistent compilation. Use exact version (e.g., "pragma solidity 0.8.19;") instead of floating operators.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for PragmaDirective
    if (node.type === 'PragmaDirective') {
      this.checkPragmaDirective(node, context);
    }

    // Recursively traverse
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

  private checkPragmaDirective(node: any, context: AnalysisContext): void {
    // Only check solidity pragmas
    if (node.name !== 'solidity') return;

    // Get the version string
    const version = node.value;
    if (!version) return;

    // Check for floating operators: ^, >, <, >=, <=
    if (this.isFloatingVersion(version)) {
      this.reportIssue(node, version, context);
    }
  }

  private isFloatingVersion(version: string): boolean {
    // Check for floating operators
    const floatingOperators = ['^', '>', '<', '>=', '<='];
    return floatingOperators.some((op) => version.includes(op));
  }

  private reportIssue(node: any, version: string, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Floating pragma detected: "pragma solidity ${version}". Locking the pragma ensures consistent bytecode across different compiler versions. Use a fixed version (e.g., "0.8.19") instead.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
