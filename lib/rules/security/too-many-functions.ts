/**
 * Too Many Functions Security Rule
 *
 * Detects contracts with excessive number of functions which can indicate
 * high complexity, poor design, or insufficient separation of concerns.
 * Large contracts are harder to audit, test, and maintain.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#too-many-functions
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects contracts with too many functions (default: >50):
 * - High complexity that reduces maintainability
 * - Potential design issues (God objects)
 * - Increased audit difficulty
 * - Poor separation of concerns
 *
 * Does not flag:
 * - Contracts with 50 or fewer functions
 * - Interfaces (expected to have many functions)
 *
 * @example Problematic
 * ```solidity
 * // Bad: Too many functions in one contract
 * contract LargeContract {
 *   function func1() public {}
 *   function func2() public {}
 *   // ... 60 more functions
 * }
 * ```
 *
 * @example Better
 * ```solidity
 * // Good: Split into multiple focused contracts
 * contract UserManagement {
 *   function addUser() public {}
 *   function removeUser() public {}
 * }
 *
 * contract TokenManagement {
 *   function mint() public {}
 *   function burn() public {}
 * }
 * ```
 */
export class TooManyFunctionsRule extends AbstractRule {
  private static readonly MAX_FUNCTIONS = 50;

  constructor() {
    super({
      id: 'security/too-many-functions',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Too Many Functions',
      description:
        'Detects contracts with excessive number of functions (more than 50). ' +
        'Large contracts with many functions indicate high complexity, potential design issues, ' +
        'and reduced maintainability. They are harder to audit, test, and reason about.',
      recommendation:
        'Refactor the contract into multiple smaller, focused contracts using composition. ' +
        'Apply the Single Responsibility Principle: each contract should have one clear purpose. ' +
        'Consider using libraries for utility functions, and inheritance or delegation for shared behavior.',
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
   * Check if contract has too many functions
   */
  private checkContract(node: any, context: AnalysisContext): void {
    // Skip interfaces - they're expected to have many functions
    if (node.kind === 'interface') {
      return;
    }

    // Count functions in the contract
    const functionCount = this.countFunctions(node);

    if (functionCount > TooManyFunctionsRule.MAX_FUNCTIONS) {
      this.reportIssue(
        node,
        context,
        functionCount,
        `Contract '${node.name || 'unnamed'}' has ${functionCount} functions, ` +
          `which exceeds the recommended maximum of ${TooManyFunctionsRule.MAX_FUNCTIONS}. ` +
          `This indicates high complexity and potential design issues. Consider refactoring into multiple smaller contracts.`
      );
    }
  }

  /**
   * Count all functions in a contract
   */
  private countFunctions(contractNode: any): number {
    if (!contractNode.subNodes || !Array.isArray(contractNode.subNodes)) {
      return 0;
    }

    return contractNode.subNodes.filter((node: any) => node.type === 'FunctionDefinition').length;
  }

  /**
   * Report a too-many-functions issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
    functionCount: number,
    message: string
  ): void {
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
        suggestion: `Current: ${functionCount} functions. Consider splitting into ${Math.ceil(functionCount / 25)} smaller contracts.`,
      },
    });
  }
}
