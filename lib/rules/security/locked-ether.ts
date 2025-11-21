/**
 * Locked Ether Security Rule
 *
 * Detects contracts that can receive Ether but have no mechanism to withdraw it.
 * This leads to permanent loss of funds as Ether becomes locked in the contract.
 *
 * The rule checks:
 * 1. If contract has payable functions (receive, fallback, payable functions/constructor)
 * 2. If contract has withdrawal mechanisms (transfer, send, call with value, selfdestruct)
 * 3. Reports if payable but no withdrawal mechanism exists
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects locked ether vulnerabilities:
 * - Contract has payable functions but no withdrawal mechanism
 * - Checks for receive(), fallback(), payable functions, payable constructor
 * - Checks for transfer(), send(), call{value}, selfdestruct()
 *
 * Safe patterns (excluded):
 * - Contracts with transfer/send/call withdrawal functions
 * - Contracts with selfdestruct
 * - Contracts without any payable functions
 */
export class LockedEtherRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/locked-ether',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Locked Ether Vulnerability',
      description:
        'Detects contracts that can receive Ether but have no mechanism to withdraw it. Ether sent to such contracts becomes permanently locked, leading to fund loss.',
      recommendation:
        'Add withdrawal functions using transfer(), send(), or call{value}(). Implement proper access controls for withdrawal. Consider using withdrawal patterns or making the contract non-payable if Ether handling is not needed.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST to find all contracts
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes to find contracts
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check each contract
    if (node.type === 'ContractDefinition') {
      this.analyzeContract(node, context);
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
   * Analyze a contract for locked ether vulnerability
   */
  private analyzeContract(contract: any, context: AnalysisContext): void {
    // Check if contract can receive ether
    const canReceiveEther = this.canReceiveEther(contract);

    if (!canReceiveEther) {
      // Contract cannot receive ether, no issue
      return;
    }

    // Check if contract has withdrawal mechanism
    const hasWithdrawal = this.hasWithdrawalMechanism(contract);

    if (!hasWithdrawal) {
      // Contract can receive ether but has no withdrawal mechanism
      this.reportLockedEther(contract, context);
    }
  }

  /**
   * Check if contract can receive Ether
   */
  private canReceiveEther(contract: any): boolean {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return false;
    }

    for (const node of contract.subNodes) {
      // Check for receive function
      if (node.type === 'FunctionDefinition' && node.isReceiveEther) {
        return true;
      }

      // Check for fallback function
      if (
        node.type === 'FunctionDefinition' &&
        node.isFallback &&
        node.stateMutability === 'payable'
      ) {
        return true;
      }

      // Check for payable functions
      if (node.type === 'FunctionDefinition' && node.stateMutability === 'payable') {
        // Constructor is also a function
        return true;
      }
    }

    return false;
  }

  /**
   * Check if contract has withdrawal mechanism
   */
  private hasWithdrawalMechanism(contract: any): boolean {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return false;
    }

    // Check all functions in the contract for withdrawal patterns
    for (const node of contract.subNodes) {
      if (this.hasWithdrawalCalls(node)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if contract has transfer/send/call/selfdestruct
   */
  private hasWithdrawalCalls(node: any): boolean {
    if (!node || typeof node !== 'object') {
      return false;
    }

    // Check for function calls
    if (node.type === 'FunctionCall') {
      // Check for transfer/send/call
      if (node.expression && node.expression.type === 'MemberAccess') {
        const methodName = node.expression.memberName;
        if (methodName === 'transfer' || methodName === 'send' || methodName === 'call') {
          // transfer/send/call are typically used for ether transfers
          // We consider call as a withdrawal mechanism since it's commonly used with value
          return true;
        }
      }

      // Check for selfdestruct/suicide
      if (node.expression && node.expression.type === 'Identifier') {
        const functionName = node.expression.name;
        if (functionName === 'selfdestruct' || functionName === 'suicide') {
          return true;
        }
      }
    }

    // Recursively check all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (this.hasWithdrawalCalls(child)) {
            return true;
          }
        }
      } else if (value && typeof value === 'object') {
        if (this.hasWithdrawalCalls(value)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Report a locked ether vulnerability
   */
  private reportLockedEther(contract: any, context: AnalysisContext): void {
    if (!contract.loc) {
      return;
    }

    const contractName = contract.name || '(anonymous)';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Contract '${contractName}' can receive Ether (has payable functions) but has no withdrawal mechanism (transfer/send/call/selfdestruct). Ether sent to this contract will be permanently locked. Add withdrawal functions with proper access controls.`,
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
