/**
 * Function Name Mixedcase Rule
 *
 * Enforces mixedCase (camelCase) naming convention for functions.
 * Following Solidity style guide best practices.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class FunctionNameMixedcaseRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/function-name-mixedcase',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Function Name Mixedcase',
      description:
        'Enforces mixedCase (camelCase) naming convention for functions. ' +
        'Function names should start with a lowercase letter and use camelCase for multi-word names. ' +
        'Internal/private functions may use leading underscore. This follows the Solidity style guide.',
      recommendation:
        'Use mixedCase for function names. ' +
        'Examples: transfer, transferFrom, balanceOf. ' +
        'Internal/private functions may use leading underscore: _internalHelper',
    });
  }

  analyze(context: AnalysisContext): void {
    // Traverse AST to find function definitions
    this.visitNode(context.ast, (node) => {
      if (node.type === 'FunctionDefinition') {
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

    // Skip special functions (constructor, fallback, receive)
    if (this.isSpecialFunction(name)) {
      return;
    }

    // Check if name follows mixedCase convention
    if (!this.isMixedCase(name)) {
      this.reportInvalidName(node.loc.start.line, name, context);
    }
  }

  private isSpecialFunction(name: string): boolean {
    // Constructor, fallback, receive are special functions
    return name === 'constructor' || name === 'fallback' || name === 'receive';
  }

  private isMixedCase(name: string): boolean {
    // mixedCase rules:
    // 1. May start with underscore (for internal/private functions)
    // 2. After optional underscore, must start with lowercase letter
    // 3. No underscores in the rest of the name
    // 4. Can contain uppercase letters (camelCase)

    // Handle leading underscore for internal/private functions
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
        `Function '${name}' should use mixedCase naming convention. ` +
        `Start with lowercase letter and use camelCase for multi-word names (e.g., myFunction, transferFrom).`,
      location: {
        start: { line, column: 0 },
        end: { line, column: 1 },
      },
    });
  }
}
