/**
 * Prefer External Over Public Rule
 *
 * Suggests external for public functions not called internally
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that suggests using external visibility for public functions
 * that are not called internally. External functions are more gas-efficient
 * for external callers.
 */
export class PreferExternalOverPublicRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/prefer-external-over-public',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Prefer External Over Public',
      description:
        'Public functions that are not called internally should use external visibility for better gas efficiency',
      recommendation:
        'Change the visibility of public functions to external if they are only called from outside the contract. External functions are more gas-efficient for external callers.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    // First pass: collect all public functions and their names
    const publicFunctions = new Map<string, any>();

    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'FunctionDefinition') {
          const funcNode = node as any;
          if (funcNode.visibility === 'public' && funcNode.name && !this.isSpecialFunction(funcNode)) {
            publicFunctions.set(funcNode.name, funcNode);
          }
        }
        return undefined;
      },
    });

    // Second pass: find internal calls to public functions
    const internallyCalledFunctions = new Set<string>();

    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        // Look for function calls that are not prefixed with 'this.'
        if (node.type === 'FunctionCall') {
          const funcCall = node as any;
          const calledName = this.getFunctionCallName(funcCall);

          if (calledName && publicFunctions.has(calledName)) {
            // Check if this is an internal call (not using 'this.')
            if (!this.isExternalCall(funcCall)) {
              internallyCalledFunctions.add(calledName);
            }
          }
        }
        return undefined;
      },
    });

    // Report issues for public functions not called internally
    for (const [name, funcNode] of publicFunctions) {
      if (!internallyCalledFunctions.has(name)) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Function '${name}' is public but not called internally. Consider using 'external' visibility for better gas efficiency.`,
          location: {
            start: {
              line: funcNode.loc.start.line,
              column: funcNode.loc.start.column,
            },
            end: {
              line: funcNode.loc.end.line,
              column: funcNode.loc.end.column,
            },
          },
          metadata: {
            suggestion: `Change visibility from 'public' to 'external'`,
          },
        });
      }
    }
  }

  /**
   * Check if a function is special (constructor, fallback, receive)
   */
  private isSpecialFunction(node: any): boolean {
    const name = node.name;

    if (name === 'constructor' || node.isConstructor) {
      return true;
    }

    if (
      name === 'fallback' ||
      name === 'receive' ||
      node.isFallback ||
      node.isReceiveEther
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get the function name from a function call node
   */
  private getFunctionCallName(funcCall: any): string | null {
    if (funcCall.expression) {
      // Handle different call patterns
      if (funcCall.expression.type === 'Identifier') {
        return funcCall.expression.name;
      }

      if (funcCall.expression.type === 'MemberAccess') {
        return funcCall.expression.memberName;
      }
    }

    return null;
  }

  /**
   * Check if a function call is external (uses 'this.')
   */
  private isExternalCall(funcCall: any): boolean {
    if (funcCall.expression && funcCall.expression.type === 'MemberAccess') {
      const base = funcCall.expression.expression;
      // Check if the base is 'this'
      if (base && base.type === 'Identifier' && base.name === 'this') {
        return true;
      }
    }

    return false;
  }
}
