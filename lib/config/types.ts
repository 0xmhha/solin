/**
 * Configuration System Types
 *
 * Type definitions for solin configuration
 */

/**
 * Severity levels for rule violations
 */
export type Severity = 'off' | 'warning' | 'error' | 0 | 1 | 2;

/**
 * Rule configuration can be:
 * - Severity level: "off" | "warning" | "error" | 0 | 1 | 2
 * - Array with severity and options: ["error", { option: value }]
 */
export type RuleConfig = Severity | [Severity, Record<string, unknown>];

/**
 * Parser options
 */
export interface ParserOptions {
  /**
   * Enable tolerant parsing (continue on errors)
   */
  tolerant?: boolean;

  /**
   * Source type: module or script
   */
  sourceType?: 'module' | 'script';
}

/**
 * Rule configuration map
 */
export interface Rules {
  [ruleId: string]: RuleConfig;
}

/**
 * Main configuration interface
 */
export interface Config {
  /**
   * Extend from preset or other config
   * Examples: "solin:recommended", "solin:all", "solin:security"
   */
  extends?: string | string[];

  /**
   * Parser options
   */
  parser?: ParserOptions;

  /**
   * Rule configurations
   */
  rules?: Rules;

  /**
   * Plugin packages to load
   */
  plugins?: string[];

  /**
   * Files to exclude (glob patterns)
   */
  excludedFiles?: string[];

  /**
   * Environment settings
   */
  env?: {
    /**
     * Solidity version
     */
    version?: string;

    /**
     * EVM version
     */
    evmVersion?: string;
  };
}

/**
 * Resolved configuration (after extends and merging)
 */
export interface ResolvedConfig extends Config {
  /**
   * Base directory for resolving relative paths
   */
  basePath: string;

  /**
   * All rules (merged from extends)
   */
  rules: Rules;
}

/**
 * Configuration load options
 */
export interface ConfigLoadOptions {
  /**
   * Starting directory for config search
   */
  cwd?: string;

  /**
   * Specific config file path
   */
  configPath?: string;

  /**
   * Whether to merge with default config
   */
  useDefaults?: boolean;
}
