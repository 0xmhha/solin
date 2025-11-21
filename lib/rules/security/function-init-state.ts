/**
 * Function Init State Security Rule
 *
 * Detects functions that initialize state
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects initialization functions:
 * - Functions named initialize, init, setup, etc.
 * - Important for upgradeable contracts
 * - Should be properly protected
 */
export class FunctionInitState extends AbstractRule {
  private readonly INIT_PATTERNS = [/^initialize/i, /^init$/i, /^setup$/i, /_init$/i];

  constructor() {
    super({
      id: 'security/function-init-state',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'State initialization function detected',
      description:
        'Detects functions that appear to initialize contract state (initialize, init, setup). These functions should be properly protected in upgradeable contracts.',
      recommendation:
        'Ensure initialization functions are protected against re-initialization and can only be called once or by authorized parties.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find initialization functions
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check function definitions
    if (node.type === 'FunctionDefinition' && node.name) {
      if (this.isInitializationFunction(node.name)) {
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
   * Check if function name matches initialization pattern
   */
  private isInitializationFunction(name: string): boolean {
    return this.INIT_PATTERNS.some(pattern => pattern.test(name));
  }

  /**
   * Report issue for initialization function
   */
  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Function '${node.name}' appears to be an initialization function. Ensure it is properly protected against re-initialization.`,
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
