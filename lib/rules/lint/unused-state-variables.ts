/**
 * Unused State Variables Lint Rule
 *
 * Detects unused state variables (gas waste + code quality issue)
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * State variable tracking information
 */
interface StateVariableInfo {
  name: string;
  isPublic: boolean;
  isUsed: boolean;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

/**
 * Rule that detects unused state variables:
 * - Private/internal state variables never referenced
 * - Public variables always considered used (auto-generated getter)
 * - Tracks usage in functions, modifiers, events, constructors
 * - Handles structs, mappings, arrays
 */
export class UnusedStateVariablesRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/unused-state-variables',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Unused State Variables',
      description:
        'Detects state variables that are declared but never used. Unused state variables waste storage space and increase deployment costs unnecessarily.',
      recommendation:
        'Remove unused state variables to reduce contract size and deployment costs. If a variable will be used in future versions, consider adding a comment explaining its purpose.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Step 1: Collect all state variables
    const stateVariables = new Map<string, StateVariableInfo>();
    this.collectStateVariables(context.ast, stateVariables);

    // Step 2: Mark public variables as used (auto-generated getter)
    for (const [, info] of stateVariables) {
      if (info.isPublic) {
        info.isUsed = true;
      }
    }

    // Step 3: Find all variable usages
    this.findVariableUsages(context.ast, stateVariables);

    // Step 4: Report unused variables
    for (const [varName, info] of stateVariables) {
      if (!info.isUsed) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `State variable '${varName}' is declared but never used. Remove it to save storage and deployment costs.`,
          location: info.location,
        });
      }
    }
  }

  /**
   * Collect all state variables from the contract
   */
  private collectStateVariables(node: any, stateVariables: Map<string, StateVariableInfo>): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Look for ContractDefinition and its subNodes
    if (node.type === 'ContractDefinition') {
      if (Array.isArray(node.subNodes)) {
        for (const subNode of node.subNodes) {
          if (subNode.type === 'StateVariableDeclaration') {
            this.processStateVariableDeclaration(subNode, stateVariables);
          }
        }
      }
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.collectStateVariables(child, stateVariables));
      } else if (value && typeof value === 'object') {
        this.collectStateVariables(value, stateVariables);
      }
    }
  }

  /**
   * Process a state variable declaration
   */
  private processStateVariableDeclaration(
    node: any,
    stateVariables: Map<string, StateVariableInfo>
  ): void {
    if (!node.variables || !Array.isArray(node.variables)) {
      return;
    }

    for (const variable of node.variables) {
      if (!variable || !variable.name) {
        continue;
      }

      // Determine visibility
      const isPublic = variable.visibility === 'public';

      // Add to tracking map
      stateVariables.set(variable.name, {
        name: variable.name,
        isPublic,
        isUsed: false,
        location: {
          start: {
            line: variable.loc?.start.line ?? 0,
            column: variable.loc?.start.column ?? 0,
          },
          end: {
            line: variable.loc?.end.line ?? 0,
            column: variable.loc?.end.column ?? 0,
          },
        },
      });
    }
  }

  /**
   * Find all variable usages in the AST
   */
  private findVariableUsages(node: any, stateVariables: Map<string, StateVariableInfo>): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Skip StateVariableDeclaration nodes to avoid counting the declaration itself as usage
    if (node.type === 'StateVariableDeclaration') {
      return;
    }

    // Look for Identifier nodes
    if (node.type === 'Identifier') {
      const varName = node.name;
      const info = stateVariables.get(varName);
      if (info) {
        info.isUsed = true;
      }
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.findVariableUsages(child, stateVariables));
      } else if (value && typeof value === 'object') {
        this.findVariableUsages(value, stateVariables);
      }
    }
  }
}
