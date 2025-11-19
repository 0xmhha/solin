/**
 * Fix Applicator
 *
 * Applies automatic fixes to source code files
 */

import * as fs from 'fs';
import type { Issue, Fix, SourceRange } from '@core/types';

/**
 * Result of applying a single fix
 */
export interface FixResult {
  /**
   * Whether the fix was applied successfully
   */
  applied: boolean;

  /**
   * Rule ID that generated the fix
   */
  ruleId: string;

  /**
   * Fix description
   */
  description: string;

  /**
   * Error message if fix failed
   */
  error?: string;
}

/**
 * Result of applying fixes to a file
 */
export interface FileFixResult {
  /**
   * File path
   */
  filePath: string;

  /**
   * Original source code
   */
  originalSource: string;

  /**
   * Fixed source code
   */
  fixedSource: string;

  /**
   * Number of fixes applied
   */
  fixesApplied: number;

  /**
   * Number of fixes skipped (due to conflicts)
   */
  fixesSkipped: number;

  /**
   * Individual fix results
   */
  results: FixResult[];

  /**
   * Whether the file was modified
   */
  modified: boolean;
}

/**
 * Options for applying fixes
 */
export interface FixApplicatorOptions {
  /**
   * Whether to actually write changes to disk
   * @default true
   */
  write?: boolean;

  /**
   * Whether to create backups before modifying files
   * @default false
   */
  backup?: boolean;

  /**
   * Backup file extension
   * @default '.bak'
   */
  backupExtension?: string;
}

/**
 * Internal representation of a fix with computed offsets
 */
interface ComputedFix {
  issue: Issue;
  fix: Fix;
  startOffset: number;
  endOffset: number;
}

/**
 * Fix Applicator
 *
 * Applies automatic fixes to source code, handling conflicts
 * and ensuring fixes don't overlap.
 */
export class FixApplicator {
  private readonly options: Required<FixApplicatorOptions>;

  constructor(options: FixApplicatorOptions = {}) {
    this.options = {
      write: options.write !== false,
      backup: options.backup || false,
      backupExtension: options.backupExtension || '.bak',
    };
  }

  /**
   * Apply fixes to a single file
   */
  async applyToFile(
    filePath: string,
    issues: Issue[],
  ): Promise<FileFixResult> {
    // Read file content
    const originalSource = await fs.promises.readFile(filePath, 'utf-8');

    // Apply fixes
    const result = this.applyToSource(originalSource, issues);

    // Write back if modified and write option is enabled
    if (result.modified && this.options.write) {
      // Create backup if enabled
      if (this.options.backup) {
        await fs.promises.writeFile(
          filePath + this.options.backupExtension,
          originalSource,
          'utf-8',
        );
      }

      // Write fixed source
      await fs.promises.writeFile(filePath, result.fixedSource, 'utf-8');
    }

    return {
      ...result,
      filePath,
    };
  }

