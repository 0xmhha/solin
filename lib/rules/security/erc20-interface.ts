/**
 * ERC20 Interface Security Rule
 *
 * Validates ERC20 interface implementation
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Required ERC20 functions
 */
const REQUIRED_ERC20_FUNCTIONS = [
  'totalSupply',
  'balanceOf',
  'transfer',
  'allowance',
  'approve',
  'transferFrom',
];

/**
 * Rule that validates ERC20 interface implementation:
 * - Checks for presence of all required ERC20 functions
 * - Helps ensure compliance with ERC20 standard
 * - Only checks contracts that appear to be tokens
 */
export class ERC20Interface extends AbstractRule {
  constructor() {
    super({
      id: 'security/erc20-interface',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Incomplete ERC20 interface',
      description:
        'Validates that contracts implementing token-like functionality include all required ERC20 functions (totalSupply, balanceOf, transfer, allowance, approve, transferFrom).',
      recommendation:
        'Implement all required ERC20 functions to ensure compliance with the standard and compatibility with wallets and exchanges.',
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
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check if contract implements ERC20 interface
   */
  private checkContract(contract: any, context: AnalysisContext): void {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return;
    }

    // Get all function names
    const functions = contract.subNodes
      .filter((node: any) => node.type === 'FunctionDefinition')
      .map((node: any) => node.name)
      .filter(Boolean);

    // Check if this looks like a token contract (has at least 2 ERC20 functions)
    const erc20FunctionsPresent = REQUIRED_ERC20_FUNCTIONS.filter(fn => functions.includes(fn));

    if (erc20FunctionsPresent.length >= 2) {
      // This appears to be a token contract, check for missing functions
      const missingFunctions = REQUIRED_ERC20_FUNCTIONS.filter(fn => !functions.includes(fn));

      if (missingFunctions.length > 0) {
        this.reportIssue(contract, missingFunctions, context);
      }
    }
  }

  /**
   * Report issue for missing ERC20 functions
   */
  private reportIssue(contract: any, missingFunctions: string[], context: AnalysisContext): void {
    if (!contract.loc) {
      return;
    }

    const functionList = missingFunctions.join(', ');

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Contract appears to implement ERC20 but is missing required functions: ${functionList}`,
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
