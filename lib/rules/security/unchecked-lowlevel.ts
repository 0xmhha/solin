/**
 * Unchecked Low-Level Call Security Rule
 *
 * Detects low-level calls (.call, .delegatecall, .staticcall) without checking return value.
 * These calls return false on failure but don't revert, leading to silent failures.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class UncheckedLowlevelRule extends AbstractRule {
  private checkedCallLocations: Set<string> = new Set();
  private checkedVariables: Set<string> = new Set();

  constructor() {
    super({
      id: 'security/unchecked-lowlevel',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Unchecked Low-Level Call Return Value',
      description:
        'Detects low-level calls (.call, .delegatecall, .staticcall) without checking the return value. ' +
        'These functions return false on failure but do not revert, which can lead to silent failures where ' +
        'the external call fails but execution continues. This can result in unexpected behavior, ' +
        'security vulnerabilities, or loss of funds.',
      recommendation:
        'Always check low-level call return values with require(), assert(), or if statement. ' +
        'Example: (bool success, ) = target.call(""); require(success, "Call failed"). ' +
        'Consider using higher-level functions when possible, or implement proper error handling for all low-level calls.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.checkedCallLocations.clear();
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
    this.checkedCallLocations.clear();
    this.checkedVariables.clear();

    // First pass: find checked variables and calls
    this.findCheckedCalls(funcNode.body);

    // Second pass: find all calls and report unchecked ones
    this.walkAst(funcNode.body, context);
  }

  private findCheckedCalls(node: any): void {
    if (!node || typeof node !== 'object') return;

    // Check for call in require/assert
    if (node.type === 'FunctionCall') {
      const funcName = node.expression?.name;
      if (funcName === 'require' || funcName === 'assert') {
        // Look for call in the condition
        this.markCallAsChecked(node.arguments?.[0]);
        // Also mark variables used in require/assert as checked
        this.markVariableAsChecked(node.arguments?.[0]);
      }
    }

    // Check for call in if condition
    if (node.type === 'IfStatement') {
      this.markCallAsChecked(node.condition);
      this.markVariableAsChecked(node.condition);
    }

    // Check for call in ternary expression (conditional)
    if (node.type === 'Conditional') {
      this.markCallAsChecked(node.condition);
      this.markVariableAsChecked(node.condition);
    }

    // Recursively search
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.findCheckedCalls(child));
      } else if (value && typeof value === 'object') {
        this.findCheckedCalls(value);
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

  private markCallAsChecked(node: any): void {
    if (!node) return;

    // Direct call
    if (this.isLowLevelCall(node)) {
      const locationKey = this.getLocationKey(node);
      if (locationKey) {
        this.checkedCallLocations.add(locationKey);
      }
    }

    // Call in complex expression
    if (node.type === 'UnaryOperation' || node.type === 'BinaryOperation') {
      this.markCallAsChecked(node.left);
      this.markCallAsChecked(node.right);
      this.markCallAsChecked(node.expression);
    }

    // Identifier (variable holding call result)
    if (node.type === 'Identifier') {
      // Variable is being checked
    }
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for call assigned to variable
    if (node.type === 'VariableDeclarationStatement') {
      const varDecl = node.variables?.[0];
      const initialValue = node.initialValue;

      if (varDecl && initialValue && this.isLowLevelCall(initialValue)) {
        const varName = varDecl.name;
        // Check if this variable is later checked
        if (!this.checkedVariables.has(varName)) {
          this.reportIssue(initialValue, context);
        }
        // Don't traverse into initialValue - we already checked it
        for (const key in node) {
          if (key === 'loc' || key === 'range' || key === 'initialValue') continue;
          const value = node[key];
          if (Array.isArray(value)) {
            value.forEach((child) => this.walkAst(child, context));
          } else if (value && typeof value === 'object') {
            this.walkAst(value, context);
          }
        }
        return;
      }
    }

    // Check for call (direct, not assigned to variable)
    if (node.type === 'FunctionCall' && this.isLowLevelCall(node)) {
      const locationKey = this.getLocationKey(node);
      if (locationKey && !this.checkedCallLocations.has(locationKey)) {
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

  private isLowLevelCall(node: any): boolean {
    if (node?.type !== 'FunctionCall') return false;
    const expr = node.expression;
    if (expr?.type !== 'MemberAccess') return false;

    const memberName = expr.memberName;
    return (
      memberName === 'call' ||
      memberName === 'delegatecall' ||
      memberName === 'staticcall'
    );
  }

  private getLocationKey(node: any): string | null {
    if (!node.loc) return null;
    return `${node.loc.start.line}:${node.loc.start.column}`;
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    const callType = node.expression?.memberName || 'call';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Unchecked low-level ${callType}() detected. Low-level calls return false on failure but do not revert, ` +
        'leading to silent failures where the external call fails but execution continues. ' +
        `Always check return value: (bool success, ) = target.${callType}(""); require(success, "Call failed"). ` +
        'Unchecked low-level calls can cause unexpected behavior, security vulnerabilities, or loss of funds.',
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
