/**
 * Magic Numbers Lint Rule
 *
 * Detects magic numbers (unexplained numeric literals) in code
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface MagicNumbersOptions {
  allowedNumbers?: number[];
}

/**
 * Rule that detects magic numbers (unexplained numeric literals):
 * - Numbers used directly in code without explanation
 * - Recommends using named constants instead
 * - Configurable list of allowed numbers (default: 0, 1, -1)
 */
export class MagicNumbersRule extends AbstractRule {
  private options: Required<MagicNumbersOptions>;

  constructor() {
    super({
      id: 'lint/magic-numbers',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Magic Numbers',
      description: 'Detects unexplained numeric literals that should be replaced with named constants',
      recommendation:
        'Replace magic numbers with named constants to improve code readability and maintainability. Use descriptive names that explain the meaning of the value.',
    });
    this.options = {
      allowedNumbers: [0, 1, -1],
    };
  }

  analyze(context: AnalysisContext): void {
    // Get custom options from config
    const ruleConfig = context.config.rules?.[this.metadata.id];
    if (Array.isArray(ruleConfig) && ruleConfig[1]) {
      const customOptions = ruleConfig[1] as MagicNumbersOptions;
      this.options = {
        allowedNumbers: customOptions.allowedNumbers ?? this.options.allowedNumbers,
      };
    }

    // Walk the AST and check for numeric literals
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for numeric literals
    if (this.isNumericLiteral(node)) {
      this.checkNumericLiteral(node, context);
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
   * Check if node is a numeric literal
   */
  private isNumericLiteral(node: any): boolean {
    // Check for NumberLiteral type
    if (node.type === 'NumberLiteral') {
      return true;
    }

    // Check for generic Literal with number value
    if (node.type === 'Literal' && typeof node.value === 'number') {
      return true;
    }

    return false;
  }

  /**
   * Check a numeric literal and report if it's a magic number
   */
  private checkNumericLiteral(node: any, context: AnalysisContext): void {
    // Skip if no location info
    if (!node.loc) {
      return;
    }

    // Get the numeric value
    let value: number;
    if (node.type === 'NumberLiteral') {
      // Parse the number from the literal
      value = parseFloat(node.number);
    } else if (node.type === 'Literal') {
      value = node.value;
    } else {
      return;
    }

    // Check if this number is allowed
    if (this.options.allowedNumbers.includes(value)) {
      return;
    }

    // Report magic number
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Magic number '${value}' should be replaced with a named constant.`,
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
