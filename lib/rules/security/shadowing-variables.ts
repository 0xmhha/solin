/**
 * Shadowing Variables Security Rule
 *
 * Detects variable shadowing in inheritance chains where child contracts
 * declare variables with the same name as parent contract variables.
 * This can lead to confusion and unintended bugs.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface StateVariable {
  name: string;
  contractName: string;
  node: any;
}

/**
 * Rule that detects variable shadowing:
 * - State variables shadowing inherited state variables
 * - Function parameters shadowing inherited state variables
 * - Local variables shadowing inherited state variables
 *
 * Safe patterns (excluded):
 * - Variables in contracts without inheritance
 * - Variables with unique names in inheritance chain
 */
export class ShadowingVariablesRule extends AbstractRule {
  private contractMap: Map<string, any> = new Map();
  private stateVarsMap: Map<string, StateVariable[]> = new Map();

  constructor() {
    super({
      id: 'security/shadowing-variables',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Shadowing Variables',
      description:
        'Detects variable shadowing in inheritance chains. Shadowing occurs when a variable in a derived contract has the same name as a variable in a parent contract, which can lead to confusion and unintended bugs.',
      recommendation:
        'Rename variables to avoid shadowing. Use unique, descriptive names for all variables in inheritance hierarchies. Consider prefixing variable names with their scope or purpose.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Reset state for each file
    this.contractMap.clear();
    this.stateVarsMap.clear();

    // Phase 1: Collect all contracts and their state variables
    this.collectContracts(context.ast);

    // Phase 2: Check for shadowing in each contract
    for (const contract of this.contractMap.values()) {
      this.checkContractShadowing(contract, context);
    }
  }

  /**
   * Collect all contracts and their state variables
   */
  private collectContracts(node: any): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'ContractDefinition') {
      const contractName = node.name;
      this.contractMap.set(contractName, node);

      // Collect state variables for this contract
      const stateVars = this.collectStateVariables(node);
      this.stateVarsMap.set(contractName, stateVars);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.collectContracts(child));
      } else if (value && typeof value === 'object') {
        this.collectContracts(value);
      }
    }
  }

  /**
   * Collect state variables from a contract
   */
  private collectStateVariables(contract: any): StateVariable[] {
    const variables: StateVariable[] = [];

    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return variables;
    }

    for (const node of contract.subNodes) {
      if (node.type === 'StateVariableDeclaration' && node.variables) {
        for (const variable of node.variables) {
          variables.push({
            name: variable.name,
            contractName: contract.name,
            node: variable,
          });
        }
      }
    }

    return variables;
  }

  /**
   * Check for shadowing in a contract
   */
  private checkContractShadowing(contract: any, context: AnalysisContext): void {
    // Get inherited state variables
    const inheritedVars = this.getInheritedStateVariables(contract);

    if (inheritedVars.length === 0) {
      // No inheritance, no shadowing possible with parent contracts
      return;
    }

    // Check state variable shadowing
    this.checkStateVariableShadowing(contract, inheritedVars, context);

    // Check function parameter and local variable shadowing
    this.checkFunctionShadowing(contract, inheritedVars, context);
  }

  /**
   * Get all inherited state variables from parent contracts
   */
  private getInheritedStateVariables(contract: any): StateVariable[] {
    const inherited: StateVariable[] = [];
    const visited = new Set<string>();

    // Get base contracts
    if (!contract.baseContracts || !Array.isArray(contract.baseContracts)) {
      return inherited;
    }

    for (const baseContract of contract.baseContracts) {
      const baseName = baseContract.baseName?.namePath || baseContract.baseName;
      if (!baseName) continue;

      this.collectInheritedVariables(baseName, inherited, visited);
    }

    return inherited;
  }

  /**
   * Recursively collect inherited variables from base contracts
   */
  private collectInheritedVariables(
    contractName: string,
    inherited: StateVariable[],
    visited: Set<string>
  ): void {
    // Avoid circular inheritance
    if (visited.has(contractName)) {
      return;
    }
    visited.add(contractName);

    // Get state variables from this contract
    const stateVars = this.stateVarsMap.get(contractName);
    if (stateVars) {
      inherited.push(...stateVars);
    }

    // Recursively get variables from parent contracts
    const contract = this.contractMap.get(contractName);
    if (contract && contract.baseContracts) {
      for (const baseContract of contract.baseContracts) {
        const baseName = baseContract.baseName?.namePath || baseContract.baseName;
        if (baseName) {
          this.collectInheritedVariables(baseName, inherited, visited);
        }
      }
    }
  }

  /**
   * Check if state variables shadow inherited variables
   */
  private checkStateVariableShadowing(
    contract: any,
    inheritedVars: StateVariable[],
    context: AnalysisContext
  ): void {
    const contractVars = this.stateVarsMap.get(contract.name) || [];

    for (const contractVar of contractVars) {
      // Check if this variable shadows an inherited variable
      const shadowedVar = inheritedVars.find(inherited => inherited.name === contractVar.name);

      if (shadowedVar) {
        this.reportShadowing(
          contractVar.node,
          contractVar.name,
          'state variable',
          shadowedVar.contractName,
          context
        );
      }
    }
  }

  /**
   * Check if function parameters or local variables shadow inherited variables
   */
  private checkFunctionShadowing(
    contract: any,
    inheritedVars: StateVariable[],
    context: AnalysisContext
  ): void {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return;
    }

    for (const node of contract.subNodes) {
      if (node.type === 'FunctionDefinition') {
        this.checkFunctionVariables(node, inheritedVars, context);
      }
    }
  }

  /**
   * Check function parameters and local variables for shadowing
   */
  private checkFunctionVariables(
    functionNode: any,
    inheritedVars: StateVariable[],
    context: AnalysisContext
  ): void {
    // Check function parameters
    if (functionNode.parameters) {
      for (const param of functionNode.parameters) {
        const shadowedVar = inheritedVars.find(inherited => inherited.name === param.name);

        if (shadowedVar) {
          this.reportShadowing(
            param,
            param.name,
            'function parameter',
            shadowedVar.contractName,
            context
          );
        }
      }
    }

    // Check local variables in function body
    if (functionNode.body) {
      this.checkLocalVariables(functionNode.body, inheritedVars, context);
    }
  }

  /**
   * Check local variables for shadowing
   */
  private checkLocalVariables(
    node: any,
    inheritedVars: StateVariable[],
    context: AnalysisContext
  ): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check variable declarations
    if (node.type === 'VariableDeclarationStatement' && node.variables) {
      for (const variable of node.variables) {
        const shadowedVar = inheritedVars.find(inherited => inherited.name === variable.name);

        if (shadowedVar) {
          this.reportShadowing(
            variable,
            variable.name,
            'local variable',
            shadowedVar.contractName,
            context
          );
        }
      }
    }

    // Recursively check nested nodes
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.checkLocalVariables(child, inheritedVars, context));
      } else if (value && typeof value === 'object') {
        this.checkLocalVariables(value, inheritedVars, context);
      }
    }
  }

  /**
   * Report a shadowing issue
   */
  private reportShadowing(
    node: any,
    varName: string,
    varType: string,
    parentContract: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Variable '${varName}' (${varType}) shadows inherited state variable from '${parentContract}'. This can cause confusion and unintended bugs. Use a different name to avoid shadowing.`,
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
