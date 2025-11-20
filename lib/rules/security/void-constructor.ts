/**
 * Void Constructor Security Rule
 *
 * Detects functions with names similar to the contract name that might be
 * intended as constructors but are actually public functions due to typos.
 * This was a common vulnerability in Solidity <0.5.0 before constructor keyword.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class VoidConstructorRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/void-constructor',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Void Constructor',
      description:
        'Detects functions with names similar to the contract name that might be intended as constructors. ' +
        'In Solidity <0.5.0, constructors were functions with the same name as the contract. ' +
        'Typos in constructor names create public functions instead of constructors, allowing anyone to call initialization logic.',
      recommendation:
        'Use the constructor keyword (Solidity >=0.5.0) instead of contract-named functions. ' +
        'Check for typos in function names that resemble the contract name. ' +
        'Upgrade to Solidity 0.5.0+ to use modern constructor syntax.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Analyze each contract
    if (node.type === 'ContractDefinition') {
      this.analyzeContract(node, context);
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

  private analyzeContract(contractNode: any, context: AnalysisContext): void {
    const contractName = contractNode.name;
    if (!contractName) return;

    // Skip interfaces and libraries
    if (contractNode.kind === 'interface' || contractNode.kind === 'library') {
      return;
    }

    // Find all functions in the contract
    const functions = this.getFunctions(contractNode);

    for (const func of functions) {
      const funcName = func.name;
      if (!funcName) continue;

      // Check if function name is similar to contract name
      // This includes both old-style constructors (exact match) and typos (similar match)
      if (this.isSimilar(funcName, contractName)) {
        this.reportIssue(func, contractName, funcName, context);
      }
    }
  }

  private getFunctions(contractNode: any): any[] {
    const functions: any[] = [];

    if (!contractNode.subNodes || !Array.isArray(contractNode.subNodes)) {
      return functions;
    }

    for (const node of contractNode.subNodes) {
      if (node.type === 'FunctionDefinition') {
        functions.push(node);
      }
    }

    return functions;
  }

  private isSimilar(funcName: string, contractName: string): boolean {
    // Exact match but not marked as constructor (old style constructor)
    if (funcName === contractName) {
      return true;
    }

    // Case-insensitive comparison
    const funcLower = funcName.toLowerCase();
    const contractLower = contractName.toLowerCase();

    if (funcLower === contractLower) {
      return true;
    }

    // Check Levenshtein distance for typos
    const distance = this.levenshteinDistance(funcLower, contractLower);
    const maxLength = Math.max(funcName.length, contractName.length);

    // If distance is small relative to length, it's likely a typo
    // Allow 1-2 character differences for short names, more for longer names
    const threshold = maxLength <= 4 ? 1 : maxLength <= 8 ? 2 : Math.ceil(maxLength * 0.25);

    return distance <= threshold && distance > 0;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= len1; i++) {
      dp[i]![0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0]![j] = j;
    }

    // Fill the DP table
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i]![j] = dp[i - 1]![j - 1]!;
        } else {
          dp[i]![j] = Math.min(
            dp[i - 1]![j]! + 1, // deletion
            dp[i]![j - 1]! + 1, // insertion
            dp[i - 1]![j - 1]! + 1 // substitution
          );
        }
      }
    }

    return dp[len1]![len2]!;
  }

  private reportIssue(
    node: any,
    contractName: string,
    funcName: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) return;

    const isExactMatch = funcName === contractName;
    const message = isExactMatch
      ? `Function '${funcName}' has the same name as contract '${contractName}' but is not marked as constructor. ` +
        'In Solidity <0.5.0, this would be a constructor, but without isConstructor=true it becomes a public function. ' +
        'Use constructor keyword (Solidity >=0.5.0) or verify this is not intended as a constructor.'
      : `Function '${funcName}' has a name similar to contract '${contractName}' and might be a typo in constructor name. ` +
        'If this was intended as a constructor, it will be a public function instead due to the name mismatch. ' +
        'Use constructor keyword (Solidity >=0.5.0) or fix the function name.';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message:
        message +
        ' Void constructors allow anyone to call initialization logic, potentially leading to unauthorized ownership transfer or configuration changes.',
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
