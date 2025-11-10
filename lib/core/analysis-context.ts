/**
 * Analysis Context
 *
 * Provides context and utilities for rule analysis
 */

import type { ASTNode } from '@parser/types';
import type { ResolvedConfig } from '@config/types';
import type { Issue, SourceRange } from './types';

/**
 * Analysis context provided to rules during analysis
 */
export class AnalysisContext {
  private issues: Issue[] = [];
  private lines: string[];

  /**
   * Create analysis context
   */
  constructor(
    public readonly filePath: string,
    public readonly sourceCode: string,
    public readonly ast: ASTNode,
    public readonly config: ResolvedConfig,
  ) {
    // Pre-split source into lines for efficient line access
    this.lines = sourceCode.split('\n');
  }

  /**
   * Report an issue found during analysis
   */
  report(issue: Omit<Issue, 'filePath'>): void {
    this.issues.push({
      ...issue,
      filePath: this.filePath,
    });
  }

  /**
   * Get source text for a specific range
   */
  getSourceText(range: SourceRange): string {
    const { start, end } = range;

    // Handle single line range
    if (start.line === end.line) {
      const line = this.lines[start.line - 1];
      if (!line) {
        return '';
      }
      return line.substring(start.column, end.column);
    }

    // Handle multi-line range
    const result: string[] = [];

    for (let i = start.line; i <= end.line; i++) {
      const line = this.lines[i - 1];
      if (!line) {
        continue;
      }

      if (i === start.line) {
        // First line: from start column to end
        result.push(line.substring(start.column));
      } else if (i === end.line) {
        // Last line: from beginning to end column
        result.push(line.substring(0, end.column));
      } else {
        // Middle lines: entire line
        result.push(line);
      }
    }

    return result.join('\n');
  }

  /**
   * Get text for a specific line (1-indexed)
   */
  getLineText(line: number): string {
    const lineText = this.lines[line - 1];
    return lineText ?? '';
  }

  /**
   * Get all issues reported so far
   */
  getIssues(): Issue[] {
    return this.issues;
  }
}
