/**
 * Avoid tx.origin Security Rule
 *
 * Detects dangerous usage of tx.origin for authorization
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects tx.origin usage:
 * - tx.origin returns the address that initiated the transaction (EOA)
 * - msg.sender returns the immediate caller
 * - Using tx.origin for authorization is dangerous (phishing attacks)
 * - Attacker can trick user into calling malicious contract that calls victim
 * - Victim checks tx.origin (user's address) and passes authorization
 * - Always use msg.sender for authorization checks
 */
export class AvoidTxOrigin extends AbstractRule {
  constructor() {
    super({
      id: 'security/avoid-tx-origin',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Avoid dangerous tx.origin usage',
      description:
        'Detects usage of tx.origin for authorization checks. tx.origin returns the original transaction sender (EOA), not the immediate caller. This can be exploited through phishing attacks where a user is tricked into calling a malicious contract that then calls the victim contract.',
      recommendation:
        'Use msg.sender instead of tx.origin for authorization checks. msg.sender represents the immediate caller and is safe from phishing attacks. Example: require(msg.sender == owner) instead of require(tx.origin == owner).',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find tx.origin usage
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for tx.origin MemberAccess
    if (this.isTxOrigin(node)) {
      this.reportIssue(node, context);
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
   * Check if node is tx.origin access
   */
  private isTxOrigin(node: any): boolean {
    if (node?.type !== 'MemberAccess') {
      return false;
    }

    // Check if expression is 'tx' identifier and member is 'origin'
    return (
      node.expression?.type === 'Identifier' &&
      node.expression?.name === 'tx' &&
      node.memberName === 'origin'
    );
  }

  /**
   * Report issue for tx.origin usage
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
        'Dangerous use of tx.origin detected. Using tx.origin for authorization is vulnerable to phishing attacks. Use msg.sender instead for secure authorization checks.',
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
