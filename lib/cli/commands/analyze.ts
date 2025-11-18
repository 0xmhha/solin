/**
 * Analyze Command
 *
 * Main analysis command implementation
 */

import { ConfigLoader } from '@config/config-loader';
import { SolidityParser } from '@parser/solidity-parser';
import { RuleRegistry } from '@core/rule-registry';
import { AnalysisEngine } from '@core/analysis-engine';
import { StylishFormatter } from '@formatters/stylish-formatter';
import { JSONFormatter } from '@formatters/json-formatter';
import type { IFormatter } from '@formatters/types';
import { resolveFiles } from '../file-resolver';
import type { ParsedArguments } from '../types';
import type { ResolvedConfig } from '@config/types';

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
      const files = await this.resolveFilesFromPatterns(args.files);

      if (files.length === 0) {
        console.error('Error: No Solidity files found');
        return 2;
      }

      // Load configuration
      const config = await this.loadConfiguration(args.config);

      // Create components
      const parser = new SolidityParser();
      const registry = new RuleRegistry();
      const engine = new AnalysisEngine(registry, parser);

      // Register all rules
      await this.registerRules(registry);

      // Run analysis
      if (!args.quiet) {
        console.log(`Analyzing ${files.length} file${files.length === 1 ? '' : 's'}...`);
      }

      const analyzeOptions: any = {
        files,
        config,
      };

      if (!args.quiet) {
        analyzeOptions.onProgress = (current: number, total: number) => {
          if (current % 10 === 0 || current === total) {
            process.stdout.write(`\rProgress: ${current}/${total} files`);
          }
        };
      }

      const result = await engine.analyze(analyzeOptions);

      if (!args.quiet && files.length > 1) {
        console.log(''); // New line after progress
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
   * Resolve files from patterns
   */
  private async resolveFilesFromPatterns(patterns: string[]): Promise<string[]> {
    if (patterns.length === 0) {
      // Default to current directory
      patterns = [process.cwd()];
    }

    return resolveFiles(patterns);
  }

  /**
   * Load configuration
   */
  private async loadConfiguration(configPath?: string): Promise<ResolvedConfig> {
    const loader = new ConfigLoader();

    try {
      const loadOptions: any = {
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
        throw new Error(`Failed to load config from ${configPath}: ${error}`);
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
  private async registerRules(registry: RuleRegistry): Promise<void> {
    // Import and register all rules
    // We'll dynamically import rules based on what's available

    // For now, register the rules that are already implemented
    // This can be improved later with automatic discovery

    try {
      // Security rules
      const securityRules = [
        'tx-origin',
        'unchecked-calls',
        'timestamp-dependence',
        'uninitialized-state',
        'arbitrary-send',
        'delegatecall-in-loop',
        'shadowing-variables',
        'selfdestruct',
        'controlled-delegatecall',
        'weak-prng',
        'uninitialized-storage',
        'reentrancy',
        'locked-ether',
        'divide-before-multiply',
        'msg-value-loop',
        'floating-pragma',
        'outdated-compiler',
        'assert-state-change',
        'missing-zero-check',
        'missing-events',
        'unsafe-cast',
        'shadowing-builtin',
        'unchecked-send',
        'unchecked-lowlevel',
        'costly-loop',
        'deprecated-functions',
      ];

      for (const ruleName of securityRules) {
        try {
          const module = await import(`@rules/security/${ruleName}`);
          const RuleClass = Object.values(module)[0] as any;
          if (RuleClass) {
            registry.register(new RuleClass());
          }
        } catch {
          // Rule not found, skip
        }
      }

      // Lint rules
      const lintRules = [
        'function-max-lines',
        'quotes',
        'max-line-length',
        'magic-numbers',
        'no-empty-blocks',
        'state-mutability',
        'var-name-mixedcase',
        'space-after-comma',
        'require-revert-reason',
        'unused-variables',
        'cache-array-length',
        'visibility-modifiers',
        'naming-convention',
        'function-complexity',
        'gas-custom-errors',
        'function-name-mixedcase',
        'boolean-equality',
        'no-trailing-whitespace',
        'no-console',
        'gas-indexed-events',
        'gas-small-strings',
      ];

      for (const ruleName of lintRules) {
        try {
          const module = await import(`@rules/lint/${ruleName}`);
          const RuleClass = Object.values(module)[0] as any;
          if (RuleClass) {
            registry.register(new RuleClass());
          }
        } catch {
          // Rule not found, skip
        }
      }
    } catch (error) {
      console.warn('Warning: Some rules could not be loaded');
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
      case 'stylish':
      default:
        return new StylishFormatter();
    }
  }

  /**
   * Determine exit code based on results
   */
  private getExitCode(result: any, args: ParsedArguments): number {
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
}
