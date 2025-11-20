/**
 * Race Condition Security Rule
 *
 * Detects race conditions and transaction order dependence (TOD) vulnerabilities.
 * Race conditions occur when the outcome depends on the order of transaction execution,
 * allowing front-running attacks.
 *
 * @example
 * // Vulnerable: Classic ERC20 approve race condition
 * function approve(address spender, uint256 amount) public {
 *   allowance[msg.sender][spender] = amount; // Attacker can front-run this
 * }
 *
 * // Safe: Use increaseAllowance/decreaseAllowance pattern
 * function increaseAllowance(address spender, uint256 addedValue) public {
 *   allowance[msg.sender][spender] += addedValue;
 * }
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class RaceConditionRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/race-condition',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Race Condition Vulnerability',
      description:
        'Detects race conditions where transaction order affects outcomes. ' +
        'The classic example is ERC20 approve() allowing front-running: an attacker can ' +
        'observe an approval change and spend both the old and new allowance by front-running. ' +
        'Also detects TOD (Transaction Order Dependence) where execution order matters.',
      recommendation:
        'For token approvals: use increaseAllowance() and decreaseAllowance() instead of approve(). ' +
        'For state updates: use atomic operations (+=, -=) instead of read-modify-write patterns. ' +
        'Consider using commit-reveal schemes for sensitive operations. Add explicit nonces or use ' +
        'checks-effects-interactions pattern to minimize race windows.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for vulnerable approve function
    if (node.type === 'FunctionDefinition') {
      this.checkApproveFunction(node, context);
      this.checkReadModifyWrite(node, context);
    }

    // Recursively traverse
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

  /**
   * Check for vulnerable ERC20 approve() function
   */
  private checkApproveFunction(node: any, context: AnalysisContext): void {
    if (node.name !== 'approve') return;
    if (!node.body) return;

    // Look for direct assignment to allowance mapping
    const hasDirectAssignment = this.findDirectAllowanceAssignment(node.body);
    if (hasDirectAssignment) {
      this.reportIssue(
        node,
        'ERC20 approve() function is vulnerable to race conditions. ' +
          'An attacker can front-run approval changes to spend both old and new allowances. ' +
          'Use increaseAllowance() and decreaseAllowance() instead of direct assignment.',
        context
      );
    }
  }

  /**
   * Check for read-modify-write pattern that can cause race conditions
   */
  private checkReadModifyWrite(node: any, context: AnalysisContext): void {
    if (!node.body) return;
    if (node.stateMutability === 'view' || node.stateMutability === 'pure') return;

    const statements = this.extractStatements(node.body);
    const stateReads = new Map<string, any>();
    const stateWrites = new Map<string, any>();

    // Find state variable reads and writes
    for (const stmt of statements) {
      this.findStateAccess(stmt, stateReads, stateWrites);
    }

    // Check if same variable is read then written (read-modify-write pattern)
    for (const [varName, readNode] of stateReads) {
      if (stateWrites.has(varName)) {
        const writeNode = stateWrites.get(varName);
        // Check if it's not an atomic operation (+=, -=, etc.)
        if (this.isNonAtomicUpdate(writeNode)) {
          this.reportIssue(
            readNode,
            `Race condition: variable '${varName}' is read then written in a non-atomic way. ` +
              'This creates a window for transaction ordering attacks. ' +
              'Use atomic operations (+=, -=) or add proper locking mechanisms.',
            context
          );
        }
      }
    }
  }

  private findDirectAllowanceAssignment(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // Look for: allowance[...][...] = amount
    if (
      node.type === 'BinaryOperation' &&
      node.operator === '=' &&
      node.left?.type === 'IndexAccess'
    ) {
      const base = node.left.base;
      // Check if base is also IndexAccess (double indexing for mapping)
      if (base?.type === 'IndexAccess') {
        const varName = this.getBaseName(base.base);
        if (varName === 'allowance' || varName === 'allowed') {
          return true;
        }
      }
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some((child) => this.findDirectAllowanceAssignment(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.findDirectAllowanceAssignment(value)) {
          return true;
        }
      }
    }

    return false;
  }

  private extractStatements(body: any): any[] {
    if (!body) return [];
    if (body.type === 'Block' && Array.isArray(body.statements)) {
      return body.statements;
    }
    return [body];
  }

  private findStateAccess(
    node: any,
    reads: Map<string, any>,
    writes: Map<string, any>
  ): void {
    if (!node || typeof node !== 'object') return;

    // Detect writes (assignments)
    if (
      node.type === 'BinaryOperation' &&
      (node.operator === '=' || node.operator === '+=' || node.operator === '-=')
    ) {
      const varName = this.getVariableName(node.left);
      if (varName && !varName.startsWith('_')) {
        // Skip local variables (conventionally start with _)
        writes.set(varName, node);
      }
    }

    // Detect reads (variable access)
    if (node.type === 'Identifier' || node.type === 'IndexAccess') {
      const varName = this.getVariableName(node);
      if (varName && !varName.startsWith('_')) {
        // Only add if not already in reads (keep first occurrence)
        if (!reads.has(varName) && !writes.has(varName)) {
          reads.set(varName, node);
        }
      }
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.findStateAccess(child, reads, writes));
      } else if (value && typeof value === 'object') {
        this.findStateAccess(value, reads, writes);
      }
    }
  }

  private isNonAtomicUpdate(node: any): boolean {
    // If it's a direct assignment (=) and the right side contains a read,
    // it's non-atomic
    if (node.type === 'BinaryOperation' && node.operator === '=') {
      // Check if right side contains variable references
      return this.containsVariableReference(node.right);
    }
    // += and -= are atomic operations
    return false;
  }

  private containsVariableReference(node: any): boolean {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'Identifier') return true;
    if (node.type === 'IndexAccess') return true;

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some((child) => this.containsVariableReference(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.containsVariableReference(value)) {
          return true;
        }
      }
    }
    return false;
  }

  private getVariableName(node: any): string | null {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'IndexAccess') {
      return this.getVariableName(node.base);
    }
    if (node.type === 'MemberAccess') {
      return node.memberName;
    }
    return null;
  }

  private getBaseName(node: any): string | null {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'IndexAccess') {
      return this.getBaseName(node.base);
    }
    return null;
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
