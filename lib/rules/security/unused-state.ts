/**
 * Unused State Security Rule
 *
 * Detects state variables that are declared but never used. Unused state
 * variables waste storage space and gas, and may indicate incomplete
 * implementation or dead code.
 *
 * @see https://github.com/crytic/slither/wiki/Detector-Documentation#unused-state-variables
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Detects unused state variables:
 * - Declared but never read or written
 * - Not part of public interface
 * - Wastes storage and gas
 *
 * Does not flag:
 * - Public/external state variables (part of interface)
 * - Constants (no storage cost)
 * - Variables used in functions
 *
 * @example Wasteful
 * ```solidity
 * // Bad: Unused state variable
 * contract Example {
 *   uint256 private unusedVar; // Never used, wastes storage
 *   uint256 public usedVar;
 * }
 * ```
 *
 * @example Clean
 * ```solidity
 * // Good: Only declare what you use
 * contract Example {
 *   uint256 public usedVar;
 * }
 * ```
 */
export class UnusedStateRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/unused-state',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Unused State Variable',
      description:
        'Detects state variables that are declared but never used. ' +
        'Unused state variables waste storage space and gas. ' +
        'They may indicate incomplete implementation or dead code.',
      recommendation:
        'Remove unused state variables to save storage and gas. ' +
        'If a variable is planned for future use, document it clearly with comments.',
    });
  }

  analyze(context: AnalysisContext): void {
    const contracts = this.findContracts(context.ast);

    for (const contract of contracts) {
      this.checkContract(contract, context);
    }
  }

  /**
   * Find all contracts in AST
   */
  private findContracts(node: any): any[] {
    const contracts: any[] = [];

    const walk = (n: any): void => {
      if (!n || typeof n !== 'object') {
        return;
      }

      if (n.type === 'ContractDefinition') {
        contracts.push(n);
      }

      for (const key in n) {
        if (key === 'loc' || key === 'range') {
          continue;
        }

        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach((child) => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(node);
    return contracts;
  }

  /**
   * Check contract for unused state variables
   */
  private checkContract(contract: any, context: AnalysisContext): void {
    const stateVars = this.getStateVariables(contract);
    const usedVars = this.getUsedVariables(contract);

    for (const stateVar of stateVars) {
      // Skip public/external variables (they're part of the interface)
      if (this.isPublicOrExternal(stateVar)) {
        continue;
      }

      // Skip constants (no storage cost)
      if (stateVar.isDeclaredConst || stateVar.isImmutable) {
        continue;
      }

      const varName = stateVar.name;
      if (varName && !usedVars.has(varName)) {
        this.reportIssue(
          stateVar,
          context,
          `State variable '${varName}' is declared but never used. ` +
            'Remove it to save storage and gas.'
        );
      }
    }
  }

  /**
   * Get all state variables from contract
   */
  private getStateVariables(contract: any): any[] {
    const stateVars: any[] = [];

    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return stateVars;
    }

    for (const node of contract.subNodes) {
      if (node.type === 'StateVariableDeclaration') {
        if (node.variables && Array.isArray(node.variables)) {
          stateVars.push(...node.variables);
        }
      }
    }

    return stateVars;
  }

  /**
   * Get set of used variable names
   */
  private getUsedVariables(contract: any): Set<string> {
    const used = new Set<string>();

    const walk = (node: any): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      // Track identifier usage
      if (node.type === 'Identifier') {
        used.add(node.name);
      }

      for (const key in node) {
        if (key === 'loc' || key === 'range') {
          continue;
        }

        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach((child) => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(contract);
    return used;
  }

  /**
   * Check if variable is public or external
   */
  private isPublicOrExternal(variable: any): boolean {
    const visibility = variable.visibility;
    return visibility === 'public' || visibility === 'external';
  }

  /**
   * Report an unused-state issue
   */
  private reportIssue(
    node: any,
    context: AnalysisContext,
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
        suggestion: 'Remove the unused state variable to save storage and deployment gas.',
      },
    });
  }
}
