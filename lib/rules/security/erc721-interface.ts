/**
 * ERC721 Interface Security Rule
 *
 * Validates ERC721 interface implementation
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Required ERC721 functions
 */
const REQUIRED_ERC721_FUNCTIONS = [
  'balanceOf',
  'ownerOf',
  'safeTransferFrom',
  'transferFrom',
  'approve',
  'setApprovalForAll',
  'getApproved',
  'isApprovedForAll',
];

/**
 * Rule that validates ERC721 interface implementation:
 * - Checks for presence of all required ERC721 functions
 * - Helps ensure compliance with ERC721 NFT standard
 * - Only checks contracts that appear to be NFTs
 */
export class ERC721Interface extends AbstractRule {
  constructor() {
    super({
      id: 'security/erc721-interface',
      category: Category.SECURITY,
      severity: Severity.INFO,
      title: 'Incomplete ERC721 interface',
      description:
        'Validates that contracts implementing NFT-like functionality include all required ERC721 functions.',
      recommendation:
        'Implement all required ERC721 functions to ensure compliance with the standard and compatibility with NFT marketplaces.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find contracts
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check contracts
    if (node.type === 'ContractDefinition') {
      this.checkContract(node, context);
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
   * Check if contract implements ERC721 interface
   */
  private checkContract(contract: any, context: AnalysisContext): void {
    if (!contract.subNodes || !Array.isArray(contract.subNodes)) {
      return;
    }

    // Get all function names
    const functions = contract.subNodes
      .filter((node: any) => node.type === 'FunctionDefinition')
      .map((node: any) => node.name)
      .filter(Boolean);

    // Check if this looks like an NFT contract (has at least 3 ERC721 functions)
    const erc721FunctionsPresent = REQUIRED_ERC721_FUNCTIONS.filter(fn => functions.includes(fn));

    if (erc721FunctionsPresent.length >= 3) {
      // This appears to be an NFT contract, check for missing functions
      const missingFunctions = REQUIRED_ERC721_FUNCTIONS.filter(fn => !functions.includes(fn));

      if (missingFunctions.length > 0) {
        this.reportIssue(contract, missingFunctions, context);
      }
    }
  }

  /**
   * Report issue for missing ERC721 functions
   */
  private reportIssue(contract: any, missingFunctions: string[], context: AnalysisContext): void {
    if (!contract.loc) {
      return;
    }

    const functionList = missingFunctions.join(', ');

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Contract appears to implement ERC721 but is missing required functions: ${functionList}`,
      location: {
        start: {
          line: contract.loc.start.line,
          column: contract.loc.start.column,
        },
        end: {
          line: contract.loc.end.line,
          column: contract.loc.end.column,
        },
      },
    });
  }
}
