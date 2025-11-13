/**
 * Missing Zero Check Security Rule
 *
 * Detects functions that accept address parameters without validating against zero address.
 * Missing zero-address validation can lead to loss of funds or contract malfunction.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class MissingZeroCheckRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/missing-zero-check',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Missing Zero Address Check',
      description:
        'Detects functions with address parameters that lack zero-address validation. Without proper checks, users can accidentally set critical addresses (owner, admin, recipient) to the zero address (0x0), potentially locking funds or breaking contract functionality permanently.',
      recommendation:
        'Add zero-address validation for all critical address parameters using require() or if-revert: require(_address != address(0), "Zero address not allowed"). Consider using a modifier for commonly validated addresses.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
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

  private checkFunction(node: any, context: AnalysisContext): void {
    // Skip view and pure functions (read-only, no state changes)
    if (node.stateMutability === 'view' || node.stateMutability === 'pure') {
      return;
    }

    // Skip internal and private functions (not externally callable)
    const visibility = node.visibility;
    if (visibility === 'internal' || visibility === 'private') {
      return;
    }

    // Get address parameters
    const addressParams = this.getAddressParameters(node);
    if (addressParams.length === 0) return;

    // Get function body
    const body = node.body;
    if (!body) return;

    // Check which address parameters have zero-address checks
    const validatedParams = this.getValidatedParams(body);

    // Report missing zero checks
    for (const param of addressParams) {
      if (!validatedParams.has(param.name)) {
        this.reportIssue(node, param, context);
      }
    }
  }

  private getAddressParameters(node: any): Array<{ name: string; loc: any }> {
    const params: Array<{ name: string; loc: any }> = [];

    if (!node.parameters) return params;

    for (const param of node.parameters) {
      if (this.isAddressType(param.typeName)) {
        params.push({
          name: param.name,
          loc: param.loc,
        });
      }
    }

    return params;
  }

  private isAddressType(typeNode: any): boolean {
    if (!typeNode) return false;

    // Check for 'address' or 'address payable'
    if (typeNode.type === 'ElementaryTypeName') {
      return typeNode.name === 'address' || typeNode.name === 'address payable';
    }

    return false;
  }

  private getValidatedParams(body: any): Set<string> {
    const validated = new Set<string>();

    const checkNode = (node: any): void => {
      if (!node || typeof node !== 'object') return;

      // Check for require/assert with zero-address comparison
      if (node.type === 'FunctionCall') {
        const funcName = this.getFunctionName(node);
        if (funcName === 'require' || funcName === 'assert') {
          const condition = node.arguments && node.arguments[0];
          if (condition) {
            const paramName = this.extractZeroCheckParam(condition);
            if (paramName) validated.add(paramName);
          }
        }
      }

      // Check for if statement with revert/require
      if (node.type === 'IfStatement') {
        const paramName = this.extractZeroCheckParam(node.condition);
        if (paramName) validated.add(paramName);
      }

      // Recursively check children
      for (const key in node) {
        if (key === 'loc' || key === 'range') continue;
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(checkNode);
        } else if (value && typeof value === 'object') {
          checkNode(value);
        }
      }
    };

    checkNode(body);
    return validated;
  }

  private extractZeroCheckParam(condition: any): string | null {
    if (!condition) return null;

    // Check for binary comparison: param != address(0) or address(0) != param
    if (condition.type === 'BinaryOperation') {
      const op = condition.operator;
      if (op === '!=' || op === '==') {
        const left = condition.left;
        const right = condition.right;

        // Check left side for parameter, right side for address(0)
        if (this.isIdentifier(left) && this.isZeroAddress(right)) {
          return left.name;
        }

        // Check right side for parameter, left side for address(0)
        if (this.isZeroAddress(left) && this.isIdentifier(right)) {
          return right.name;
        }
      }
    }

    return null;
  }

  private isIdentifier(node: any): boolean {
    return node && node.type === 'Identifier';
  }

  private isZeroAddress(node: any): boolean {
    if (!node) return false;

    // Check for address(0)
    if (node.type === 'FunctionCall') {
      const funcName = this.getFunctionName(node);
      if (funcName === 'address') {
        const arg = node.arguments && node.arguments[0];
        if (arg && (arg.type === 'NumberLiteral' || arg.type === 'Literal')) {
          const value = arg.value || arg.number;
          return value === 0 || value === '0';
        }
      }
    }

    return false;
  }

  private getFunctionName(node: any): string | null {
    if (!node || !node.expression) return null;

    if (node.expression.type === 'Identifier') {
      return node.expression.name;
    }

    return null;
  }

  private reportIssue(
    functionNode: any,
    param: { name: string; loc: any },
    context: AnalysisContext
  ): void {
    const loc = param.loc || functionNode.loc;
    if (!loc) return;

    const functionName = functionNode.name || 'constructor';
    const paramName = param.name;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Missing zero-address validation for parameter '${paramName}' in function '${functionName}'. Add check: require(${paramName} != address(0), "Zero address not allowed"). Setting critical addresses to zero can cause irreversible loss of control or funds.`,
      location: {
        start: { line: loc.start.line, column: loc.start.column },
        end: { line: loc.end.line, column: loc.end.column },
      },
    });
  }
}
