/**
 * Storage Collision Security Rule
 *
 * Detects storage layout collisions that can occur in proxy patterns and contract upgrades.
 * Storage collisions happen when delegatecall is used and the storage layouts don't match,
 * or when inheritance changes the storage order.
 *
 * @example
 * // Vulnerable: Storage collision in inheritance
 * contract Base {
 *   uint public value;
 * }
 * contract Derived is Base {
 *   uint public value; // Collision!
 * }
 *
 * // Safe: Use storage gaps for upgradeability
 * contract UpgradeableBase {
 *   uint public value;
 *   uint[49] private __gap; // Reserve slots for future variables
 * }
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class StorageCollisionRule extends AbstractRule {
  private contracts = new Map<string, any>();
  private stateVariables = new Map<string, string[]>();

  constructor() {
    super({
      id: 'security/storage-collision',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Storage Collision Risk',
      description:
        'Detects storage layout collision risks in proxy patterns, upgradeable contracts, and inheritance. ' +
        'Storage collisions occur when delegatecall is used with mismatched storage layouts, or when ' +
        'inheritance shadows state variables. This can corrupt contract state and lead to critical vulnerabilities.',
      recommendation:
        'For upgradeable contracts: (1) Use storage gaps (uint[N] private __gap) to reserve slots for future variables. ' +
        '(2) Follow EIP-1967 for proxy storage slots to avoid collisions. ' +
        '(3) Never reorder or change types of existing state variables. ' +
        '(4) Use namespaced storage (Diamond Storage pattern) for complex upgrades. ' +
        '(5) Avoid variable name shadowing in inheritance hierarchies.',
    });
  }

  analyze(context: AnalysisContext): void {
    // First pass: collect contracts and their state variables
    this.contracts.clear();
    this.stateVariables.clear();
    this.collectContracts(context.ast);

    // Second pass: check for issues
    this.walkAst(context.ast, context);
  }

  private collectContracts(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'ContractDefinition') {
      const contractName = node.name;
      this.contracts.set(contractName, node);

      // Collect state variables for this contract
      const vars: string[] = [];
      if (node.subNodes && Array.isArray(node.subNodes)) {
        for (const subNode of node.subNodes) {
          if (subNode.type === 'StateVariableDeclaration') {
            const varNames = this.extractVariableNames(subNode);
            vars.push(...varNames);
          }
        }
      }
      this.stateVariables.set(contractName, vars);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.collectContracts(child));
      } else if (value && typeof value === 'object') {
        this.collectContracts(value);
      }
    }
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'ContractDefinition') {
      this.checkContract(node, context);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkContract(node: any, context: AnalysisContext): void {

    // Check for variable name shadowing in inheritance
    if (node.baseContracts && Array.isArray(node.baseContracts) && node.baseContracts.length > 0) {
      this.checkInheritanceShadowing(node, context);
    }

    // Check for missing storage gaps in base contracts
    if (node.baseContracts && Array.isArray(node.baseContracts) && node.baseContracts.length > 0) {
      this.checkStorageGap(node, context);
    }

    // Check for delegatecall usage without proper storage layout consideration
    this.checkDelegatecallUsage(node, context);

    // Check for proxy pattern without EIP-1967 slots
    this.checkProxyPattern(node, context);
  }

  private checkInheritanceShadowing(node: any, context: AnalysisContext): void {
    const contractName = node.name;
    const currentVars = this.stateVariables.get(contractName) || [];

    // Check against base contracts
    if (node.baseContracts && Array.isArray(node.baseContracts)) {
      for (const baseContract of node.baseContracts) {
        const baseName = baseContract.baseName?.namePath;
        if (baseName && this.stateVariables.has(baseName)) {
          const baseVars = this.stateVariables.get(baseName) || [];

          // Check for duplicate variable names
          for (const varName of currentVars) {
            if (baseVars.includes(varName) && !varName.startsWith('__gap')) {
              this.reportIssue(
                node,
                `Storage collision: variable '${varName}' in contract '${contractName}' shadows ` +
                  `the same variable in base contract '${baseName}'. This can cause unpredictable behavior ` +
                  `and state corruption. Use different variable names or override properly.`,
                context
              );
            }
          }
        }
      }
    }
  }

  private checkStorageGap(node: any, context: AnalysisContext): void {
    const contractName = node.name;
    const vars = this.stateVariables.get(contractName) || [];

    // Check if contract has storage gap
    const hasGap = vars.some((v) => v.includes('__gap') || v.includes('_gap'));

    // If contract has state variables and inheritance but no gap, warn
    if (vars.length > 0 && !hasGap) {
      // Check if this looks like an upgradeable contract
      const nameIndicatesUpgradeable =
        contractName.toLowerCase().includes('upgradeable') ||
        contractName.toLowerCase().includes('base') ||
        contractName.toLowerCase().includes('storage');

      if (nameIndicatesUpgradeable) {
        this.reportIssue(
          node,
          `Missing storage gap in potentially upgradeable contract '${contractName}'. ` +
            'Add a storage gap to reserve slots for future variables: uint[50] private __gap; ' +
            'This prevents storage collisions when adding new state variables in contract upgrades.',
          context
        );
      }
    }
  }

  private checkDelegatecallUsage(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'MemberAccess' && node.memberName === 'delegatecall') {
      // Check if contract has state variables
      const contractName = this.findContractName(node);
      if (contractName) {
        const vars = this.stateVariables.get(contractName) || [];
        if (vars.length > 0 && !this.hasEIP1967Slots(contractName)) {
          this.reportIssue(
            node,
            'Delegatecall used in contract with state variables. Ensure storage layouts match ' +
              'between this contract and the delegatecall target to prevent storage collisions. ' +
              'Consider using EIP-1967 standard storage slots or Diamond Storage pattern.',
            context
          );
        }
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkDelegatecallUsage(child, context));
      } else if (value && typeof value === 'object') {
        this.checkDelegatecallUsage(value, context);
      }
    }
  }

  private checkProxyPattern(node: any, context: AnalysisContext): void {
    const contractName = node.name;

    // Check if this looks like a proxy (has upgrade functions)
    const hasUpgradeFunction = this.hasUpgradeFunction(node);
    const hasImplementationVar = (this.stateVariables.get(contractName) || []).some(
      (v) => v.toLowerCase().includes('implementation')
    );

    if ((hasUpgradeFunction || hasImplementationVar) && !this.hasEIP1967Slots(contractName)) {
      this.reportIssue(
        node,
        `Proxy pattern detected without EIP-1967 standard storage slots. Using regular storage ` +
          'for implementation address can collide with implementation contract storage. ' +
          'Use: bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1) for storage slot.',
        context
      );
    }
  }

  private hasUpgradeFunction(node: any): boolean {
    if (!node.subNodes || !Array.isArray(node.subNodes)) return false;

    return node.subNodes.some((subNode: any) => {
      if (subNode.type === 'FunctionDefinition') {
        const funcName = subNode.name?.toLowerCase() || '';
        return funcName.includes('upgrade') || funcName.includes('setimplementation');
      }
      return false;
    });
  }

  private hasEIP1967Slots(contractName: string): boolean {
    const contract = this.contracts.get(contractName);
    if (!contract) return false;

    // Check for EIP-1967 constant declarations
    const hasEIP1967Constant = this.findEIP1967Constants(contract);
    return hasEIP1967Constant;
  }

  private findEIP1967Constants(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    if (node.type === 'StateVariableDeclaration') {
      // Check for EIP-1967 pattern in variable declarations
      const hasConstant = node.variables?.some((v: any) => v.isConstant);
      if (hasConstant && node.initialValue) {
        const initValue = this.getNodeText(node.initialValue);
        if (initValue.includes('eip1967') || initValue.includes('keccak256')) {
          return true;
        }
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some((child) => this.findEIP1967Constants(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.findEIP1967Constants(value)) {
          return true;
        }
      }
    }

    return false;
  }

  private findContractName(node: any): string | null {
    // This is a simplified heuristic - in a real implementation,
    // we would track the current contract context
    for (const [name, contract] of this.contracts) {
      if (this.nodeIsInContract(node, contract)) {
        return name;
      }
    }
    return null;
  }

  private nodeIsInContract(node: any, contract: any): boolean {
    // Simple check: if node's line is within contract's line range
    if (!node.loc || !contract.loc) return false;
    return (
      node.loc.start.line >= contract.loc.start.line &&
      node.loc.end.line <= contract.loc.end.line
    );
  }

  private extractVariableNames(node: any): string[] {
    const names: string[] = [];
    if (node.variables && Array.isArray(node.variables)) {
      for (const variable of node.variables) {
        if (variable.name) {
          names.push(variable.name);
        }
      }
    }
    return names;
  }

  private getNodeText(node: any): string {
    if (!node) return '';
    if (node.type === 'StringLiteral') return node.value || '';
    if (node.type === 'Identifier') return node.name || '';
    return JSON.stringify(node);
  }

  private reportIssue(node: any, message: string, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
