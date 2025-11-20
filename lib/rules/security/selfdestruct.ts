/**
 * Selfdestruct Security Rule
 *
 * Detects usage of selfdestruct (or its deprecated alias 'suicide').
 * Selfdestruct is extremely dangerous as it:
 * - Permanently destroys the contract
 * - Forces ETH transfer to any address (griefing attacks)
 * - Can be used for rugpull attacks
 * - Breaks contract upgradeability patterns
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects selfdestruct usage:
 * - Direct selfdestruct calls
 * - Deprecated 'suicide' alias
 * - In any function visibility
 * - With or without access control
 *
 * Note: Even with access control, selfdestruct is dangerous and should be avoided
 */
export class SelfdestructRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/selfdestruct',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Dangerous Selfdestruct Usage',
      description:
        'Detects usage of selfdestruct or suicide. These functions permanently destroy contracts and force ETH transfers, enabling rugpulls, griefing attacks, and breaking upgradeability. They should be avoided in production code.',
      recommendation:
        'Remove selfdestruct from production contracts. Use pausable patterns, circuit breakers, or upgradeable proxy patterns instead. If absolutely necessary, implement multi-signature requirements and time-delays.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST to find selfdestruct calls
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for function calls
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
   * Check if a function call is selfdestruct or suicide
   */
  private checkFunctionCall(node: any, context: AnalysisContext): void {
    // Check if it's a direct identifier call (selfdestruct or suicide)
    if (node.expression && node.expression.type === 'Identifier') {
      const functionName = node.expression.name;

      if (functionName === 'selfdestruct' || functionName === 'suicide') {
        this.reportSelfdestruct(node, functionName, context);
      }
    }
  }

  /**
   * Report a selfdestruct usage
   */
  private reportSelfdestruct(node: any, functionName: string, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    const isSuicide = functionName === 'suicide';
    const baseMessage = isSuicide ? "Use of deprecated 'suicide' function" : 'Use of selfdestruct';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `${baseMessage} detected. This permanently destroys the contract and enables rugpull/griefing attacks. Remove selfdestruct from production code or implement multi-signature with time-delays if absolutely necessary.${
        isSuicide ? " Use 'selfdestruct' instead of the deprecated 'suicide' alias." : ''
      }`,
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
