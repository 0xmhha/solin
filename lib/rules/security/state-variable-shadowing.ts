/**
 * State Variable Shadowing Security Rule
 *
 * Detects state variables shadowing inherited variables
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects state variable shadowing:
 * - State variables in derived contracts that shadow base contract variables
 * - Can cause confusion and unexpected behavior
 * - Storage layout issues in inheritance
 */
export class StateVariableShadowing extends AbstractRule {
  constructor() {
    super({
      id: 'security/state-variable-shadowing',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'State variable shadows inherited variable',
      description:
        'Detects state variables that shadow variables from inherited contracts. This can cause confusion and unexpected behavior.',
      recommendation:
        'Use unique names for state variables across the inheritance hierarchy to avoid shadowing.',
    });
  }

  private contractVariables = new Map<string, Set<string>>();

  analyze(context: AnalysisContext): void {
    // First pass: collect all state variables per contract
    this.collectVariables(context.ast);

    // Second pass: check for shadowing
    this.checkShadowing(context.ast, context);
  }

  /**
   * Collect all state variables from contracts
   */
  private collectVariables(node: any): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'ContractDefinition' && node.name) {
      const variables = new Set<string>();

      if (node.subNodes && Array.isArray(node.subNodes)) {
        for (const subNode of node.subNodes) {
          if (subNode.type === 'StateVariableDeclaration' && subNode.variables) {
            for (const variable of subNode.variables) {
              if (variable.name) {
                variables.add(variable.name);
              }
            }
          }
        }
      }

      this.contractVariables.set(node.name, variables);
    }

    // Recursively process children
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.collectVariables(child));
      } else if (value && typeof value === 'object') {
        this.collectVariables(value);
      }
    }
  }

  /**
   * Check for shadowing in contracts
   */
  private checkShadowing(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'ContractDefinition' && node.name) {
      this.checkContract(node, context);
    }

    // Recursively process children
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkShadowing(child, context));
      } else if (value && typeof value === 'object') {
        this.checkShadowing(value, context);
      }
    }
  }

  /**
   * Check contract for state variable shadowing
   */
  private checkContract(contract: any, context: AnalysisContext): void {
    if (!contract.baseContracts || !Array.isArray(contract.baseContracts)) {
      return;
    }

    if (contract.baseContracts.length === 0) {
      return;
    }

    // Get variables from base contracts
    const baseVariables = new Set<string>();

    for (const baseContract of contract.baseContracts) {
      if (baseContract.baseName && baseContract.baseName.namePath) {
        const baseName = baseContract.baseName.namePath;
        const baseVars = this.contractVariables.get(baseName);

        if (baseVars) {
          baseVars.forEach(v => baseVariables.add(v));
        }
      }
    }

    // Check for shadowing
    if (contract.subNodes && Array.isArray(contract.subNodes)) {
      for (const node of contract.subNodes) {
        if (node.type === 'StateVariableDeclaration' && node.variables) {
          for (const variable of node.variables) {
            if (variable.name && baseVariables.has(variable.name)) {
              this.reportIssue(variable, variable.name, context);
            }
          }
        }
      }
    }
  }

  /**
   * Report shadowing issue
   */
  private reportIssue(
    node: any,
    name: string,
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
        `State variable '${name}' shadows an inherited variable. Use a different name to avoid confusion.`,
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
