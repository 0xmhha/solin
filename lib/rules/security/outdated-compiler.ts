/**
 * Outdated Compiler Security Rule
 *
 * Detects usage of outdated Solidity compiler versions.
 * Older versions may contain known bugs and security vulnerabilities.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class OutdatedCompilerRule extends AbstractRule {
  // Minimum recommended version: 0.8.18
  private readonly MIN_MAJOR = 0;
  private readonly MIN_MINOR = 8;
  private readonly MIN_PATCH = 18;

  constructor() {
    super({
      id: 'security/outdated-compiler',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'Outdated Compiler Version',
      description:
        'Detects usage of outdated Solidity compiler versions. Older versions may contain known bugs, security vulnerabilities, and missing features. Using recent stable versions ensures access to bug fixes and security patches.',
      recommendation:
        'Update to Solidity 0.8.18 or higher. Check the Solidity release notes for breaking changes and test thoroughly after upgrading.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    // Check for PragmaDirective
    if (node.type === 'PragmaDirective') {
      this.checkPragmaDirective(node, context);
    }

    // Recursively traverse
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkPragmaDirective(node: any, context: AnalysisContext): void {
    // Only check solidity pragmas
    if (node.name !== 'solidity') return;

    const version = node.value;
    if (!version) return;

    // Extract version number(s) from pragma
    const versions = this.extractVersions(version);

    // Check if any extracted version is outdated
    for (const ver of versions) {
      if (this.isOutdated(ver)) {
        this.reportIssue(node, version, ver, context);
        break; // Report once per pragma
      }
    }
  }

  private extractVersions(versionString: string): string[] {
    // Remove operators and split by spaces
    const versions: string[] = [];

    // Match version patterns: x.y.z
    const versionRegex = /(\d+)\.(\d+)\.(\d+)/g;
    let match;

    while ((match = versionRegex.exec(versionString)) !== null) {
      versions.push(match[0]);
    }

    return versions;
  }

  private isOutdated(version: string): boolean {
    const parts = version.split('.');
    if (parts.length < 2) return false;

    const major = parseInt(parts[0] || '0', 10);
    const minor = parseInt(parts[1] || '0', 10);
    const patch = parts.length >= 3 ? parseInt(parts[2] || '0', 10) : 0;

    // Check against minimum version
    if (major < this.MIN_MAJOR) return true;
    if (major > this.MIN_MAJOR) return false;

    if (minor < this.MIN_MINOR) return true;
    if (minor > this.MIN_MINOR) return false;

    if (patch < this.MIN_PATCH) return true;

    return false;
  }

  private reportIssue(
    node: any,
    versionString: string,
    outdatedVersion: string,
    context: AnalysisContext
  ): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Outdated compiler version detected: "pragma solidity ${versionString}". Version ${outdatedVersion} is outdated and may contain known bugs or vulnerabilities. Update to 0.8.18 or higher for security patches and bug fixes.`,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
