/**
 * Variable Name Mixedcase Rule
 *
 * Enforces mixedCase (camelCase) naming convention for local variables and function parameters.
 * Following Solidity style guide best practices.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class VarNameMixedcaseRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/var-name-mixedcase',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Variable Name Mixedcase',
      description:
        'Enforces mixedCase (camelCase) naming convention for local variables and function parameters. ' +
        'Variable names should start with a lowercase letter and use camelCase for multi-word names. ' +
        'Leading underscore is allowed for private scope indication. This follows the Solidity style guide.',
      recommendation:
        'Use mixedCase for variable names. ' +
        'Examples: balance, totalSupply, myVariable. ' +
        'Use leading underscore for private indication: _privateVar',
    });
  }

  analyze(context: AnalysisContext): void {
    // Traverse AST to find variable declarations
    this.visitNode(context.ast, (node) => {
      if (node.type === 'VariableDeclaration') {
        this.checkNamingConvention(node, context);
      }
    });
  }

  private visitNode(node: any, callback: (node: any) => void): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    callback(node);

    // Recursively visit all child nodes
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((item) => this.visitNode(item, callback));
      } else if (typeof child === 'object' && child !== null) {
        this.visitNode(child, callback);
      }
    }
  }

  private checkNamingConvention(node: any, context: AnalysisContext): void {
    const name = node.name;
    if (!name || !node.loc) {
      return;
    }

    // Skip state variables (they are at contract level)
    // Only check local variables and function parameters
    if (node.isStateVar) {
      return;
    }

    // Check if name follows mixedCase convention
    if (!this.isMixedCase(name)) {
      this.reportInvalidName(node.loc.start.line, name, context);
    }
  }

  private isMixedCase(name: string): boolean {
    // mixedCase rules:
    // 1. May start with underscore (for private scope indication)
    // 2. After optional underscore, must start with lowercase letter
    // 3. No underscores in the rest of the name
    // 4. Can contain uppercase letters (camelCase)

    // Handle leading underscore
    const nameWithoutLeadingUnderscore = name.startsWith('_') ? name.slice(1) : name;

    // After removing leading underscore, check mixedCase rules
    // Must start with lowercase letter
    if (!/^[a-z]/.test(nameWithoutLeadingUnderscore)) {
      return false;
    }

    // No underscores in the rest of the name
    if (nameWithoutLeadingUnderscore.includes('_')) {
      return false;
    }

    // Valid characters: letters and numbers only
    if (!/^[a-zA-Z0-9]+$/.test(nameWithoutLeadingUnderscore)) {
      return false;
    }

    return true;
  }

  private reportInvalidName(
    line: number,
    name: string,
    context: AnalysisContext
  ): void {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Variable '${name}' should use mixedCase naming convention. ` +
        `Start with lowercase letter and use camelCase for multi-word names (e.g., myVariable, totalSupply).`,
      location: {
        start: { line, column: 0 },
        end: { line, column: 1 },
      },
    });
  }
}
