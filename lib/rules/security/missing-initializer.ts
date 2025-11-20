/**
 * Missing Initializer Security Rule
 *
 * Detects missing initializer functions in upgradeable contracts
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects missing initializer functions:
 * - Contracts with state variables but no constructor/initializer
 * - Important for upgradeable contracts
 * - Helps prevent uninitialized state issues
 */
export class MissingInitializer extends AbstractRule {
  constructor() {
    super({
      id: 'security/missing-initializer',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Missing initializer function',
      description:
        'Detects contracts with state variables but no constructor or initializer function. Upgradeable contracts should have an initialize function.',
      recommendation:
        'Add an initializer function for upgradeable contracts or a constructor for regular contracts to properly initialize state.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find contracts
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
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check contract for missing initializer
   */
  private checkContract(contract: any, context: AnalysisContext): void {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return;
    }

    // Check if contract has state variables
    const hasStateVariables = contract.subNodes.some(
      (node: any) => node.type === 'StateVariableDeclaration'
    );

    if (!hasStateVariables) {
      return; // No state to initialize
    }

    // Check for constructor or initializer
    const hasConstructor = contract.subNodes.some(
      (node: any) =>
        node.type === 'FunctionDefinition' &&
        (node.isConstructor || node.name === 'constructor')
    );

    const hasInitializer = contract.subNodes.some(
      (node: any) =>
        node.type === 'FunctionDefinition' &&
        node.name &&
        /^(initialize|init|setup)$/i.test(node.name)
    );

    if (!hasConstructor && !hasInitializer) {
      this.reportIssue(contract, context);
    }
  }

  /**
   * Report issue for missing initializer
   */
  private reportIssue(contract: any, context: AnalysisContext): void {
    if (!contract.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Contract '${contract.name || 'Unknown'}' has state variables but no constructor or initializer function.`,
      location: {
        start: {
          line: contract.loc.start.line,
          column: contract.loc.start.column,
        },
        end: {
          line: contract.loc.end.line,
          column: contract.loc.end.column,
        },
      },
    });
  }
}
