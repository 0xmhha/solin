/**
 * Multiple Constructors Security Rule
 *
 * Detects contracts with multiple constructor definitions. While Solidity
 * only allows one constructor, having multiple definitions in old code or
 * during migration can cause confusion and errors.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#multiple-constructor-schemes
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects multiple constructor definitions:
 * - Multiple constructor() functions
 * - Legacy constructor with contract name
 * - Confusion during Solidity upgrades
 *
 * Does not flag:
 * - Single constructor per contract
 * - No constructor (default)
 *
 * @example Problematic
 * ```solidity
 * // Bad: Multiple constructors (compilation error in modern Solidity)
 * contract Example {
 *   constructor() { }
 *   constructor(uint256 x) { } // Error!
 * }
 * ```
 *
 * @example Correct
 * ```solidity
 * // Good: Single constructor with optional parameters
 * contract Example {
 *   constructor(uint256 x) {
 *     // initialization
 *   }
 * }
 * ```
 */
export class MultipleConstructorsRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/multiple-constructors',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Multiple Constructors',
      description:
        'Detects contracts with multiple constructor definitions. ' +
        'Solidity only allows one constructor per contract. Multiple definitions ' +
        'can indicate migration issues or confusion between old and new constructor syntax.',
      recommendation:
        'Use only one constructor per contract. If you need different initialization ' +
        'patterns, use factory functions or initialization functions with proper access control.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
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
   * Check if contract has multiple constructors
   */
  private checkContract(node: any, context: AnalysisContext): void {
    if (!node.subNodes || !Array.isArray(node.subNodes)) {
      return;
    }

    const constructors = node.subNodes.filter(
      (subNode: any) =>
        subNode.type === 'FunctionDefinition' &&
        (subNode.isConstructor || subNode.name === 'constructor')
    );

    if (constructors.length > 1) {
      this.reportIssue(
        node,
        context,
        constructors.length,
        `Contract '${node.name || 'unnamed'}' has ${constructors.length} constructor definitions. ` +
          'Solidity only allows one constructor per contract. This will cause a compilation error.'
      );
    }
  }

  /**
   * Report a multiple-constructors issue
   */
  private reportIssue(node: any, context: AnalysisContext, count: number, message: string): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: {
          line: node.loc.start.line,
          column: node.loc.start.column,
        },
        end: {
          line: node.loc.end.line,
          column: node.loc.end.column,
        },
      },
      metadata: {
        suggestion: `Remove ${count - 1} constructor(s). Keep only one constructor.`,
      },
    });
  }
}
