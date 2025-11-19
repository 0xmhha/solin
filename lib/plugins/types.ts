/**
 * Plugin System Types
 *
 * Defines interfaces for Solin plugins that can add custom rules,
 * formatters, and configurations.
 */

import type { IRule, RuleMetadata } from '@core/types';
import type { Config } from '@config/types';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /**
   * Unique plugin name (e.g., "solin-plugin-security")
   */
  name: string;

  /**
   * Plugin version (semver)
   */
  version: string;

  /**
   * Plugin description
   */
  description?: string;

  /**
   * Plugin author
   */
  author?: string;

  /**
   * Plugin homepage URL
   */
  homepage?: string;

  /**
   * Minimum Solin version required
   */
  solinVersion?: string;
}

/**
 * Plugin rule definition
 */
export interface PluginRule {
  /**
   * Rule class constructor
   */
  rule: new () => IRule;

  /**
   * Rule metadata (can be derived from rule instance if not provided)
   */
  metadata?: RuleMetadata;
}

/**
 * Plugin configuration preset
 */
export interface PluginPreset {
  /**
   * Preset name (e.g., "recommended", "strict")
   */
  name: string;

  /**
   * Preset description
   */
  description?: string;

  /**
   * Configuration for this preset
   */
  config: Partial<Config>;
}

/**
 * Plugin interface
 *
 * Plugins can provide:
 * - Custom rules
 * - Configuration presets
 * - Additional configurations
 */
export interface SolinPlugin {
  /**
   * Plugin metadata
   */
  meta: PluginMetadata;

  /**
   * Custom rules provided by this plugin
   * Key is the rule ID suffix (e.g., "my-rule" becomes "plugin-name/my-rule")
   */
  rules?: Record<string, PluginRule | (new () => IRule)>;

  /**
   * Configuration presets provided by this plugin
   * Key is the preset name (e.g., "recommended")
   */
  presets?: Record<string, PluginPreset | Partial<Config>>;

  /**
   * Plugin initialization hook
   * Called when the plugin is loaded
   */
  setup?: () => void | Promise<void>;

  /**
   * Plugin cleanup hook
   * Called when the plugin is unloaded
   */
  teardown?: () => void | Promise<void>;
}

/**
 * Resolved plugin with normalized structure
 */
export interface ResolvedPlugin {
  /**
   * Plugin metadata
   */
  meta: PluginMetadata;

  /**
   * Normalized rules with full IDs
   */
  rules: Map<string, new () => IRule>;

  /**
   * Normalized presets
   */
  presets: Map<string, Partial<Config>>;

  /**
   * Original plugin reference
   */
  original: SolinPlugin;
}

/**
 * Plugin load options
 */
export interface PluginLoadOptions {
  /**
   * Base directory for resolving relative plugin paths
   */
  cwd?: string;

  /**
   * Whether to validate plugins
   * @default true
   */
  validate?: boolean;

  /**
   * Whether to throw on validation errors
   * @default true
   */
  strict?: boolean;
}

/**
 * Plugin validation error
 */
export interface PluginValidationError {
  /**
   * Plugin name (if known)
   */
  pluginName?: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Error code
   */
  code: PluginErrorCode;
}

/**
 * Plugin error codes
 */
export enum PluginErrorCode {
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  MISSING_METADATA = 'MISSING_METADATA',
  INVALID_RULE = 'INVALID_RULE',
  INVALID_PRESET = 'INVALID_PRESET',
  LOAD_FAILED = 'LOAD_FAILED',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  DUPLICATE_RULE = 'DUPLICATE_RULE',
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  /**
   * Successfully loaded plugins
   */
  plugins: ResolvedPlugin[];

  /**
   * Validation errors (if any)
   */
  errors: PluginValidationError[];

  /**
   * Whether all plugins loaded successfully
   */
  success: boolean;
}
