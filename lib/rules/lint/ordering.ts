/**
 * Ordering Rule
 *
 * Enforces comprehensive ordering of contract members following Solidity style guide.
 * Recommended order: state variables, events, constructor, modifiers, functions
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Member type for ordering
 */
enum MemberType {
  STATE_VARIABLE = 1,
  EVENT = 2,
  CONSTRUCTOR = 3,
  MODIFIER = 4,
  FUNCTION = 5,
}

interface Member {
  type: MemberType;
  typeName: string;
  line: number;
  node: ASTNode;
}

/**
 * Rule that enforces comprehensive member ordering in contracts.
 * Order: state variables -> events -> constructor -> modifiers -> functions
 */
export class OrderingRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/ordering',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Contract Member Ordering',
      description:
        'Enforces the recommended ordering of contract members: ' +
        'state variables, events, constructor, modifiers, then functions. ' +
        'This follows the Solidity style guide and improves code readability.',
      recommendation:
        'Organize contract members in the following order: ' +
        '1. State variables ' +
        '2. Events ' +
        '3. Constructor ' +
        '4. Modifiers ' +
        '5. Functions',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        // Check each contract definition
        if (
          node.type === 'ContractDefinition' ||
          node.type === 'InterfaceDefinition' ||
          node.type === 'LibraryDefinition'
        ) {
          this.checkContractMemberOrdering(node, context);
        }

        return undefined;
      },
    });
  }

  /**
   * Check member ordering within a contract
   */
  private checkContractMemberOrdering(
    contractNode: ASTNode,
    context: AnalysisContext,
  ): void {
    const subNodes = (contractNode as any).subNodes;

    if (!subNodes || !Array.isArray(subNodes)) {
      return;
    }

    const members: Member[] = [];

    // Categorize each member
    for (const node of subNodes) {
      if (!node.loc) {
        continue;
      }

      const memberType = this.getMemberType(node);
      if (memberType) {
        members.push({
          type: memberType,
          typeName: this.getMemberTypeName(memberType),
          line: node.loc.start.line,
          node,
        });
      }
    }

    // Check ordering
    for (let i = 0; i < members.length - 1; i++) {
      const current = members[i]!;
      const next = members[i + 1]!;

      // If next member has a lower order value than current, it's out of order
      if (next.type < current.type) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Incorrect member ordering: ${next.typeName} should come before ${current.typeName}.`,
          location: {
            start: {
              line: next.node.loc!.start.line,
              column: next.node.loc!.start.column,
            },
            end: {
              line: next.node.loc!.end.line,
              column: next.node.loc!.end.column,
            },
          },
          metadata: {
            suggestion: `Reorganize members to follow the order: state variables, events, constructor, modifiers, functions.`,
          },
        });
      }
    }
  }

  /**
   * Get member type for ordering
   */
  private getMemberType(node: ASTNode): MemberType | null {
    if (node.type === 'StateVariableDeclaration') {
      return MemberType.STATE_VARIABLE;
    }

    if (node.type === 'EventDefinition') {
      return MemberType.EVENT;
    }

    if (node.type === 'FunctionDefinition') {
      if ((node as any).isConstructor) {
        return MemberType.CONSTRUCTOR;
      }
      return MemberType.FUNCTION;
    }

    if (node.type === 'ModifierDefinition') {
      return MemberType.MODIFIER;
    }

    return null;
  }

  /**
   * Get human-readable member type name
   */
  private getMemberTypeName(type: MemberType): string {
    switch (type) {
      case MemberType.STATE_VARIABLE:
        return 'state variable';
      case MemberType.EVENT:
        return 'event';
      case MemberType.CONSTRUCTOR:
        return 'constructor';
      case MemberType.MODIFIER:
        return 'modifier';
      case MemberType.FUNCTION:
        return 'function';
      default:
        return 'unknown';
    }
  }
}
