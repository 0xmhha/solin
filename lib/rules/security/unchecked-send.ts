/**
 * Unchecked Send Security Rule
 *
 * Detects send() calls without checking return value.
 * send() returns false on failure but doesn't revert, leading to silent failures.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class UncheckedSendRule extends AbstractRule {
  private checkedSendLocations: Set<string> = new Set();
  private checkedVariables: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/unchecked-send',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Unchecked send() Return Value',
      description:
        'Detects send() calls without checking the return value. The send() function returns false on failure but does not revert, ' +
        'which can lead to silent failures where ether transfer fails but execution continues. ' +
        'Unlike transfer() which reverts on failure, send() requires explicit error handling.',
      recommendation:
        'Always check send() return value with require(), assert(), or if statement. ' +
        'Example: require(recipient.send(amount), "Send failed"). ' +
        'Consider using transfer() for automatic revert on failure, or call{value: amount}("") with proper error handling.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.checkedSendLocations.clear();
    this.checkedVariables.clear();

    // Analyze each function separately
    this.analyzeFunctions(context.ast, context);
  }

  private analyzeFunctions(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Analyze each function definition
    if (node.type === 'FunctionDefinition') {
      this.analyzeFunction(node, context);
    }

    // Recursively traverse
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.analyzeFunctions(child, context));
      } else if (value && typeof value === 'object') {
        this.analyzeFunctions(value, context);
      }
    }
  }

  private analyzeFunction(funcNode: any, context: AnalysisContext): void {
    if (!funcNode.body) return;

    // Reset for this function
    this.checkedSendLocations.clear();
    this.checkedVariables.clear();

    // First pass: find checked variables and sends
    this.findCheckedSends(funcNode.body);

    // Second pass: find all sends and report unchecked ones
    this.walkAst(funcNode.body, context);
  }

  private findCheckedSends(node: any): void {
    if (!node || typeof node !== 'object') return;

    // Check for send in require/assert
    if (node.type === 'FunctionCall') {
      const funcName = node.expression?.name;
      if (funcName === 'require' || funcName === 'assert') {
        // Look for send in the condition
        this.markSendAsChecked(node.arguments?.[0]);
        // Also mark variables used in require/assert as checked
        this.markVariableAsChecked(node.arguments?.[0]);
      }
    }

    // Check for send in if condition
    if (node.type === 'IfStatement') {
      this.markSendAsChecked(node.condition);
      this.markVariableAsChecked(node.condition);
    }

    // Check for send in ternary expression (conditional)
    if (node.type === 'Conditional') {
      this.markSendAsChecked(node.condition);
      this.markVariableAsChecked(node.condition);
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.findCheckedSends(child));
      } else if (value && typeof value === 'object') {
        this.findCheckedSends(value);
      }
    }
  }

  private markVariableAsChecked(node: any): void {
    if (!node) return;

    // Check if it's an identifier (variable reference)
    if (node.type === 'Identifier') {
      this.checkedVariables.add(node.name);
    }

    // Check in binary operations
    if (node.type === 'BinaryOperation') {
      this.markVariableAsChecked(node.left);
      this.markVariableAsChecked(node.right);
    }

    // Check in unary operations
    if (node.type === 'UnaryOperation') {
      this.markVariableAsChecked(node.expression);
    }
  }

  private markSendAsChecked(node: any): void {
    if (!node) return;

    // Direct send call
    if (this.isSendCall(node)) {
      const locationKey = this.getLocationKey(node);
      if (locationKey) {
        this.checkedSendLocations.add(locationKey);
      }
    }

    // Send in complex expression (e.g., !send(), send() && x, etc.)
    if (node.type === 'UnaryOperation' || node.type === 'BinaryOperation') {
      this.markSendAsChecked(node.left);
      this.markSendAsChecked(node.right);
      this.markSendAsChecked(node.expression);
    }

    // Identifier (variable holding send result)
    if (node.type === 'Identifier') {
      // Variable is being checked - we need to track this
      // For simplicity, we'll handle direct checks
    }
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for send assigned to variable
    if (node.type === 'VariableDeclarationStatement') {
      const varDecl = node.variables?.[0];
      const initialValue = node.initialValue;

      if (varDecl && initialValue && this.isSendCall(initialValue)) {
        const varName = varDecl.name;
        // Check if this variable is later checked
        if (!this.checkedVariables.has(varName)) {
          this.reportIssue(initialValue, context);
        }
        // Don't traverse into initialValue - we already checked it
        // Traverse other parts
        for (const key in node) {
          if (key === 'loc' || key === 'range' || key === 'initialValue') continue;
          const value = node[key];
          if (Array.isArray(value)) {
            value.forEach((child) => this.walkAst(child, context));
          } else if (value && typeof value === 'object') {
            this.walkAst(value, context);
          }
        }
        return; // Exit early to prevent duplicate traversal
      }
    }

    // Check for send calls (direct, not assigned to variable)
    if (node.type === 'FunctionCall' && this.isSendCall(node)) {
      const locationKey = this.getLocationKey(node);
      if (locationKey && !this.checkedSendLocations.has(locationKey)) {
        this.reportIssue(node, context);
      }
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

  private isSendCall(node: any): boolean {
    if (node?.type !== 'FunctionCall') return false;
    const expr = node.expression;
    return expr?.type === 'MemberAccess' && expr.memberName === 'send';
  }

  private getLocationKey(node: any): string | null {
    if (!node.loc) return null;
    return `${node.loc.start.line}:${node.loc.start.column}`;
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        'Unchecked send() call detected. The send() function returns false on failure but does not revert, ' +
        'leading to silent failures where ether transfer fails but execution continues. ' +
        'Always check return value: require(addr.send(amount), "Send failed") or use transfer() which reverts automatically. ' +
        'Unchecked send can cause fund loss when recipient rejects payment.',
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
