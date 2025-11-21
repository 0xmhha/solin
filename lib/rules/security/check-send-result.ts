/**
 * Check Send Result Security Rule
 *
 * Detects send() calls without checking return value
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects unchecked send() calls:
 * - send() returns false on failure but doesn't revert
 * - Leads to silent failures where ether transfer fails
 * - Always check return value with require(), assert(), or if statement
 * - Consider using transfer() which reverts automatically
 */
export class CheckSendResult extends AbstractRule {
  private checkedSends: Set<string> = new Set();
  private checkedVariables: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/check-send-result',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Check send() return value',
      description:
        'Detects send() calls without checking the return value. The send() function returns false on failure but does not revert, which can lead to silent failures.',
      recommendation:
        'Always check send() return value with require(), assert(), or if statement. Example: require(recipient.send(amount), "Send failed"). Consider using transfer() which reverts automatically on failure.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.checkedSends.clear();
    this.checkedVariables.clear();

    // First pass: find all checked sends
    this.findCheckedSends(context.ast);

    // Second pass: find unchecked sends
    this.walkAst(context.ast, context);
  }

  /**
   * Find all checked send() calls
   */
  private findCheckedSends(node: any): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for send in require/assert
    if (node.type === 'FunctionCall') {
      const funcName = this.getFunctionName(node);
      if (funcName === 'require' || funcName === 'assert') {
        if (node.arguments && node.arguments.length > 0) {
          this.markSendAsChecked(node.arguments[0]);
          this.markVariableAsChecked(node.arguments[0]);
        }
      }
    }

    // Check for send in if condition
    if (node.type === 'IfStatement' && node.condition) {
      this.markSendAsChecked(node.condition);
      this.markVariableAsChecked(node.condition);
      // Also check if body contains revert
      if (node.TrueBody || node.FalseBody) {
        // If condition checks send, mark it as checked
        this.markAllSendsInCondition(node.condition);
      }
    }

    // Check for variable assignment in VariableDeclarationStatement
    if (node.type === 'VariableDeclarationStatement') {
      const varDecl = node.variables?.[0];
      if (varDecl && node.initialValue && this.isSendCall(node.initialValue)) {
        // Variable holds send result - mark send as checked since it's assigned
        this.markSendAsChecked(node.initialValue);
      }
    }

    // Check for return statement
    if (node.type === 'ReturnStatement' && node.expression) {
      this.markSendAsChecked(node.expression);
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.findCheckedSends(child));
      } else if (value && typeof value === 'object') {
        this.findCheckedSends(value);
      }
    }
  }

  /**
   * Mark all sends in condition as checked
   */
  private markAllSendsInCondition(node: any): void {
    if (!node) {
      return;
    }

    if (this.isSendCall(node)) {
      const key = this.getLocationKey(node);
      if (key) {
        this.checkedSends.add(key);
      }
    }

    // Recursively check in unary and binary operations
    if (node.type === 'UnaryOperation' && node.expression) {
      this.markAllSendsInCondition(node.expression);
    }

    if (node.type === 'BinaryOperation') {
      if (node.left) this.markAllSendsInCondition(node.left);
      if (node.right) this.markAllSendsInCondition(node.right);
    }
  }

  /**
   * Mark send as checked
   */
  private markSendAsChecked(node: any): void {
    if (!node) {
      return;
    }

    if (this.isSendCall(node)) {
      const key = this.getLocationKey(node);
      if (key) {
        this.checkedSends.add(key);
      }
    }

    // Handle unary and binary operations
    if (node.type === 'UnaryOperation') {
      this.markSendAsChecked(node.expression);
    }

    if (node.type === 'BinaryOperation') {
      this.markSendAsChecked(node.left);
      this.markSendAsChecked(node.right);
    }
  }

  /**
   * Mark variable as checked
   */
  private markVariableAsChecked(node: any): void {
    if (!node) {
      return;
    }

    if (node.type === 'Identifier') {
      this.checkedVariables.add(node.name);
    }

    if (node.type === 'UnaryOperation') {
      this.markVariableAsChecked(node.expression);
    }

    if (node.type === 'BinaryOperation') {
      this.markVariableAsChecked(node.left);
      this.markVariableAsChecked(node.right);
    }
  }

  /**
   * Walk AST to find unchecked sends
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for unchecked send call
    if (this.isSendCall(node)) {
      const key = this.getLocationKey(node);
      if (key && !this.checkedSends.has(key)) {
        this.reportIssue(node, context);
      }
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
   * Check if node is a send() call
   */
  private isSendCall(node: any): boolean {
    if (node?.type !== 'FunctionCall') {
      return false;
    }

    const expr = node.expression;
    return expr?.type === 'MemberAccess' && expr.memberName === 'send';
  }

  /**
   * Get location key for deduplication
   */
  private getLocationKey(node: any): string | null {
    if (!node.loc) {
      return null;
    }
    return `${node.loc.start.line}:${node.loc.start.column}`;
  }

  /**
   * Get function name from function call
   */
  private getFunctionName(node: any): string {
    if (!node.expression) {
      return '';
    }

    if (node.expression.type === 'Identifier') {
      return node.expression.name || '';
    }

    return '';
  }

  /**
   * Report issue for unchecked send
   */
  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        'Unchecked send() call detected. The send() function returns false on failure but does not revert. Always check return value: require(recipient.send(amount), "Send failed").',
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
