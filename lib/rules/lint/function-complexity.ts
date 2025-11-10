/**
 * Function Complexity Lint Rule
 *
 * Detects functions that exceed complexity thresholds:
 * - Cyclomatic complexity (decision points)
 * - Line count
 * - Parameter count
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import { ASTWalker } from '@parser/ast-walker';

interface FunctionComplexityOptions {
  maxComplexity?: number;
  maxLines?: number;
  maxParameters?: number;
}

/**
 * Rule that checks function complexity metrics:
 * - Cyclomatic complexity: measures the number of independent paths through code
 * - Line count: measures function length
 * - Parameter count: measures function signature complexity
 */
export class FunctionComplexityRule extends AbstractRule {
  private walker: ASTWalker;
  private options: Required<FunctionComplexityOptions>;

  constructor() {
    super({
      id: 'lint/function-complexity',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Function Complexity',
      description:
        'Detects functions with high complexity (cyclomatic complexity, line count, or parameter count)',
      recommendation:
        'Break down complex functions into smaller, more manageable pieces. High complexity makes code harder to understand, test, and maintain.',
    });
    this.walker = new ASTWalker();
    this.options = {
      maxComplexity: 10,
      maxLines: 50,
      maxParameters: 7,
    };
  }

  analyze(context: AnalysisContext): void {
    // Get custom options from config
    const ruleConfig = context.config.rules?.[this.metadata.id];
    if (Array.isArray(ruleConfig) && ruleConfig[1]) {
      const customOptions = ruleConfig[1] as FunctionComplexityOptions;
      this.options = {
        maxComplexity: customOptions.maxComplexity ?? this.options.maxComplexity,
        maxLines: customOptions.maxLines ?? this.options.maxLines,
        maxParameters: customOptions.maxParameters ?? this.options.maxParameters,
      };
    }

    // Walk the AST and check each function
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes to find functions
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check if this is a function definition
    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
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
   * Check a function for complexity issues
   */
  private checkFunction(functionNode: any, context: AnalysisContext): void {
    // Skip if no location info
    if (!functionNode.loc) {
      return;
    }

    // Check cyclomatic complexity
    const complexity = this.calculateComplexity(functionNode);
    if (complexity > this.options.maxComplexity) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Function has cyclomatic complexity of ${complexity}, exceeds maximum of ${this.options.maxComplexity}.`,
        location: {
          start: {
            line: functionNode.loc.start.line,
            column: functionNode.loc.start.column,
          },
          end: {
            line: functionNode.loc.end.line,
            column: functionNode.loc.end.column,
          },
        },
      });
    }

    // Check line count
    const lineCount = functionNode.loc.end.line - functionNode.loc.start.line + 1;
    if (lineCount > this.options.maxLines) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Function has ${lineCount} lines, exceeds maximum of ${this.options.maxLines}.`,
        location: {
          start: {
            line: functionNode.loc.start.line,
            column: functionNode.loc.start.column,
          },
          end: {
            line: functionNode.loc.end.line,
            column: functionNode.loc.end.column,
          },
        },
      });
    }

    // Check parameter count
    const parameters = functionNode.parameters || [];
    const paramCount = parameters.length;
    if (paramCount > this.options.maxParameters) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Function has ${paramCount} parameters, exceeds maximum of ${this.options.maxParameters}.`,
        location: {
          start: {
            line: functionNode.loc.start.line,
            column: functionNode.loc.start.column,
          },
          end: {
            line: functionNode.loc.end.line,
            column: functionNode.loc.end.column,
          },
        },
      });
    }
  }

  /**
   * Calculate cyclomatic complexity of a function
   *
   * Complexity starts at 1 and increases by 1 for each:
   * - if statement
   * - for loop
   * - while loop
   * - do-while loop
   * - case in switch
   * - catch clause
   * - logical operator (&&, ||)
   * - ternary operator (?:)
   */
  private calculateComplexity(functionNode: any): number {
    let complexity = 1; // Base complexity

    if (!functionNode.body) {
      return complexity;
    }

    this.walker.walk(functionNode.body, {
      enter: (node: any) => {
        // Decision points that increase complexity
        if (
          node.type === 'IfStatement' ||
          node.type === 'ForStatement' ||
          node.type === 'WhileStatement' ||
          node.type === 'DoWhileStatement'
        ) {
          complexity++;
        }

        // Logical operators (&&, ||)
        if (node.type === 'BinaryOperation') {
          if (node.operator === '&&' || node.operator === '||') {
            complexity++;
          }
        }

        // Ternary operator (?:)
        if (node.type === 'Conditional') {
          complexity++;
        }

        return undefined;
      },
    });

    return complexity;
  }
}
