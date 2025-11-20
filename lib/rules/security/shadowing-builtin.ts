/**
 * Shadowing Built-in Security Rule
 *
 * Detects shadowing of Solidity built-in variables, functions, and keywords.
 * Shadowing built-ins can cause confusion and unexpected behavior.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class ShadowingBuiltinRule extends AbstractRule {
  private reportedLocations: Set<string> = new Set();

  // Built-in Solidity keywords and globals that should not be shadowed
  private readonly builtins = new Set([
    // Global variables
    'msg',
    'tx',
    'block',
    'now', // Deprecated in 0.7.0+, but still worth checking
    'abi',
    'gasleft',
    'this',
    'super',
    'type',

    // Built-in functions
    'require',
    'assert',
    'revert',
    'selfdestruct',
    'suicide', // Deprecated alias
    'addmod',
    'mulmod',
    'keccak256',
    'sha256',
    'sha3', // Deprecated
    'ripemd160',
    'ecrecover',
  ]);

  constructor() {
    super({
      id: 'security/shadowing-builtin',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Shadowing Built-in Variable/Function',
      description:
        'Detects variable or parameter names that shadow Solidity built-in global variables (msg, tx, block), functions (require, assert, revert), or keywords. Shadowing built-ins causes confusion, makes code harder to understand, and can lead to bugs where developers accidentally use the local variable instead of the built-in.',
      recommendation:
        'Rename variables to avoid shadowing built-ins. Use descriptive names like _msg, message, or messageData instead of msg. Avoid using built-in names for any user-defined identifiers.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.reportedLocations.clear();
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check function parameters
    if (node.type === 'FunctionDefinition') {
      this.checkFunctionParameters(node, context);
    }

    // Check variable declarations (local and state variables)
    if (node.type === 'VariableDeclaration') {
      this.checkVariableDeclaration(node, context);
    }

    // Check state variable declarations
    if (node.type === 'StateVariableDeclaration') {
      this.checkStateVariableDeclaration(node, context);
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

  private checkFunctionParameters(node: any, context: AnalysisContext): void {
    if (!node.parameters) return;

    for (const param of node.parameters) {
      if (param.name && this.builtins.has(param.name)) {
        this.reportIssue(param, 'function parameter', context);
      }
    }
  }

  private checkVariableDeclaration(node: any, context: AnalysisContext): void {
    if (node.name && this.builtins.has(node.name)) {
      this.reportIssue(node, 'local variable', context);
    }
  }

  private checkStateVariableDeclaration(node: any, context: AnalysisContext): void {
    if (!node.variables) return;

    for (const variable of node.variables) {
      if (variable.name && this.builtins.has(variable.name)) {
        this.reportIssue(variable, 'state variable', context);
      }
    }
  }

  private reportIssue(node: any, variableType: string, context: AnalysisContext): void {
    if (!node.loc) return;

    // Create unique location key to avoid duplicate reports
    const locationKey = `${node.loc.start.line}:${node.loc.start.column}`;
    if (this.reportedLocations.has(locationKey)) {
      return;
    }
    this.reportedLocations.add(locationKey);

    const varName = node.name;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `${variableType.charAt(0).toUpperCase() + variableType.slice(1)} '${varName}' shadows Solidity built-in. This causes confusion and can lead to bugs where the wrong identifier is used. Rename to avoid shadowing: use descriptive name like _${varName}, ${varName}Data, or my${varName.charAt(0).toUpperCase() + varName.slice(1)}.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
