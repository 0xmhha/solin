/**
 * CLI types and interfaces
 */

export interface CLIOptions {
  files: string[];
  config?: string;
  format?: string;
  fix?: boolean;
  dryRun?: boolean;
  cache?: boolean;
  cacheLocation?: string;
  parallel?: number;
  ignorePath?: string;
  maxWarnings?: number;
  quiet?: boolean;
  watch?: boolean;
}

export interface ParsedArguments extends CLIOptions {
  command?: string;
  help?: boolean;
  version?: boolean;
}
