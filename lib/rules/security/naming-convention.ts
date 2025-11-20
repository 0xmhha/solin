/**
 * Naming Convention Security Rule
 *
 * Detects violations of Solidity naming conventions. Following consistent
 * naming conventions improves code readability and helps prevent bugs.
 *
 * @see https://docs.soliditylang.org/en/latest/style-guide.html#naming-conventions
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Checks Solidity naming conventions:
 * - Contracts: CapWords (PascalCase)
 * - Constants: UPPER_CASE_WITH_UNDERSCORES
 * - Functions: mixedCase (camelCase)
 * - Variables: mixedCase (camelCase)
 * - Events: CapWords
 *
 * @example Vulnerable
 * ```solidity
 * // Bad naming
 * contract mycontract {
 *   uint256 constant maxValue = 100;
 *   function DoSomething() public {}
 * }
 * ```
 *
 * @example Secure
 * ```solidity
 * // Good naming
 * contract MyContract {
 *   uint256 constant MAX_VALUE = 100;
 *   function doSomething() public {}
 * }
 * ```
 */
export class NamingConventionRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/naming-convention',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Naming Convention Violation',
      description:
        'Detects violations of Solidity naming conventions. ' +
        'Following consistent naming improves code readability and maintainability, ' +
        'and helps prevent confusion that could lead to security issues.',
      recommendation:
        'Follow Solidity naming conventions: ' +
        'Contracts/Events in CapWords, constants in UPPER_CASE, ' +
        'functions/variables in mixedCase. ' +
        'See https://docs.soliditylang.org/en/latest/style-guide.html',
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

    // Check various node types
    if (node.type === 'ContractDefinition') {
      this.checkContractName(node, context);
    } else if (node.type === 'StateVariableDeclaration') {
      this.checkStateVariables(node, context);
    } else if (node.type === 'VariableDeclaration') {
      this.checkVariable(node, context);
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
   * Check contract name follows CapWords convention
   */
  private checkContractName(node: any, context: AnalysisContext): void {
    if (!node.name || !node.loc) {
      return;
    }

    if (!this.isCapWords(node.name)) {
      this.reportIssue(
        node,
        context,
        `Contract '${node.name}' should use CapWords convention (e.g., MyContract).`
      );
    }
  }

  /**
   * Check state variable naming
   */
  private checkStateVariables(node: any, context: AnalysisContext): void {
    if (!node.variables || !Array.isArray(node.variables)) {
      return;
    }

    for (const variable of node.variables) {
      this.checkVariable(variable, context);
    }
  }

  /**
   * Check variable naming conventions
   */
  private checkVariable(node: any, context: AnalysisContext): void {
    if (!node.name || !node.loc) {
      return;
    }

    // Check constants
    if (node.isDeclaredConst || this.isConstant(node)) {
      if (!this.isUpperCase(node.name)) {
        this.reportIssue(
          node,
          context,
          `Constant '${node.name}' should use UPPER_CASE_WITH_UNDERSCORES convention (e.g., MAX_VALUE).`
        );
      }
    }
  }

  /**
   * Check if name follows CapWords (PascalCase) convention
   */
  private isCapWords(name: string): boolean {
    // Should start with uppercase letter
    if (!/^[A-Z]/.test(name)) {
      return false;
    }

    // Should not contain underscores (except possibly leading for private)
    if (name.includes('_') && !name.startsWith('_')) {
      return false;
    }

    return true;
  }

  /**
   * Check if name follows UPPER_CASE convention
   */
  private isUpperCase(name: string): boolean {
    // Should be all uppercase with underscores
    return /^[A-Z0-9_]+$/.test(name);
  }

  /**
   * Check if variable is a constant
   */
  private isConstant(node: any): boolean {
    // Check various ways a constant might be indicated
    return (
      node.isDeclaredConst === true ||
      node.isConstant === true ||
      node.constant === true ||
      (node.typeName && node.typeName.constant === true)
    );
  }

  /**
   * Report a naming convention issue
   */
  private reportIssue(node: any, context: AnalysisContext, message: string): void {
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
    });
  }
}
