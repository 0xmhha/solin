/**
 * Core Types
 *
 * Type definitions for the analysis engine
 */

import type { ASTNode } from '@parser/types';
import type { ResolvedConfig } from '@config/types';

/**
 * Severity levels for issues
 */
export enum Severity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Issue category
 */
export enum Category {
  SECURITY = 'security',
  LINT = 'lint',
  GAS_OPTIMIZATION = 'gas-optimization',
  BEST_PRACTICES = 'best-practices',
  CUSTOM = 'custom',
}

/**
 * Location in source code
 */
export interface Location {
  /**
   * Line number (1-indexed)
   */
  line: number;

  /**
   * Column number (0-indexed)
   */
  column: number;
}

/**
 * Range in source code
 */
export interface SourceRange {
  /**
   * Start location
   */
  start: Location;

  /**
   * End location
   */
  end: Location;
}

/**
 * Issue reported by a rule
 */
export interface Issue {
  /**
   * Rule ID that generated this issue
   */
  ruleId: string;

  /**
   * Issue severity
   */
  severity: Severity;

  /**
   * Issue category
   */
  category: Category;

  /**
   * Human-readable message
   */
  message: string;

  /**
   * File path where issue was found
   */
  filePath: string;

  /**
   * Location in source code
   */
  location: SourceRange;

  /**
   * Optional fix for the issue
   */
  fix?: Fix;

  /**
   * Additional metadata
   */
  metadata?: {
    /**
     * Link to documentation
     */
    documentationUrl?: string;

    /**
     * Code snippet showing the issue
     */
    snippet?: string;

    /**
     * Suggestion for fixing the issue
     */
    suggestion?: string;
  };
}

/**
 * Automatic fix for an issue
 */
export interface Fix {
  /**
   * Description of the fix
   */
  description: string;

  /**
   * Range to replace
   */
  range: SourceRange;

  /**
   * Replacement text
   */
  text: string;
}

/**
 * Analysis context provided to rules
 */
export interface AnalysisContext {
  /**
   * File path being analyzed
   */
  filePath: string;

  /**
   * Source code
   */
  sourceCode: string;

  /**
   * Parsed AST
   */
  ast: ASTNode;

  /**
   * Configuration
   */
  config: ResolvedConfig;

  /**
   * Report an issue
   */
  report(issue: Omit<Issue, 'filePath'>): void;

  /**
   * Get source text for a range
   */
  getSourceText(range: SourceRange): string;

  /**
   * Get line text
   */
  getLineText(line: number): string;
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  /**
   * Files or glob patterns to analyze
   */
  files: string[];

  /**
   * Configuration
   */
  config?: ResolvedConfig;

  /**
   * Working directory
   */
  cwd?: string;

  /**
   * Whether to fix issues automatically
   */
  fix?: boolean;

  /**
   * Maximum number of parallel analyses
   */
  maxConcurrency?: number;

  /**
   * Timeout for single file analysis (ms)
   */
  timeout?: number;

  /**
   * Progress callback
   */
  onProgress?: (current: number, total: number) => void;
}

/**
 * Analysis result for a single file
 */
export interface FileAnalysisResult {
  /**
   * File path
   */
  filePath: string;

  /**
   * Issues found
   */
  issues: Issue[];

  /**
   * Parse errors (if any)
   */
  parseErrors?: Array<{
    message: string;
    line: number;
    column: number;
  }>;

  /**
   * Analysis duration (ms)
   */
  duration: number;
}

/**
 * Overall analysis result
 */
export interface AnalysisResult {
  /**
   * Results for each file
   */
  files: FileAnalysisResult[];

  /**
   * Total issues found
   */
  totalIssues: number;

  /**
   * Issues by severity
   */
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };

  /**
   * Total analysis duration (ms)
   */
  duration: number;

  /**
   * Whether any files had parse errors
   */
  hasParseErrors: boolean;
}

/**
 * Analysis engine interface
 */
export interface IEngine {
  /**
   * Analyze files
   */
  analyze(options: AnalysisOptions): Promise<AnalysisResult>;

  /**
   * Analyze a single file
   */
  analyzeFile(filePath: string, config: ResolvedConfig): Promise<FileAnalysisResult>;
}

/**
 * Rule interface
 */
export interface IRule {
  /**
   * Rule metadata
   */
  readonly metadata: RuleMetadata;

  /**
   * Analyze and report issues
   */
  analyze(context: AnalysisContext): void | Promise<void>;
}

/**
 * Rule metadata
 */
export interface RuleMetadata {
  /**
   * Unique rule identifier
   */
  id: string;

  /**
   * Rule category
   */
  category: Category;

  /**
   * Default severity
   */
  severity: Severity;

  /**
   * Short title
   */
  title: string;

  /**
   * Detailed description
   */
  description: string;

  /**
   * Recommendation for fixing
   */
  recommendation: string;

  /**
   * Link to documentation
   */
  documentationUrl?: string;

  /**
   * Whether rule can auto-fix issues
   */
  fixable?: boolean;
}
