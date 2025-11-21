/**
 * No Unused Imports Rule
 *
 * Detects and flags unused import statements
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that detects unused import statements.
 * Reports imports that are never referenced in the code.
 */
export class NoUnusedImportsRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/no-unused-imports',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'No Unused Imports',
      description: 'Import statements should not be unused',
      recommendation:
        'Remove unused import statements to keep the code clean and reduce compilation overhead.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    // First pass: collect all imported symbols
    const imports = new Map<string, any>();

    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'ImportDirective') {
          const importNode = node as any;
          const symbols = this.extractImportedSymbols(importNode);

          for (const symbol of symbols) {
            imports.set(symbol, importNode);
          }
        }
        return undefined;
      },
    });

    // Second pass: find usages of imported symbols
    const usedSymbols = new Set<string>();

    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        // Check for identifier usage
        if (node.type === 'Identifier') {
          const identifier = (node as any).name;
          if (identifier && imports.has(identifier)) {
            usedSymbols.add(identifier);
          }
        }

        // Check for user defined type names (contract/interface references)
        if (node.type === 'UserDefinedTypeName') {
          const typeName = (node as any).namePath;
          if (typeName) {
            // Handle dotted paths like "Library.StructName"
            const parts = typeName.split('.');
            for (const part of parts) {
              if (imports.has(part)) {
                usedSymbols.add(part);
              }
            }
          }
        }

        // Check for variable declarations (function parameters, return types, etc.)
        if (node.type === 'VariableDeclaration') {
          const varDecl = node as any;
          if (varDecl.typeName) {
            // Check if the type name matches an import
            const typeName = varDecl.typeName.namePath || varDecl.typeName.name;
            if (typeName && imports.has(typeName)) {
              usedSymbols.add(typeName);
            }
          }
        }

        // Check for inheritance
        if (node.type === 'InheritanceSpecifier') {
          const baseNode = (node as any).baseName;
          if (baseNode && baseNode.namePath) {
            const baseName = baseNode.namePath.split('.')[0];
            if (baseName && imports.has(baseName)) {
              usedSymbols.add(baseName);
            }
          }
        }

        return undefined;
      },
    });

    // Report unused imports
    const reportedImports = new Set<any>();

    for (const [symbol, importNode] of imports) {
      if (!usedSymbols.has(symbol) && !reportedImports.has(importNode)) {
        reportedImports.add(importNode);

        if (importNode.loc) {
          context.report({
            ruleId: this.metadata.id,
            severity: this.metadata.severity,
            category: this.metadata.category,
            message: `Import '${symbol}' is unused and can be removed`,
            location: {
              start: {
                line: importNode.loc.start.line,
                column: importNode.loc.start.column,
              },
              end: {
                line: importNode.loc.end.line,
                column: importNode.loc.end.column,
              },
            },
          });
        }
      }
    }
  }

  /**
   * Extract symbol names from an import directive
   */
  private extractImportedSymbols(importNode: any): string[] {
    const symbols: string[] = [];

    // Handle different import patterns
    if (importNode.symbolAliases && importNode.symbolAliases.length > 0) {
      // Named imports: import { Token, Ownable } from "./file.sol";
      for (const alias of importNode.symbolAliases) {
        const symbolName = alias[1] || alias[0]; // Use alias if present, otherwise original name
        if (symbolName) {
          symbols.push(symbolName);
        }
      }
    } else if (importNode.unitAlias) {
      // Aliased import: import * as Lib from "./file.sol";
      symbols.push(importNode.unitAlias);
    } else if (importNode.path) {
      // File-level import: import "./file.sol";
      // Extract potential contract/interface name from the path
      const match = importNode.path.match(/([^/]+)\.sol$/);
      if (match && match[1]) {
        symbols.push(match[1]);
      }
    }

    return symbols;
  }
}
