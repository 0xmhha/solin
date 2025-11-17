/**
 * Gas Indexed Events Lint Rule
 *
 * Recommends using indexed keyword for event parameters to enable efficient filtering
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects event parameters that should be indexed:
 * - address parameters (commonly filtered)
 * - bytes32 parameters (commonly used as keys/IDs)
 * - bool parameters (for status filtering)
 * - enum parameters (for state filtering)
 * - Maximum 3 indexed parameters per event (Solidity limit)
 * - string/bytes/arrays cannot be indexed (only hash stored)
 */
export class GasIndexedEvents extends AbstractRule {
  private static readonly MAX_INDEXED_PARAMS = 3;

  // Types that should typically be indexed
  private static readonly INDEXABLE_TYPES = new Set([
    'address',
    'bytes32',
    'bool',
  ]);

  constructor() {
    super({
      id: 'lint/gas-indexed-events',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Use indexed keyword for event parameters to enable efficient filtering',
      description:
        'Detects event parameters that should be indexed for efficient off-chain filtering and searching. Up to 3 parameters can be indexed per event.',
      recommendation:
        'Add indexed keyword to address, bytes32, bool, and enum parameters in events for efficient filtering. Maximum 3 indexed parameters per event.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find EventDefinition nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for EventDefinition nodes
    if (node.type === 'EventDefinition') {
      this.checkEvent(node, context);
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
   * Check if event parameters should be indexed
   */
  private checkEvent(node: any, context: AnalysisContext): void {
    if (!node.parameters || node.parameters.length === 0) {
      return;
    }

    // Count current indexed parameters
    const indexedCount = node.parameters.filter(
      (param: any) => param.isIndexed
    ).length;

    // Check each parameter
    for (const param of node.parameters) {
      // Skip if already indexed
      if (param.isIndexed) {
        continue;
      }

      // Skip if we've reached the maximum indexed parameters
      if (indexedCount >= GasIndexedEvents.MAX_INDEXED_PARAMS) {
        break;
      }

      // Check if this parameter type should be indexed
      if (this.shouldBeIndexed(param)) {
        this.reportIssue(node, param, context);
      }
    }
  }

  /**
   * Check if a parameter should be indexed based on its type
   */
  private shouldBeIndexed(param: any): boolean {
    if (!param.typeName) {
      return false;
    }

    const typeName = this.getTypeName(param.typeName);

    // Check if type is in the indexable types set
    if (GasIndexedEvents.INDEXABLE_TYPES.has(typeName)) {
      return true;
    }

    // Check for enums (UserDefinedTypeName)
    if (param.typeName.type === 'UserDefinedTypeName') {
      return true;
    }

    return false;
  }

  /**
   * Get type name from TypeName node
   */
  private getTypeName(typeNode: any): string {
    if (!typeNode) {
      return '';
    }

    // ElementaryTypeName (address, uint256, bool, etc.)
    if (typeNode.type === 'ElementaryTypeName') {
      return typeNode.name || '';
    }

    // UserDefinedTypeName (enums, structs, contracts)
    if (typeNode.type === 'UserDefinedTypeName') {
      return typeNode.namePath || '';
    }

    // ArrayTypeName (not indexable)
    if (typeNode.type === 'ArrayTypeName') {
      return 'array';
    }

    // Mapping (not used in events typically)
    if (typeNode.type === 'Mapping') {
      return 'mapping';
    }

    return '';
  }

  /**
   * Report issue for non-indexed parameter
   */
  private reportIssue(
    eventNode: any,
    param: any,
    context: AnalysisContext
  ): void {
    if (!param.loc) {
      return;
    }

    const paramName = param.name || 'parameter';
    const typeName = this.getTypeName(param.typeName);
    const eventName = eventNode.name || 'event';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Event '${eventName}' parameter '${paramName}' (${typeName}) should be indexed for efficient filtering and searching. Add 'indexed' keyword.`,
      location: {
        start: {
          line: param.loc.start.line,
          column: param.loc.start.column,
        },
        end: {
          line: param.loc.end.line,
          column: param.loc.end.column,
        },
      },
    });
  }
}
