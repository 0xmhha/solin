/**
 * Gas Multitoken1155 Lint Rule
 *
 * Recommends using ERC1155 for contracts with multiple token types
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects contracts with multiple token-like mappings:
 * - ERC1155 can represent multiple fungible and non-fungible tokens in a single contract
 * - Saves deployment gas by deploying once instead of multiple contracts
 * - Saves ~5,000-20,000 gas per batch transfer vs individual transfers
 * - Reduces contract complexity and maintenance overhead
 *
 * Threshold: 3 or more token-like mappings (address=>uint256 or uint256=>address)
 */
export class GasMultitoken1155 extends AbstractRule {
  constructor() {
    super({
      id: 'gas/multitoken1155',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Use ERC1155 for multiple token types',
      description:
        'Detects contracts with multiple token-like mappings (3+). ERC1155 saves deployment gas by consolidating tokens and saves 5,000-20,000 gas per batch transaction vs individual transfers.',
      recommendation:
        'Consider using ERC1155 standard for contracts managing multiple token types. ERC1155 allows batch operations and reduces deployment costs significantly.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find contracts with multiple token mappings
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for ContractDefinition nodes
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
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check if contract has multiple token-like mappings
   */
  private checkContract(node: any, context: AnalysisContext): void {
    if (!node.subNodes || !Array.isArray(node.subNodes)) {
      return;
    }

    // Count token-like mappings
    const tokenMappings = node.subNodes.filter((subNode: any) => {
      return this.isTokenMapping(subNode);
    });

    // Threshold: 3 or more token mappings suggests ERC1155 usage
    if (tokenMappings.length >= 3) {
      if (node.loc) {
        const isFungible = this.hasFungiblePattern(tokenMappings);
        const tokenType = isFungible ? 'fungible tokens' : 'token types';

        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Contract has ${tokenMappings.length} ${tokenType}. Consider using ERC1155 for gas savings: ~20,000 gas per batch transfer and reduced deployment costs.`,
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

  /**
   * Check if a state variable is a token-like mapping
   * Token patterns:
   * - mapping(address => uint256) - fungible token balances
   * - mapping(uint256 => address) - NFT ownership
   */
  private isTokenMapping(node: any): boolean {
    // Must be a StateVariableDeclaration
    if (node.type !== 'StateVariableDeclaration') {
      return false;
    }

    // Get the variable declaration
    const variables = node.variables;
    if (!variables || !Array.isArray(variables) || variables.length === 0) {
      return false;
    }

    const variable = variables[0];
    if (!variable || !variable.typeName) {
      return false;
    }

    const typeName = variable.typeName;

    // Must be a Mapping
    if (typeName.type !== 'Mapping') {
      return false;
    }

    // Check for token patterns
    return (
      this.isAddressToUint256Mapping(typeName) ||
      this.isUint256ToAddressMapping(typeName)
    );
  }

  /**
   * Check if mapping is address => uint256 (fungible token balances)
   */
  private isAddressToUint256Mapping(typeName: any): boolean {
    const keyType = typeName.keyType;
    const valueType = typeName.valueType;

    if (!keyType || !valueType) {
      return false;
    }

    // Key: address
    const isAddressKey =
      keyType.type === 'ElementaryTypeName' && keyType.name === 'address';

    // Value: uint256 (or uint)
    const isUint256Value =
      valueType.type === 'ElementaryTypeName' &&
      (valueType.name === 'uint256' || valueType.name === 'uint');

    return isAddressKey && isUint256Value;
  }

  /**
   * Check if mapping is uint256 => address (NFT ownership)
   */
  private isUint256ToAddressMapping(typeName: any): boolean {
    const keyType = typeName.keyType;
    const valueType = typeName.valueType;

    if (!keyType || !valueType) {
      return false;
    }

    // Key: uint256 (or uint)
    const isUint256Key =
      keyType.type === 'ElementaryTypeName' &&
      (keyType.name === 'uint256' || keyType.name === 'uint');

    // Value: address
    const isAddressValue =
      valueType.type === 'ElementaryTypeName' && valueType.name === 'address';

    return isUint256Key && isAddressValue;
  }

  /**
   * Check if mappings follow fungible token pattern (address => uint256)
   */
  private hasFungiblePattern(mappings: any[]): boolean {
    return mappings.some((node) => {
      const variable = node.variables?.[0];
      const typeName = variable?.typeName;
      return typeName && this.isAddressToUint256Mapping(typeName);
    });
  }
}
