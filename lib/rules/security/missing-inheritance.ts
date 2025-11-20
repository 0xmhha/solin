/**
 * Missing Inheritance Security Rule
 *
 * Detects functions or modifiers marked with 'override' but the contract
 * doesn't declare any base contracts. This indicates a logic error where
 * inheritance declaration is missing.
 *
 * @see https://docs.soliditylang.org/en/latest/contracts.html#function-overriding
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects missing inheritance declarations:
 * - Functions with 'override' modifier but no base contract
 * - Modifiers with 'override' but no base contract
 * - Indicates missing 'is BaseContract' declaration
 *
 * @example Vulnerable
 * ```solidity
 * // Bad: override without inheritance
 * contract Example {
 *   function transfer() public override returns (bool) {
 *     // Missing: contract Example is IERC20
 *   }
 * }
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good: proper inheritance
 * contract Example is IERC20 {
 *   function transfer() public override returns (bool) {
 *     // Correct
 *   }
 * }
 * ```
 */
export class MissingInheritanceRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/missing-inheritance',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Missing Inheritance Declaration',
      description:
        'Detects functions or modifiers with the override keyword but the contract ' +
        'does not declare any base contracts. This indicates a missing inheritance ' +
        'declaration (is BaseContract) which will cause compilation errors or logic issues.',
      recommendation:
        'Add the appropriate base contract inheritance using "is BaseContract". ' +
        'If the function should not override anything, remove the override keyword. ' +
        'Ensure all overridden functions are declared in a base contract or interface.',
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

    // Check contract definitions
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
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check contract for override without inheritance
   */
  private checkContract(node: any, context: AnalysisContext): void {
    // Check if contract has base contracts
    const hasBaseContracts =
      node.baseContracts && node.baseContracts.length > 0;

    // Skip if contract has inheritance
    if (hasBaseContracts) {
      return;
    }

    // Skip interfaces (they don't need inheritance for override)
    if (node.kind === 'interface') {
      return;
    }

    // Check all contract parts for override keyword
    if (node.subNodes) {
      for (const subNode of node.subNodes) {
        this.checkForOverride(subNode, node.name, context);
      }
    }
  }

  /**
   * Check if node has override keyword
   */
  private checkForOverride(
    node: any,
    contractName: string,
    context: AnalysisContext
  ): void {
    if (!node) {
      return;
    }

    // Check function definitions
    if (node.type === 'FunctionDefinition') {
      if (this.hasOverrideModifier(node)) {
        this.reportIssue(
          node,
          contractName,
          `Function '${node.name || 'fallback'}' has override keyword`,
          context
        );
      }
    }

    // Check modifier definitions
    if (node.type === 'ModifierDefinition') {
      if (this.hasOverrideModifier(node)) {
        this.reportIssue(
          node,
          contractName,
          `Modifier '${node.name}' has override keyword`,
          context
        );
      }
    }
  }

  /**
   * Check if node has override modifier
   */
  private hasOverrideModifier(node: any): boolean {
    // Check override field directly (most common in AST)
    if (node.override === true || node.override) {
      return true;
    }

    // Check for override in modifiers array
    if (node.modifiers && Array.isArray(node.modifiers)) {
      for (const modifier of node.modifiers) {
        if (typeof modifier === 'string' && modifier === 'override') {
          return true;
        }
        if (
          modifier &&
          typeof modifier === 'object' &&
          modifier.name === 'override'
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Report a missing inheritance issue
   */
  private reportIssue(
    node: any,
    contractName: string,
    details: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `${details} but contract '${contractName}' does not inherit from any base contract. ` +
        'Add inheritance declaration (is BaseContract) or remove the override keyword.',
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
    });
  }
}
