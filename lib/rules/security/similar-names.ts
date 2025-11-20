/**
 * Similar Names Security Rule
 *
 * Detects variable/function names that are too similar
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects similar names:
 * - Names that differ only in case
 * - Names with similar characters
 * - Can cause confusion and bugs
 */
export class SimilarNames extends AbstractRule {
  constructor() {
    super({
      id: 'security/similar-names',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Similar names detected',
      description:
        'Detects variable or function names that are too similar to each other. This can cause confusion and lead to bugs.',
      recommendation:
        'Use distinct names for variables and functions to improve code readability and prevent confusion.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to collect and compare names
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
   * Check contract for similar names
   */
  private checkContract(contract: any, context: AnalysisContext): void {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return;
    }

    const names: Array<{ name: string; node: any; type: string }> = [];

    // Collect state variable names
    for (const node of contract.subNodes) {
      if (node.type === 'StateVariableDeclaration' && node.variables) {
        for (const variable of node.variables) {
          if (variable.name) {
            names.push({
              name: variable.name,
              node: variable,
              type: 'state variable',
            });
          }
        }
      }
    }

    // Collect function names
    for (const node of contract.subNodes) {
      if (node.type === 'FunctionDefinition' && node.name) {
        names.push({
          name: node.name,
          node,
          type: 'function',
        });
      }
    }

    // Compare names
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (this.areSimilar(names[i]!.name, names[j]!.name)) {
          this.reportIssue(names[i]!, names[j]!, context);
        }
      }
    }
  }

  /**
   * Check if two names are similar
   */
  private areSimilar(name1: string, name2: string): boolean {
    // Ignore if names are identical
    if (name1 === name2) {
      return false;
    }

    // Check if names differ only in case
    if (name1.toLowerCase() === name2.toLowerCase()) {
      return true;
    }

    // Check Levenshtein distance for very similar names
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);

    // If distance is 1 and names are reasonably long, they're similar
    return distance === 1 && maxLength >= 5;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j - 1]! + cost
        );
      }
    }

    return matrix[len1]![len2]!;
  }

  /**
   * Report similar names issue
   */
  private reportIssue(
    item1: { name: string; node: any; type: string },
    item2: { name: string; node: any; type: string },
    context: AnalysisContext
  ): void {
    if (!item1.node.loc || !item2.node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `${item1.type} '${item1.name}' is very similar to ${item2.type} '${item2.name}'. Consider using more distinct names.`,
      location: {
        start: {
          line: item2.node.loc.start.line,
          column: item2.node.loc.start.column,
        },
        end: {
          line: item2.node.loc.end.line,
          column: item2.node.loc.end.column,
        },
      },
    });
  }
}
