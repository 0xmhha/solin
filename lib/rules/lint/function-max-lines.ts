/**
 * Function Max Lines Rule
 *
 * Enforces maximum number of lines per function to improve readability and maintainability.
 * Long functions are harder to understand, test, and maintain.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface FunctionMaxLinesOptions {
  max?: number; // Maximum lines per function (default: 50)
}

export class FunctionMaxLinesRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/function-max-lines',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Function Max Lines',
      description:
        'Enforces maximum number of lines per function to improve readability and maintainability. ' +
        'Long functions are harder to understand, test, and maintain. Consider breaking them into smaller, ' +
        'more focused functions.',
      recommendation:
        'Keep functions under the configured maximum line count (default: 50 lines). ' +
        'Break long functions into smaller, single-purpose functions for better maintainability.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Get custom options from config
    let maxLines = 50;

    const ruleConfig = context.config.rules?.[this.metadata.id];
    if (Array.isArray(ruleConfig) && ruleConfig[1]) {
      const customOptions = ruleConfig[1] as FunctionMaxLinesOptions;
      maxLines = customOptions.max ?? maxLines;
    }

    // Traverse AST to find function definitions
    this.visitNode(context.ast, (node) => {
      if (
        node.type === 'FunctionDefinition' ||
        node.type === 'ModifierDefinition' ||
        node.type === 'ConstructorDefinition'
      ) {
        this.checkFunctionLength(node, maxLines, context);
      }
    });
  }

  private visitNode(node: any, callback: (node: any) => void): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    callback(node);

    // Recursively visit all child nodes
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((item) => this.visitNode(item, callback));
      } else if (typeof child === 'object' && child !== null) {
        this.visitNode(child, callback);
      }
    }
  }

  private checkFunctionLength(
    node: any,
    maxLines: number,
    context: AnalysisContext
  ): void {
    if (!node.loc) {
      return;
    }

    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const lineCount = endLine - startLine + 1;

    if (lineCount > maxLines) {
      const functionName =
        node.type === 'ConstructorDefinition'
          ? 'constructor'
          : node.name || 'anonymous';

      this.reportLongFunction(
        startLine,
        functionName,
        lineCount,
        maxLines,
        context
      );
    }
  }

  private reportLongFunction(
    line: number,
    functionName: string,
    actualLines: number,
    maxLines: number,
    context: AnalysisContext
  ): void {
    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Function '${functionName}' has ${actualLines} lines, exceeding the maximum of ${maxLines} lines. ` +
        `Consider breaking it into smaller, more focused functions.`,
      location: {
        start: { line, column: 0 },
        end: { line, column: 1 },
      },
    });
  }
}
