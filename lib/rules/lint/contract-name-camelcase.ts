/**
 * Contract Name CamelCase Rule
 *
 * Enforces PascalCase naming convention for contracts, libraries, and interfaces.
 * Following Solidity style guide best practices.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class ContractNameCamelCaseRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/contract-name-camelcase',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Contract Name CamelCase',
      description:
        'Enforces PascalCase naming convention for contracts, libraries, and interfaces. ' +
        'Contract names should start with an uppercase letter and use PascalCase for multi-word names. ' +
        'This follows the Solidity style guide and improves code consistency.',
      recommendation:
        'Use PascalCase for contract, library, and interface names. ' +
        'Examples: MyContract, ERC20Token, SafeMath, IERC721',
    });
  }

  analyze(context: AnalysisContext): void {
    // Traverse AST to find contract-like definitions
    this.visitNode(context.ast, node => {
      if (
        node.type === 'ContractDefinition' ||
        node.type === 'LibraryDefinition' ||
        node.type === 'InterfaceDefinition'
      ) {
        this.checkNamingConvention(node, context);
      }
    });
  }

  private visitNode(node: any, callback: (node: any) => void): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    callback(node);

    // Recursively visit all child nodes
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => this.visitNode(item, callback));
      } else if (typeof child === 'object' && child !== null) {
        this.visitNode(child, callback);
      }
    }
  }

  private checkNamingConvention(node: any, context: AnalysisContext): void {
    const name = node.name;
    if (!name || !node.loc) {
      return;
    }

    // Check if name follows PascalCase convention
    if (!this.isPascalCase(name)) {
      this.reportInvalidName(node.loc.start.line, name, node.type, context);
    }
  }

  private isPascalCase(name: string): boolean {
    // PascalCase rules:
    // 1. Must start with uppercase letter
    // 2. No underscores
    // 3. Allow specific patterns: interface prefix (I*), acronyms with numbers (ERC20), or mixed case

    // Check if starts with uppercase
    if (!/^[A-Z]/.test(name)) {
      return false;
    }

    // Check for underscores
    if (name.includes('_')) {
      return false;
    }

    // Valid PascalCase: starts with uppercase, no underscores, uses letters and numbers
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
      return false;
    }

    // Allow specific all-caps patterns:
    // 1. Starts with 'I' (interface convention: IERC20, IERC721)
    // 2. Contains numbers (acronym convention: ERC20, ERC721)
    // 3. Has at least one lowercase letter (standard PascalCase)
    const hasLowercase = /[a-z]/.test(name);
    const startsWithI = name.startsWith('I') && name.length > 1;
    const hasNumbers = /[0-9]/.test(name);

    if (!hasLowercase && !startsWithI && !hasNumbers) {
      // All caps without special patterns (e.g., MYCONTRACT)
      return false;
    }

    return true;
  }

  private reportInvalidName(
    line: number,
    name: string,
    nodeType: string,
    context: AnalysisContext
  ): void {
    const typeName =
      nodeType === 'ContractDefinition'
        ? 'Contract'
        : nodeType === 'LibraryDefinition'
          ? 'Library'
          : 'Interface';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        `${typeName} '${name}' should use PascalCase naming convention. ` +
        `Start with uppercase and use camelCase for multi-word names (e.g., MyContract, ERC20Token).`,
      location: {
        start: { line, column: 0 },
        end: { line, column: 1 },
      },
    });
  }
}
