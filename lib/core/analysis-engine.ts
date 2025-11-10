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

/**
 * Main analysis engine
 */
export class AnalysisEngine implements IEngine {
  constructor(
    private readonly registry: RuleRegistry,
    private readonly parser: SolidityParser,
  ) {}

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
    const { files, config, onProgress } = options;

    // Use provided config or create default
    const analysisConfig: ResolvedConfig = config ?? {
      basePath: process.cwd(),
      rules: {},
    };

    // Analyze each file
    const fileResults: FileAnalysisResult[] = [];
    let hasParseErrors = false;

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