  /**
   * Apply fixes to source code string
   */
  applyToSource(
    source: string,
    issues: Issue[],
  ): Omit<FileFixResult, 'filePath'> {
    const results: FixResult[] = [];
    let fixesApplied = 0;
    let fixesSkipped = 0;

    // Filter issues that have fixes
    const fixableIssues = issues.filter((issue) => issue.fix);

    if (fixableIssues.length === 0) {
      return {
        originalSource: source,
        fixedSource: source,
        fixesApplied: 0,
        fixesSkipped: 0,
        results: [],
        modified: false,
      };
    }

    // Compute offsets for each fix
    const computedFixes = this.computeFixOffsets(source, fixableIssues);

    // Sort fixes by start offset in descending order
    // This allows us to apply fixes from end to start without affecting offsets
    computedFixes.sort((a, b) => b.startOffset - a.startOffset);

    // Filter out overlapping fixes
    const { validFixes, skippedFixes } = this.filterOverlappingFixes(computedFixes);

    // Record skipped fixes
    for (const skipped of skippedFixes) {
      results.push({
        applied: false,
        ruleId: skipped.issue.ruleId,
        description: skipped.fix.description,
        error: 'Skipped due to overlapping fix',
      });
      fixesSkipped++;
    }

    // Apply valid fixes
    let fixedSource = source;
    for (const computed of validFixes) {
      try {
        fixedSource =
          fixedSource.substring(0, computed.startOffset) +
          computed.fix.text +
          fixedSource.substring(computed.endOffset);

        results.push({
          applied: true,
          ruleId: computed.issue.ruleId,
          description: computed.fix.description,
        });
        fixesApplied++;
      } catch (error) {
        results.push({
          applied: false,
          ruleId: computed.issue.ruleId,
          description: computed.fix.description,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        fixesSkipped++;
      }
    }

    return {
      originalSource: source,
      fixedSource,
      fixesApplied,
      fixesSkipped,
      results,
      modified: fixesApplied > 0,
    };
  }

  /**
   * Preview fixes without applying them
   */
  preview(
    source: string,
    issues: Issue[],
  ): Array<{
    ruleId: string;
    description: string;
    original: string;
    replacement: string;
    location: SourceRange;
  }> {
    const fixableIssues = issues.filter((issue) => issue.fix);
    const computedFixes = this.computeFixOffsets(source, fixableIssues);
    const { validFixes } = this.filterOverlappingFixes(computedFixes);

    return validFixes.map((computed) => ({
      ruleId: computed.issue.ruleId,
      description: computed.fix.description,
      original: source.substring(computed.startOffset, computed.endOffset),
      replacement: computed.fix.text,
      location: computed.fix.range,
    }));
  }

  /**
   * Get diff-style output of fixes
   */
  getDiff(source: string, issues: Issue[]): string {
    const preview = this.preview(source, issues);
    const lines: string[] = [];

    for (const fix of preview) {
      lines.push(`--- ${fix.ruleId}`);
      lines.push(`+++ ${fix.description}`);
      lines.push(
        `@@ -${fix.location.start.line},${fix.location.start.column} ` +
          `+${fix.location.end.line},${fix.location.end.column} @@`,
      );
      lines.push(`-${fix.original}`);
      lines.push(`+${fix.replacement}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Compute character offsets for fixes based on line/column positions
   */
  private computeFixOffsets(
    source: string,
    issues: Issue[],
  ): ComputedFix[] {
    const lineOffsets = this.getLineOffsets(source);
    const results: ComputedFix[] = [];

    for (const issue of issues) {
      if (!issue.fix) continue;

      const startOffset = this.locationToOffset(
        lineOffsets,
        issue.fix.range.start.line,
        issue.fix.range.start.column,
      );

      const endOffset = this.locationToOffset(
        lineOffsets,
        issue.fix.range.end.line,
        issue.fix.range.end.column,
      );

      if (startOffset !== -1 && endOffset !== -1 && startOffset <= endOffset) {
        results.push({
          issue,
          fix: issue.fix,
          startOffset,
          endOffset,
        });
      }
    }

    return results;
  }

  /**
   * Filter out overlapping fixes, keeping the first one
   */
  private filterOverlappingFixes(fixes: ComputedFix[]): {
    validFixes: ComputedFix[];
    skippedFixes: ComputedFix[];
  } {
    const validFixes: ComputedFix[] = [];
    const skippedFixes: ComputedFix[] = [];

    // Track occupied ranges
    const occupiedRanges: Array<{ start: number; end: number }> = [];

    for (const fix of fixes) {
      // Check if this fix overlaps with any occupied range
      const overlaps = occupiedRanges.some(
        (range) =>
          (fix.startOffset >= range.start && fix.startOffset < range.end) ||
          (fix.endOffset > range.start && fix.endOffset <= range.end) ||
          (fix.startOffset <= range.start && fix.endOffset >= range.end),
      );

      if (overlaps) {
        skippedFixes.push(fix);
      } else {
        validFixes.push(fix);
        occupiedRanges.push({
          start: fix.startOffset,
          end: fix.endOffset,
        });
      }
    }

    return { validFixes, skippedFixes };
  }

  /**
   * Get the character offset for each line start
   */
  private getLineOffsets(source: string): number[] {
    const offsets: number[] = [0]; // Line 1 starts at offset 0

    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\n') {
        offsets.push(i + 1);
      }
    }

    return offsets;
  }

  /**
   * Convert line/column to character offset
   */
  private locationToOffset(
    lineOffsets: number[],
    line: number,
    column: number,
  ): number {
    // Lines are 1-indexed
    if (line < 1 || line > lineOffsets.length) {
      return -1;
    }

    const lineOffset = lineOffsets[line - 1];
    if (lineOffset === undefined) {
      return -1;
    }

    return lineOffset + column;
  }
}

/**
 * Create a fix applicator with default options
 */
export function createFixApplicator(
  options?: FixApplicatorOptions,
): FixApplicator {
  return new FixApplicator(options);
}

/**
 * Apply fixes to multiple files
 */
export async function applyFixes(
  fileIssues: Map<string, Issue[]>,
  options?: FixApplicatorOptions,
): Promise<Map<string, FileFixResult>> {
  const applicator = new FixApplicator(options);
  const results = new Map<string, FileFixResult>();

  for (const [filePath, issues] of fileIssues) {
    const result = await applicator.applyToFile(filePath, issues);
    results.set(filePath, result);
  }

  return results;
}
