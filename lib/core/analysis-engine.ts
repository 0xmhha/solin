/**
 * Analysis Engine
 *
 * Core engine for analyzing Solidity files
 */

import * as fs from 'fs/promises';
import type {
  IEngine,
  AnalysisOptions,
  AnalysisResult,
  FileAnalysisResult,
} from './types';
import type { ResolvedConfig } from '@config/types';
import type { RuleRegistry } from './rule-registry';
import type { SolidityParser } from '@parser/solidity-parser';
import { AnalysisContext } from './analysis-context';
import { Severity } from './types';
import type { CacheManager } from './cache-manager';
import { WorkerPool } from './worker-pool';

/**
 * Main analysis engine
 */
export class AnalysisEngine implements IEngine {
  private cacheManager: CacheManager | undefined;

  constructor(
    private readonly registry: RuleRegistry,
    private readonly parser: SolidityParser,
    cacheManager?: CacheManager,
  ) {
    this.cacheManager = cacheManager;
  }

  /**
   * Set cache manager
   */
  setCache(cacheManager: CacheManager): void {
    this.cacheManager = cacheManager;
  }

  /**
   * Get cache manager
   */
  getCache(): CacheManager | undefined {
    return this.cacheManager;
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(
    filePath: string,
    config: ResolvedConfig,
  ): Promise<FileAnalysisResult> {
    const startTime = Date.now();

    try {
      // Read file
      const source = await fs.readFile(filePath, 'utf-8');

      // Check cache
      if (this.cacheManager) {
        const configHash = this.cacheManager.hashConfig(config);
        const cachedResult = this.cacheManager.get(filePath, source, configHash);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // Parse file
      let parseResult;
      try {
        parseResult = await this.parser.parse(source, {
          loc: true,
          tolerant: true, // Continue parsing even with errors
        });
      } catch (parseError) {
        // If parsing fails completely, return result with parse error
        return {
          filePath,
          issues: [],
          parseErrors: [
            {
              message: parseError instanceof Error ? parseError.message : 'Parse error',
              line: 0,
              column: 0,
            },
          ],
          duration: Date.now() - startTime,
        };
      }

      // Create analysis context
      const context = new AnalysisContext(filePath, source, parseResult.ast, config);

      // Execute all registered rules
      const rules = this.registry.getAllRules();
      for (const rule of rules) {
        try {
          await rule.analyze(context);
        } catch (error) {
          // Log rule execution error but continue with other rules
          console.error(`Error executing rule ${rule.metadata.id}:`, error);
        }
      }

      // Get issues
      const issues = context.getIssues();

      // Build result
      const result: FileAnalysisResult = {
        filePath,
        issues,
        duration: Date.now() - startTime,
      };

      // Add parse errors if any
      if (parseResult.errors.length > 0) {
        result.parseErrors = parseResult.errors;
      }

      // Cache result (only if no parse errors)
      if (this.cacheManager && !result.parseErrors) {
        const configHash = this.cacheManager.hashConfig(config);
        this.cacheManager.set(filePath, source, configHash, result);
      }

      return result;
    } catch (error) {
      // Re-throw file read errors
      throw error;
    }
  }

  /**
   * Analyze multiple files
   */
  async analyze(options: AnalysisOptions): Promise<AnalysisResult> {
    const startTime = Date.now();
    const { files, config, onProgress, maxConcurrency } = options;

    // Use provided config or create default
    const analysisConfig: ResolvedConfig = config ?? {
      basePath: process.cwd(),
      rules: {},
    };

    // Analyze each file (using parallel execution if multiple files)
    const fileResults: FileAnalysisResult[] = [];
    let hasParseErrors = false;

    if (files.length > 1 && (maxConcurrency === undefined || maxConcurrency > 1)) {
      // Use worker pool for parallel analysis
      const pool = new WorkerPool<string, FileAnalysisResult>({
        maxConcurrency: maxConcurrency || 4,
        taskTimeout: options.timeout || 30000,
      });

      // Track progress
      let completed = 0;
      if (onProgress) {
        pool.setProgressCallback(() => {
          completed++;
          onProgress(completed, files.length);
        });
      }

      // Add tasks for each file
      for (const file of files) {
        pool.addTask({
          id: file,
          data: file,
          execute: async (filePath) => {
            try {
              return await this.analyzeFile(filePath, analysisConfig);
            } catch (error) {
              return {
                filePath,
                issues: [],
                parseErrors: [
                  {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    line: 0,
                    column: 0,
                  },
                ],
                duration: 0,
              };
            }
          },
        });
      }

      // Execute all tasks
      const results = await pool.execute();

      // Collect results in original order
      for (const file of files) {
        const taskResult = results.get(file);
        if (taskResult?.success && taskResult.result) {
          fileResults.push(taskResult.result);
          if (taskResult.result.parseErrors && taskResult.result.parseErrors.length > 0) {
            hasParseErrors = true;
          }
        } else if (taskResult?.error) {
          fileResults.push({
            filePath: file,
            issues: [],
            parseErrors: [
              {
                message: taskResult.error.message,
                line: 0,
                column: 0,
              },
            ],
            duration: taskResult.duration,
          });
          hasParseErrors = true;
        }
      }
    } else {
      // Sequential analysis for single file or when maxConcurrency is 1
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          const result = await this.analyzeFile(file!, analysisConfig);
          fileResults.push(result);

          if (result.parseErrors && result.parseErrors.length > 0) {
            hasParseErrors = true;
          }

          // Call progress callback
          if (onProgress) {
            onProgress(i + 1, files.length);
          }
        } catch (error) {
          // Log error and continue with next file
          console.error(`Error analyzing file ${file}:`, error);

          // Add error result
          fileResults.push({
            filePath: file!,
            issues: [],
            parseErrors: [
              {
                message: error instanceof Error ? error.message : 'Unknown error',
                line: 0,
                column: 0,
              },
            ],
            duration: 0,
          });

          hasParseErrors = true;
        }
      }
    }

    // Calculate summary
    const summary = this.calculateSummary(fileResults);
    const totalIssues = fileResults.reduce((sum, r) => sum + r.issues.length, 0);

    return {
      files: fileResults,
      totalIssues,
      summary,
      duration: Date.now() - startTime,
      hasParseErrors,
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(results: FileAnalysisResult[]): {
    errors: number;
    warnings: number;
    info: number;
  } {
    const summary = {
      errors: 0,
      warnings: 0,
      info: 0,
    };

    for (const result of results) {
      for (const issue of result.issues) {
        switch (issue.severity) {
          case Severity.ERROR:
            summary.errors++;
            break;
          case Severity.WARNING:
            summary.warnings++;
            break;
          case Severity.INFO:
            summary.info++;
            break;
        }
      }
    }

    return summary;
  }
}
