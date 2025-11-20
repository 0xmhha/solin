/**
 * No Empty Blocks Rule
 *
 * Detects empty code blocks that should be removed or implemented
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that detects empty code blocks
 */
export class NoEmptyBlocksRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/no-empty-blocks',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'No Empty Blocks',
      description: 'Empty code blocks should be removed or implemented',
      recommendation:
        'Remove empty blocks or add implementation. Empty blocks can indicate incomplete code or unnecessary declarations.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        this.checkEmptyBlock(node, context);
        return undefined;
      },
    });
  }

  /**
   * Check if a node represents an empty block
   */
  private checkEmptyBlock(node: ASTNode, context: AnalysisContext): void {
    // Check empty contracts
    if (node.type === 'ContractDefinition') {
      this.checkEmptyContract(node, context);
    }

    // Check empty functions
    if (node.type === 'FunctionDefinition') {
      this.checkEmptyFunction(node, context);
    }

    // Check empty modifiers
    if (node.type === 'ModifierDefinition') {
      this.checkEmptyModifier(node, context);
    }
  }

  /**
   * Check if contract is empty
   */
  private checkEmptyContract(node: any, context: AnalysisContext): void {
    const subNodes = node.subNodes || [];

    if (subNodes.length === 0 && node.loc) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Empty contract '${node.name || 'unnamed'}' should be removed or implemented`,
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

  /**
   * Check if function is empty
   */
  private checkEmptyFunction(node: any, context: AnalysisContext): void {
    const body = node.body;

    // Function has no body (interface or abstract)
    if (!body) {
      return;
    }

    // Check if body is empty
    const statements = body.statements || [];

    // Allow empty fallback and receive functions (they can just accept ETH)
    const functionName = node.name || '';
    if (
      functionName === 'fallback' ||
      functionName === 'receive' ||
      node.isFallback ||
      node.isReceiveEther
    ) {
      return;
    }

    // Check if truly empty (no statements)
    if (statements.length === 0 && node.loc) {
      const name = node.name || 'unnamed function';
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Empty function '${name}' should be removed or implemented`,
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

  /**
   * Check if modifier is empty
   */
  private checkEmptyModifier(node: any, context: AnalysisContext): void {
    const body = node.body;

    if (!body) {
      return;
    }

    const statements = body.statements || [];

    // Modifier must have at least the placeholder (_)
    // If it only has the placeholder or is completely empty, it's useless
    if (statements.length === 0 && node.loc) {
      const name = node.name || 'unnamed modifier';
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Empty modifier '${name}' should be removed or implemented`,
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
