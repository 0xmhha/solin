/**
 * Compiler Version Rule
 *
 * Checks and enforces appropriate Solidity compiler version constraints.
 * Warns about overly restrictive, too permissive, or outdated version specifications.
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that validates Solidity compiler version pragma directives.
 * Ensures appropriate version constraints are used.
 */
export class CompilerVersionRule extends AbstractRule {
  private walker: ASTWalker;

  // Minimum recommended version (0.7.0 is considered acceptable, < 0.7.0 is outdated)
  private readonly MIN_RECOMMENDED_MAJOR = 0;
  private readonly MIN_RECOMMENDED_MINOR = 7;

  constructor() {
    super({
      id: 'lint/compiler-version',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Compiler Version Constraints',
      description:
        'Validates Solidity compiler version pragma directives. ' +
        'Warns about exact versions (too restrictive), wildcards (too permissive), ' +
        'and outdated compiler versions that may have known vulnerabilities.',
      recommendation:
        'Use caret (^) or range constraints for compiler versions (e.g., ^0.8.0 or >=0.8.0 <0.9.0). ' +
        'Avoid exact versions or wildcards. Use modern compiler versions (0.7.0+) to benefit from ' +
        'security fixes and improvements.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    let foundSolidityPragma = false;

    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'PragmaDirective') {
          const pragmaNode = node as any;

          // Check if it's a solidity version pragma
          if (pragmaNode.name === 'solidity') {
            foundSolidityPragma = true;
            this.checkVersionConstraint(node, context);
          }
        }

        return undefined;
      },
    });

    // Warn if no solidity pragma found
    if (!foundSolidityPragma) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'Missing pragma solidity directive. Specify the compiler version to ensure compatibility.',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 1 },
        },
        metadata: {
          suggestion: 'Add a pragma solidity directive at the top of the file, e.g., pragma solidity ^0.8.0;',
        },
      });
    }
  }

  /**
   * Check version constraint for issues
   */
  private checkVersionConstraint(node: ASTNode, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    const pragmaNode = node as any;
    const value = pragmaNode.value || '';

    // Check for wildcard (too permissive)
    if (value === '*' || value.includes('*')) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'Wildcard compiler version is not recommended. Specify a specific version range.',
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
        metadata: {
          suggestion: 'Use a caret or range constraint, e.g., ^0.8.0 or >=0.8.0 <0.9.0',
        },
      });
      return;
    }

    // Check for exact version (too restrictive)
    // Exact version: no operators like ^, >, <, =
    const hasOperator = /[\^><~=]/.test(value);
    if (!hasOperator && value.match(/^\d+\.\d+\.\d+$/)) {
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: 'Exact compiler version is too restrictive. Use caret (^) or range constraints for better compatibility.',
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
        metadata: {
          suggestion: `Consider using ^${value} instead of ${value}`,
        },
      });
      return;
    }

    // Check for outdated versions
    const versionMatch = value.match(/(\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1]!, 10);
      const minor = parseInt(versionMatch[2]!, 10);

      // Check if version is too old (< 0.7.0)
      if (
        major < this.MIN_RECOMMENDED_MAJOR ||
        (major === this.MIN_RECOMMENDED_MAJOR && minor < this.MIN_RECOMMENDED_MINOR)
      ) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Compiler version ${major}.${minor}.x is outdated. Consider upgrading to 0.7.0 or later for security improvements and bug fixes.`,
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
          metadata: {
            suggestion: 'Use a modern compiler version like ^0.8.0',
          },
        });
      }
    }
  }
}
