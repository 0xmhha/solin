/**
 * Avoid SHA3 Security Rule
 *
 * Detects usage of deprecated sha3() function and recommends keccak256()
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects deprecated sha3() function usage:
 * - sha3() was deprecated in Solidity 0.5.0
 * - keccak256() should be used instead (same functionality)
 * - sha3() is an alias for keccak256() but deprecated
 */
export class AvoidSha3 extends AbstractRule {
  constructor() {
    super({
      id: 'security/avoid-sha3',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Avoid deprecated sha3() function',
      description:
        'Detects usage of deprecated sha3() function. The sha3() function was deprecated in Solidity 0.5.0 and keccak256() should be used instead.',
      recommendation:
        'Replace sha3() with keccak256(). They provide the same functionality, but keccak256() is the recommended function name.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find FunctionCall nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for FunctionCall nodes
    if (node.type === 'FunctionCall') {
      this.checkFunctionCall(node, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check if function call is sha3()
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    const functionName = this.getFunctionName(node);

    if (functionName === 'sha3') {
      this.reportIssue(node, context);
    }
  }

  /**
   * Get function name from function call
   */
  private getFunctionName(node: any): string {
    if (!node.expression) {
      return '';
    }

    // Direct function call: sha3(...)
    if (node.expression.type === 'Identifier') {
      return node.expression.name || '';
    }

    return '';
  }

  /**
   * Report issue for sha3() usage
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
        'Deprecated sha3() function detected. Use keccak256() instead. The sha3() function was deprecated in Solidity 0.5.0.',
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
