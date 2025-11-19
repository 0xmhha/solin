/**
 * Analyze Command
 *
 * Main analysis command implementation
 */

import * as fs from 'fs/promises';
import { ConfigLoader } from '@config/config-loader';
import { SolidityParser } from '@parser/solidity-parser';
import { RuleRegistry } from '@core/rule-registry';
import { AnalysisEngine } from '@core/analysis-engine';
import { CacheManager } from '@core/cache-manager';
import { FileWatcher, FileChangeEvent } from '@core/file-watcher';
import { FixApplicator } from '../../fixer/fix-applicator';
import { StylishFormatter } from '@formatters/stylish-formatter';
import { JSONFormatter } from '@formatters/json-formatter';
import { SarifFormatter } from '@formatters/sarif-formatter';
import { HtmlFormatter } from '@formatters/html-formatter';
import type { IFormatter } from '@formatters/types';
import { resolveFiles } from '../file-resolver';
import type { ParsedArguments } from '../types';
import type { ResolvedConfig, ConfigLoadOptions } from '@config/types';
import type { AnalysisOptions, AnalysisResult, Issue } from '@core/types';
import * as Rules from '@rules/index';

/**
 * Analyze command - runs analysis on Solidity files
 */
export class AnalyzeCommand {
  /**
   * Execute analyze command
   *
   * @param args - Parsed command-line arguments
   * @returns Exit code (0 = success, 1 = errors found, 2 = invalid usage)
   */
  async execute(args: ParsedArguments): Promise<number> {
    try {
      // Resolve files from patterns
      const files = await this.resolveFilesFromPatterns(args.files, args.ignorePath);

      if (files.length === 0) {
        console.error('Error: No Solidity files found');
        return 2;
      }

      // Load configuration
      const config = await this.loadConfiguration(args.config);

      // Create components
      const parser = new SolidityParser();
      const registry = new RuleRegistry();

      // Initialize cache manager if caching is enabled
      let cacheManager: CacheManager | undefined;
      if (args.cache) {
        const cacheLocation = args.cacheLocation || '.solin-cache';
        cacheManager = new CacheManager({
          maxEntries: 1000,
          ttl: 3600000, // 1 hour
          cacheDirectory: cacheLocation,
        });
        // Load existing cache
        await cacheManager.load();
      }

      const engine = new AnalysisEngine(registry, parser, cacheManager);

      // Register all rules
      this.registerRules(registry);

      // Check for watch mode
      if (args.watch) {
        return this.runWatchMode(args, files, engine, config);
      }

      // Run analysis
      if (!args.quiet) {
        console.log(`Analyzing ${files.length} file${files.length === 1 ? '' : 's'}...`);
      }

      const analyzeOptions: AnalysisOptions = {
        files,
        config,
      };

      if (args.parallel) {
        analyzeOptions.maxConcurrency = args.parallel;
      }

      if (!args.quiet) {
        analyzeOptions.onProgress = (current: number, total: number): void => {
          if (current % 10 === 0 || current === total) {
            process.stdout.write(`\rProgress: ${current}/${total} files`);
          }
        };
      }

      const result = await engine.analyze(analyzeOptions);

      if (!args.quiet && files.length > 1) {
        console.log(''); // New line after progress
      }

      // Apply fixes if requested
      if (args.fix || args.dryRun) {
        const fixApplicator = new FixApplicator({ write: !args.dryRun });
        let totalApplied = 0;
        let totalSkipped = 0;

        // Group issues by file
        for (const fileResult of result.files) {
          const fixableIssues = fileResult.issues.filter((issue: Issue) => issue.fix);

          if (fixableIssues.length > 0) {
            if (args.dryRun) {
              // Show what would be fixed
              const source = await this.readFile(fileResult.filePath);
              const preview = fixApplicator.getDiff(source, fixableIssues);
              if (!args.quiet && preview) {
                console.log(`\nFixes for ${fileResult.filePath}:\n`);
                console.log(preview);
              }
            } else {
              // Actually apply fixes
              const fixResult = await fixApplicator.applyToFile(
                fileResult.filePath,
                fixableIssues
              );
              totalApplied += fixResult.fixesApplied;
              totalSkipped += fixResult.fixesSkipped;
            }
          }
        }

        if (!args.dryRun && !args.quiet) {
          if (totalApplied > 0) {
            console.log(`\nFixed ${totalApplied} issue(s)`);
          }
          if (totalSkipped > 0) {
            console.log(`Skipped ${totalSkipped} conflicting fix(es)`);
          }
          if (totalApplied === 0 && totalSkipped === 0) {
            console.log('\nNo auto-fixable issues found');
          }
        }
      }

      // Save cache if enabled
      if (cacheManager) {
        await cacheManager.save();
        if (!args.quiet) {
          const stats = cacheManager.getStats();
          console.log(`\nCache: ${stats.hits} hits, ${stats.misses} misses`);
        }
      }

      // Format and output results
      const formatter = this.createFormatter(args.format);
      const output = formatter.format(result);
      console.log(output);

      // Determine exit code
      return this.getExitCode(result, args);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      return 2;
    }
  }

