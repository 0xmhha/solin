/**
 * Avoid Suicide Security Rule
 *
 * Detects usage of deprecated suicide() function and recommends selfdestruct()
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects deprecated suicide() function usage:
 * - suicide() was deprecated in Solidity 0.5.0
 * - selfdestruct() should be used instead (same functionality)
 * - suicide() is an alias for selfdestruct() but deprecated
 */
export class AvoidSuicide extends AbstractRule {
  constructor() {
    super({
      id: 'security/avoid-suicide',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Avoid deprecated suicide() function',
      description:
        'Detects usage of deprecated suicide() function. The suicide() function was deprecated in Solidity 0.5.0 and selfdestruct() should be used instead.',
      recommendation:
        'Replace suicide() with selfdestruct(). They provide the same functionality, but selfdestruct() is the recommended function name.',
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
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check if function call is suicide()
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    const functionName = this.getFunctionName(node);

    if (functionName === 'suicide') {
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

    // Direct function call: suicide(...)
    if (node.expression.type === 'Identifier') {
      return node.expression.name || '';
    }

    return '';
  }

  /**
   * Report issue for suicide() usage
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
        'Deprecated suicide() function detected. Use selfdestruct() instead. The suicide() function was deprecated in Solidity 0.5.0.',
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
