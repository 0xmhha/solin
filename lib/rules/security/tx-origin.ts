/**
 * Tx.Origin Security Rule
 *
 * Detects dangerous usage of tx.origin for authorization
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects tx.origin usage:
 * - tx.origin should not be used for authorization
 * - Vulnerable to phishing attacks
 * - Use msg.sender instead
 */
export class TxOriginRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/tx-origin',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Avoid tx.origin for Authorization',
      description: 'Using tx.origin for authorization is vulnerable to phishing attacks',
      recommendation:
        'Use msg.sender instead of tx.origin for authorization checks. tx.origin returns the original sender of the transaction, which can be exploited in phishing attacks where a malicious contract tricks users into calling it.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST and check every node
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check current node
    if (node.type === 'MemberAccess') {
      this.checkMemberAccess(node, context);
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
   * Check if member access is tx.origin
   */
  private checkMemberAccess(node: any, context: AnalysisContext): void {
    const memberName = node.memberName;
    const expression = node.expression;

    if (!node.loc) {
      return;
    }

    // Check if this is accessing 'origin' member
    if (memberName === 'origin') {
      // Check if the expression is 'tx'
      if (expression && expression.type === 'Identifier' && expression.name === 'tx') {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message:
            'Avoid using tx.origin for authorization. Use msg.sender instead to prevent phishing attacks.',
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
  }
}
