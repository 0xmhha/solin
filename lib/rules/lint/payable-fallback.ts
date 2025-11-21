/**
 * Payable Fallback Rule
 *
 * Ensures fallback functions are payable when receiving Ether
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that ensures fallback functions are marked as payable.
 * If a contract should accept Ether through the fallback function,
 * it must be explicitly marked as payable. Non-payable fallback functions
 * will reject Ether transfers.
 */
export class PayableFallbackRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/payable-fallback',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Payable Fallback Function',
      description:
        'Fallback functions should be marked as payable if the contract intends to receive Ether',
      recommendation:
        'Add the payable modifier to fallback functions that should accept Ether. Non-payable fallback functions will reject Ether transfers, which may cause unexpected behavior.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'FunctionDefinition') {
          this.checkFallbackFunction(node as any, context);
        }
        return undefined;
      },
    });
  }

  /**
   * Check if a fallback function is properly marked as payable
   */
  private checkFallbackFunction(node: any, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    const name = node.name;
    const isPayable = node.stateMutability === 'payable';
    const isFallback = node.isFallback || name === 'fallback' || (!name && !node.isConstructor);
    const isReceive = node.isReceiveEther || name === 'receive';

    // Check fallback function
    if (isFallback && !isReceive) {
      if (!isPayable) {
        const functionName = name || 'fallback';
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Fallback function '${functionName}' should be marked as payable to accept Ether. If Ether transfers are not intended, explicitly document this decision.`,
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
          metadata: {
            suggestion: `Add 'payable' modifier: fallback() external payable {}`,
          },
        });
      }
    }

    // Receive functions must be payable by definition (enforced by compiler)
    // So we don't need to check them here
  }
}
