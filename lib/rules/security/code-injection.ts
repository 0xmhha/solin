/**
 * Code Injection Security Rule
 *
 * Detects potential code injection vulnerabilities through delegatecall, call,
 * or assembly with user-controlled data.
 *
 * @example Vulnerable code:
 * ```solidity
 * function execute(address target, bytes memory data) public {
 *   target.delegatecall(data); // User controls target and data!
 * }
 * ```
 *
 * @example Safe code:
 * ```solidity
 * address constant TRUSTED_IMPL = 0x...;
 * function execute(bytes memory data) public {
 *   TRUSTED_IMPL.delegatecall(data); // Only trusted contract
 * }
 * ```
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class CodeInjectionRule extends AbstractRule {
  private functionParams: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/code-injection',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Code Injection Vulnerability',
      description:
        'Detects code injection vulnerabilities where user-controlled data is used in delegatecall, call, or assembly operations. An attacker can execute arbitrary code in the context of the contract, potentially stealing funds or taking complete control.',
      recommendation:
        'Never use user-controlled addresses or data in delegatecall/call operations. Use a whitelist of trusted contract addresses. Avoid inline assembly with user data. If delegation is required, implement a proxy pattern with a controlled implementation address.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Track function parameters
    if (node.type === 'FunctionDefinition') {
      const prevParams = new Set(this.functionParams);
      this.functionParams.clear();

      // Collect parameter names
      node.parameters?.forEach((param: any) => {
        if (param.name) {
          this.functionParams.add(param.name);
        }
      });

      // Check function body
      if (node.body) {
        this.checkFunctionBody(node.body, context);
      }

      this.functionParams = prevParams;
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

  private checkFunctionBody(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for low-level calls
    if (node.type === 'MemberAccess') {
      const memberName = node.memberName;
      if (
        memberName === 'delegatecall' ||
        memberName === 'call' ||
        memberName === 'staticcall'
      ) {
        this.checkLowLevelCall(node, memberName, context);
      }
    }

    // Check for inline assembly with dangerous opcodes
    if (node.type === 'InlineAssemblyStatement') {
      this.checkInlineAssembly(node, context);
    }

    // Recursively check children
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkFunctionBody(child, context));
      } else if (value && typeof value === 'object') {
        this.checkFunctionBody(value, context);
      }
    }
  }

  private checkLowLevelCall(
    node: any,
    callType: string,
    context: AnalysisContext
  ): void {
    const expression = node.expression;
    if (!expression) return;

    // Only flag delegatecall with user-controlled address (most dangerous)
    // For call/staticcall, we're more lenient as they're commonly used
    if (callType === 'delegatecall' && this.isUserControlled(expression)) {
      this.reportIssue(
        node,
        `${callType} to user-controlled address`,
        callType,
        context
      );
    }
  }

  private checkInlineAssembly(node: any, context: AnalysisContext): void {
    // Check assembly body for dangerous operations
    const body = node.body;
    if (!body) return;

    // Look for delegatecall, call, create, create2 in assembly
    const assemblyCode = this.extractAssemblyCode(body);
    if (
      assemblyCode.includes('delegatecall') ||
      assemblyCode.includes('call') ||
      assemblyCode.includes('create2') ||
      assemblyCode.includes('create')
    ) {
      if (!node.loc) return;

      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message:
          'Inline assembly contains potentially dangerous operations (delegatecall/call/create). This can lead to code injection if user data is used. Avoid inline assembly with user-controlled data or carefully validate all inputs.',
        location: {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        },
      });
    }
  }

  private extractAssemblyCode(node: any): string {
    if (!node || typeof node !== 'object') return '';

    let code = '';

    if (node.type === 'AssemblyCall' || node.type === 'AssemblyLiteral') {
      code += JSON.stringify(node);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => {
          code += this.extractAssemblyCode(child);
        });
      } else if (value && typeof value === 'object') {
        code += this.extractAssemblyCode(value);
      }
    }

    return code;
  }

  private isUserControlled(node: any): boolean {
    if (!node) return false;

    // Check if node is a parameter
    if (node.type === 'Identifier') {
      return this.functionParams.has(node.name);
    }

    // Check if it's msg.sender or tx.origin (user-controlled)
    if (node.type === 'MemberAccess') {
      if (
        node.expression?.type === 'Identifier' &&
        (node.expression.name === 'msg' || node.expression.name === 'tx')
      ) {
        return true;
      }
    }

    return false;
  }

  private reportIssue(
    node: any,
    issueType: string,
    callType: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Code injection risk: ${issueType}. Using ${callType} with user-controlled addresses or data allows attackers to execute arbitrary code in your contract's context. This can lead to complete loss of funds. Use a whitelist of trusted addresses or avoid low-level calls entirely.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
