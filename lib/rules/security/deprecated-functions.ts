/**
 * Deprecated Functions Security Rule
 *
 * Detects usage of deprecated Solidity functions and modifiers that have been
 * replaced with safer or more modern alternatives.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

interface DeprecatedItem {
  name: string;
  replacement: string;
  reason: string;
}

export class DeprecatedFunctionsRule extends AbstractRule {
  private static readonly DEPRECATED_FUNCTIONS: DeprecatedItem[] = [
    {
      name: 'suicide',
      replacement: 'selfdestruct',
      reason: 'suicide is deprecated and removed in Solidity 0.5.0',
    },
    {
      name: 'sha3',
      replacement: 'keccak256',
      reason: 'sha3 is deprecated, use keccak256 instead',
    },
    {
      name: 'callcode',
      replacement: 'delegatecall',
      reason: 'callcode is deprecated, use delegatecall instead',
    },
    {
      name: 'throw',
      replacement: 'revert',
      reason: 'throw is deprecated, use revert() instead',
    },
  ];

  private static readonly DEPRECATED_MODIFIERS: DeprecatedItem[] = [
    {
      name: 'constant',
      replacement: 'view or pure',
      reason: 'constant modifier is deprecated, use view or pure instead',
    },
  ];

  constructor() {
    super({
      id: 'security/deprecated-functions',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Deprecated Functions and Modifiers',
      description:
        'Detects usage of deprecated Solidity functions and modifiers (suicide, throw, sha3, callcode, constant). ' +
        'These have been replaced with safer or more accurate alternatives in newer Solidity versions.',
      recommendation:
        'Replace deprecated functions: suicide → selfdestruct, sha3 → keccak256, callcode → delegatecall, ' +
        'throw → revert(), constant → view/pure. Update pragma to use Solidity 0.5.0 or later.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for deprecated function calls
    if (node.type === 'FunctionCall') {
      this.checkFunctionCall(node, context);
    }

    // Check for throw statement
    if (node.type === 'ThrowStatement') {
      this.reportDeprecated(node, 'throw', 'revert()', 'throw is deprecated', context);
    }

    // Check for deprecated modifiers in function definitions
    if (node.type === 'FunctionDefinition') {
      this.checkFunctionModifiers(node, context);
      this.checkStateMutability(node, context);
    }

    // Recursively traverse
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkFunctionCall(node: any, context: AnalysisContext): void {
    if (!node.expression) return;

    // Check for simple function calls (suicide, sha3)
    if (node.expression.type === 'Identifier') {
      const functionName = node.expression.name;
      const deprecated = DeprecatedFunctionsRule.DEPRECATED_FUNCTIONS.find(
        item => item.name === functionName
      );
      if (deprecated) {
        this.reportDeprecated(
          node,
          deprecated.name,
          deprecated.replacement,
          deprecated.reason,
          context
        );
      }
    }

    // Check for member access calls (address.callcode())
    if (node.expression.type === 'MemberAccess') {
      const memberName = node.expression.memberName;
      const deprecated = DeprecatedFunctionsRule.DEPRECATED_FUNCTIONS.find(
        item => item.name === memberName
      );
      if (deprecated) {
        this.reportDeprecated(
          node,
          deprecated.name,
          deprecated.replacement,
          deprecated.reason,
          context
        );
      }
    }
  }

  private checkFunctionModifiers(node: any, context: AnalysisContext): void {
    if (!node.modifiers || !Array.isArray(node.modifiers)) return;

    for (const modifier of node.modifiers) {
      if (modifier.name) {
        const deprecated = DeprecatedFunctionsRule.DEPRECATED_MODIFIERS.find(
          item => item.name === modifier.name
        );
        if (deprecated) {
          this.reportDeprecated(
            modifier,
            deprecated.name,
            deprecated.replacement,
            deprecated.reason,
            context
          );
        }
      }
    }
  }

  private checkStateMutability(node: any, context: AnalysisContext): void {
    if (node.stateMutability === 'constant') {
      const deprecated = DeprecatedFunctionsRule.DEPRECATED_MODIFIERS.find(
        item => item.name === 'constant'
      );
      if (deprecated) {
        this.reportDeprecated(
          node,
          deprecated.name,
          deprecated.replacement,
          deprecated.reason,
          context
        );
      }
    }
  }

  private reportDeprecated(
    node: any,
    name: string,
    replacement: string,
    reason: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `Deprecated ${name} detected. ${reason}. ` +
        `Use ${replacement} instead for Solidity 0.5.0+ compatibility. ` +
        'Deprecated functions may behave unexpectedly or be removed in future compiler versions.',
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
