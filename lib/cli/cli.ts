/**
 * CLI - Command Line Interface
 *
 * Main CLI class that handles argument parsing and command execution
 */

import { Command } from 'commander';
import { ParsedArguments } from './types';
import { AnalyzeCommand } from './commands/analyze';
import { InitCommand, TemplateType } from './commands/init';
import { ListRulesCommand } from './commands/list-rules';
import * as packageJson from '../../package.json';

export class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Setup commander program with all commands and options
   */
  private setupCommands(): void {
    this.program
      .name('solin')
      .description('Advanced Solidity static analysis tool\n\nCommands:\n  init          Generate default .solinrc.json configuration file\n  list-rules    List all available rules\n  <files>       Analyze Solidity files (default)')
      .version(packageJson.version)
      .argument('[files...]', 'Solidity files or glob patterns to analyze')
      .option('-c, --config <path>', 'Configuration file path')
      .option('-f, --format <type>', 'Output format (stylish, json, sarif)', 'stylish')
      .option('--fix', 'Automatically fix issues')
      .option('--dry-run', 'Show fixes without applying them')
      .option('--cache', 'Enable caching for faster subsequent runs')
      .option('--cache-location <path>', 'Cache file location')
      .option('--parallel <n>', 'Number of parallel workers', parseInt)
      .option('--ignore-path <path>', 'Path to ignore file')
      .option('--max-warnings <n>', 'Maximum number of warnings', parseInt)
      .option('-q, --quiet', 'Report errors only')
      .allowUnknownOption(false);
  }

  /**
   * Parse command line arguments
   */
  parseArguments(args: string[]): ParsedArguments {
    this.program.parse(args);

    const options = this.program.opts();
    const files = this.program.args;

    return {
      files,
      config: options.config,
      format: options.format,
      fix: options.fix,
      dryRun: options.dryRun,
      cache: options.cache,
      cacheLocation: options.cacheLocation,
      parallel: options.parallel,
      ignorePath: options.ignorePath,
      maxWarnings: options.maxWarnings,
      quiet: options.quiet,
    };
  }

  /**
   * Get version from package.json
   */
  getVersion(): string {
    return packageJson.version;
  }

  /**
   * Show help text
   */
  showHelp(): string {
    return this.program.helpInformation();
  }

  /**
   * Run the CLI with given arguments
   */
  async run(args: string[]): Promise<number> {
    try {
      // Check for subcommands
      const command = args[2];

      if (command === 'init') {
        const force = args.includes('--force');
        let template: TemplateType | undefined;

        // Parse --template flag
        const templateIndex = args.indexOf('--template');
        if (templateIndex !== -1 && args[templateIndex + 1]) {
          template = args[templateIndex + 1] as TemplateType;
        }

        // Also support short form -t
        const shortTemplateIndex = args.indexOf('-t');
        if (shortTemplateIndex !== -1 && args[shortTemplateIndex + 1]) {
          template = args[shortTemplateIndex + 1] as TemplateType;
        }

        const initCommand = new InitCommand();
        const initOptions: {
          force: boolean;
          template?: TemplateType;
          interactive: boolean;
        } = {
          force,
          interactive: !template, // Interactive if no template specified
        };

        if (template) {
          initOptions.template = template;
        }

        return await initCommand.execute(initOptions);
      }

      if (command === 'list-rules') {
        const listRulesCommand = new ListRulesCommand();
        return await listRulesCommand.execute();
      }

      // Default: analyze command
      const parsedArgs = this.parseArguments(args);

      // Handle special cases
      if (parsedArgs.help) {
        console.log(this.showHelp());
        return 0;
      }

      if (parsedArgs.version) {
        console.log(this.getVersion());
        return 0;
      }

      // Run analysis
      const analyzeCommand = new AnalyzeCommand();
      return await analyzeCommand.execute(parsedArgs);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      return 1;
    }
  }
}