  /**
   * Run in watch mode
   */
  private async runWatchMode(
    args: ParsedArguments,
    initialFiles: string[],
    engine: AnalysisEngine,
    config: ResolvedConfig
  ): Promise<number> {
    const formatter = this.createFormatter(args.format);

    // Initial analysis
    console.log(`\nWatching ${initialFiles.length} file${initialFiles.length === 1 ? '' : 's'} for changes...\n`);

    const runAnalysis = async (files: string[]) => {
      const result = await engine.analyze({
        files,
        config,
      });

      // Clear console for fresh output (optional)
      if (!args.quiet) {
        console.log('\n' + '─'.repeat(60) + '\n');
      }

      const output = formatter.format(result);
      console.log(output);

      if (!args.quiet) {
        const time = new Date().toLocaleTimeString();
        console.log(`\n[${time}] Analysis complete. Waiting for changes...`);
      }
    };

    // Run initial analysis
    await runAnalysis(initialFiles);

    // Create file watcher
    const watcher = new FileWatcher({
      debounceDelay: 300,
      ignored: ['node_modules', '.git', 'dist', 'build'],
    });

    // Handle file changes
    watcher.on('change', (event: FileChangeEvent) => {
      if (!args.quiet) {
        const time = new Date().toLocaleTimeString();
        console.log(`\n[${time}] File ${event.type}: ${event.filePath}`);
      }

      // Re-analyze just the changed file for speed
      const filesToAnalyze = event.type === 'unlink'
        ? initialFiles.filter(f => f !== event.filePath)
        : [event.filePath];

      if (filesToAnalyze.length > 0) {
        void runAnalysis(filesToAnalyze);
      }
    });

    watcher.on('error', (error: Error) => {
      console.error('Watch error:', error.message);
    });

    watcher.on('ready', (stats: { filesWatched: number }) => {
      if (!args.quiet) {
        console.log(`Watching ${stats.filesWatched} files...`);
      }
    });

    // Start watching
    const patterns = args.files.length > 0 ? args.files : [process.cwd()];
    await watcher.watch(patterns);

    // Keep the process running
    return new Promise<number>(() => {
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\nStopping watch mode...');
        void watcher.close().then(() => process.exit(0));
      });

      process.on('SIGTERM', () => {
        void watcher.close().then(() => process.exit(0));
      });
    });
  }

  /**
   * Resolve files from patterns
   */
  private async resolveFilesFromPatterns(
    patterns: string[],
    ignorePath?: string
  ): Promise<string[]> {
    if (patterns.length === 0) {
      // Default to current directory
      patterns = [process.cwd()];
    }

    const options: { cwd: string; ignorePath?: string } = {
      cwd: process.cwd(),
    };

    if (ignorePath) {
      options.ignorePath = ignorePath;
    }

    return resolveFiles(patterns, options);
  }

  /**
   * Load configuration
   */
  private async loadConfiguration(configPath?: string): Promise<ResolvedConfig> {
    const loader = new ConfigLoader();

    try {
      const loadOptions: ConfigLoadOptions = {
        cwd: process.cwd(),
      };

      if (configPath) {
        loadOptions.configPath = configPath;
      }

      const config = await loader.load(loadOptions);

      return config;
    } catch (error) {
      // If no config found, use default
      if (configPath) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load config from ${configPath}: ${errorMessage}`);
      }

      // Return default config
      return {
        basePath: process.cwd(),
        rules: {},
      };
    }
  }

  /**
   * Register all available rules
   */
  private registerRules(registry: RuleRegistry): void {
    // Register all rules from the rules index
    const ruleClasses = [
      // Security rules
      Rules.TxOriginRule,
      Rules.UncheckedCallsRule,
      Rules.TimestampDependenceRule,
      Rules.UninitializedStateRule,
      Rules.ArbitrarySendRule,
      Rules.DelegatecallInLoopRule,
      Rules.ShadowingVariablesRule,
      Rules.SelfdestructRule,
      Rules.ControlledDelegatecallRule,
      Rules.WeakPrngRule,
      Rules.UninitializedStorageRule,
      Rules.LockedEtherRule,
      Rules.ReentrancyRule,
      Rules.DivideBeforeMultiplyRule,
      Rules.MsgValueLoopRule,
      Rules.FloatingPragmaRule,
      Rules.OutdatedCompilerRule,
      Rules.AssertStateChangeRule,
      Rules.MissingZeroCheckRule,
      Rules.MissingEventsRule,
      Rules.UnsafeCastRule,
      Rules.ShadowingBuiltinRule,
      Rules.UncheckedSendRule,
      Rules.UncheckedLowlevelRule,
      Rules.CostlyLoopRule,
      Rules.DeprecatedFunctionsRule,
      Rules.AvoidSha3,
      Rules.AvoidThrow,
      Rules.IncorrectEqualityRule,
      Rules.NoInlineAssembly,
      Rules.ReturnBombRule,
      Rules.UnprotectedEtherWithdrawalRule,
      Rules.VoidConstructorRule,
      // Lint rules
      Rules.NoEmptyBlocksRule,
      Rules.NamingConventionRule,
      Rules.VisibilityModifiersRule,
      Rules.StateMutabilityRule,
      Rules.UnusedVariablesRule,
      Rules.FunctionComplexityRule,
      Rules.MagicNumbersRule,
      Rules.RequireRevertReasonRule,
      Rules.CacheArrayLengthRule,
      Rules.ConstantImmutableRule,
      Rules.UnusedStateVariablesRule,
      Rules.LoopInvariantCodeRule,
      Rules.BooleanEqualityRule,
      Rules.BraceStyleRule,
      Rules.ContractNameCamelCaseRule,
      Rules.FunctionMaxLinesRule,
      Rules.FunctionNameMixedcaseRule,
      Rules.GasCustomErrors,
      Rules.GasIndexedEvents,
      Rules.GasSmallStrings,
      Rules.IndentRule,
      Rules.MaxLineLengthRule,
      Rules.NoConsoleRule,
      Rules.NoTrailingWhitespaceRule,
      Rules.QuotesRule,
      Rules.SpaceAfterCommaRule,
      Rules.VarNameMixedcaseRule,
    ];

    // Register each rule
    for (const RuleClass of ruleClasses) {
      if (RuleClass) {
        try {
          registry.register(new RuleClass());
        } catch (error) {
          // Skip rules that fail to instantiate
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.debug(`Failed to register rule: ${errorMessage}`);
        }
      }
    }
  }

  /**
   * Create formatter based on format type
   */
  private createFormatter(format: string = 'stylish'): IFormatter {
    switch (format.toLowerCase()) {
      case 'json':
        return new JSONFormatter({ pretty: true });
      case 'json-compact':
        return new JSONFormatter({ pretty: false });
      case 'sarif':
        return new SarifFormatter({ pretty: true });
      case 'sarif-compact':
        return new SarifFormatter({ pretty: false });
      case 'html':
        return new HtmlFormatter({ interactive: true });
      case 'stylish':
      default:
        return new StylishFormatter();
    }
  }

  /**
   * Determine exit code based on results
   */
  private getExitCode(result: AnalysisResult, args: ParsedArguments): number {
    const { summary } = result;

    // Check for parse errors
    if (result.hasParseErrors) {
      return 2;
    }

    // Check for errors
    if (summary.errors > 0) {
      return 1;
    }

    // Check max warnings
    if (args.maxWarnings !== undefined && summary.warnings > args.maxWarnings) {
      console.error(
        `Error: ${summary.warnings} warnings exceeded maximum of ${args.maxWarnings}`,
      );
      return 1;
    }

    return 0;
  }

  /**
   * Read file contents
   */
  private async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }
}
