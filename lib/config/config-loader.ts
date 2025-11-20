/**
 * Configuration Loader
 *
 * Loads and merges configuration from various sources
 */

import { cosmiconfigSync } from 'cosmiconfig';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Config, ResolvedConfig, ConfigLoadOptions, Severity, RuleConfig } from './types';
import { getPreset } from './presets';

/**
 * Configuration loader using cosmiconfig
 */
export class ConfigLoader {
  private readonly moduleName = 'solin';
  private readonly searchPlaces = [
    '.solinrc',
    '.solinrc.json',
    '.solinrc.js',
    'solin.config.js',
    'package.json',
  ];

  /**
   * Load configuration from filesystem
   */
  async load(options: ConfigLoadOptions = {}): Promise<ResolvedConfig> {
    const { cwd = process.cwd(), configPath, useDefaults = true } = options;

    const explorer = cosmiconfigSync(this.moduleName, {
      searchPlaces: this.searchPlaces,
      stopDir: path.parse(cwd).root,
    });

    let result;

    if (configPath) {
      // Load specific config file
      result = explorer.load(configPath);
    } else {
      // Search for config starting from cwd
      result = explorer.search(cwd);
    }

    if (!result) {
      if (!useDefaults) {
        throw new Error(`No configuration found in ${cwd}`);
      }
      // Return default config
      return this.getDefaultConfig(cwd);
    }

    const config = result.config as Config;

    // Validate config
    this.validate(config);

    // Resolve config (apply extends, merge with defaults)
    const basePath = path.dirname(result.filepath);
    return this.resolve(config, basePath);
  }

  /**
   * Validate configuration against schema
   */
  validate(config: Config): void {
    if (typeof config !== 'object' || config === null) {
      throw new Error('Configuration must be an object');
    }

    // Validate rules
    if (config.rules !== undefined) {
      if (typeof config.rules !== 'object' || config.rules === null) {
        throw new Error('rules must be an object');
      }

      for (const [ruleId, ruleConfig] of Object.entries(config.rules)) {
        this.validateRuleConfig(ruleId, ruleConfig);
      }
    }

    // Validate extends
    if (config.extends !== undefined) {
      if (typeof config.extends !== 'string' && !Array.isArray(config.extends)) {
        throw new Error('extends must be a string or array of strings');
      }

      if (Array.isArray(config.extends)) {
        for (const ext of config.extends) {
          if (typeof ext !== 'string') {
            throw new Error('extends must be a string or array of strings');
          }
        }
      }
    }

    // Validate plugins
    if (config.plugins !== undefined) {
      if (!Array.isArray(config.plugins)) {
        throw new Error('plugins must be an array');
      }

      for (const plugin of config.plugins) {
        if (typeof plugin !== 'string') {
          throw new Error('plugins must be an array of strings');
        }
      }
    }

    // Validate excludedFiles
    if (config.excludedFiles !== undefined) {
      if (!Array.isArray(config.excludedFiles)) {
        throw new Error('excludedFiles must be an array');
      }

      for (const pattern of config.excludedFiles) {
        if (typeof pattern !== 'string') {
          throw new Error('excludedFiles must be an array of strings');
        }
      }
    }
  }

  /**
   * Validate a single rule configuration
   */
  private validateRuleConfig(ruleId: string, ruleConfig: RuleConfig): void {
    const validSeverities: Severity[] = ['off', 'warning', 'error', 0, 1, 2];

    if (Array.isArray(ruleConfig)) {
      // Array format: [severity, options]
      if (ruleConfig.length < 1 || ruleConfig.length > 2) {
        throw new Error(`Invalid rule config for ${ruleId}: array must have 1 or 2 elements`);
      }

      const severity = ruleConfig[0];
      if (!validSeverities.includes(severity)) {
        throw new Error(
          `Invalid severity for ${ruleId}: must be one of ${validSeverities.join(', ')}`
        );
      }

      if (ruleConfig.length === 2) {
        const options = ruleConfig[1];
        if (typeof options !== 'object' || options === null) {
          throw new Error(`Invalid rule options for ${ruleId}: must be an object`);
        }
      }
    } else {
      // Simple severity
      if (!validSeverities.includes(ruleConfig as Severity)) {
        throw new Error(
          `Invalid severity for ${ruleId}: must be one of ${validSeverities.join(', ')}`
        );
      }
    }
  }

  /**
   * Merge two configurations
   */
  merge(base: Config, override: Config): Config {
    const result: Config = { ...base };

    // Merge extends
    if (override.extends !== undefined) {
      result.extends = override.extends;
    }

    // Merge parser options
    if (override.parser !== undefined) {
      result.parser = { ...base.parser, ...override.parser };
    }

    // Merge rules
    if (override.rules !== undefined) {
      result.rules = { ...base.rules, ...override.rules };
    }

    // Merge plugins (concatenate arrays, remove duplicates)
    if (override.plugins !== undefined) {
      const basePlugins = base.plugins || [];
      const overridePlugins = override.plugins || [];
      result.plugins = [...new Set([...basePlugins, ...overridePlugins])];
    }

    // Merge excludedFiles (concatenate arrays, remove duplicates)
    if (override.excludedFiles !== undefined) {
      const baseFiles = base.excludedFiles || [];
      const overrideFiles = override.excludedFiles || [];
      result.excludedFiles = [...new Set([...baseFiles, ...overrideFiles])];
    }

    // Merge env
    if (override.env !== undefined) {
      result.env = { ...base.env, ...override.env };
    }

    return result;
  }

  /**
   * Resolve configuration (apply extends, etc.)
   */
  private async resolve(config: Config, basePath: string): Promise<ResolvedConfig> {
    // Resolve extends first
    const resolvedConfig = await this.resolveExtends(config, basePath);

    const resolved: ResolvedConfig = {
      basePath,
      rules: resolvedConfig.rules || {},
    };

    if (resolvedConfig.parser !== undefined) {
      resolved.parser = resolvedConfig.parser;
    }

    if (resolvedConfig.plugins !== undefined) {
      resolved.plugins = resolvedConfig.plugins;
    }

    if (resolvedConfig.excludedFiles !== undefined) {
      resolved.excludedFiles = resolvedConfig.excludedFiles;
    }

    if (resolvedConfig.env !== undefined) {
      resolved.env = resolvedConfig.env;
    }

    return resolved;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(basePath: string): ResolvedConfig {
    return {
      basePath,
      rules: {},
      parser: {
        tolerant: false,
        sourceType: 'module',
      },
      plugins: [],
      excludedFiles: ['node_modules/**', '**/node_modules/**'],
    };
  }

  /**
   * Load a preset configuration
   * @param presetName - Preset name (e.g., "solin:recommended", "./custom.json")
   * @param basePath - Base path for resolving relative paths
   */
  async loadPreset(presetName: string, basePath?: string): Promise<Config> {
    // Check if it's a built-in preset (solin:name)
    if (presetName.startsWith('solin:')) {
      const name = presetName.substring(6); // Remove "solin:" prefix
      const preset = getPreset(name);

      if (!preset) {
        throw new Error(`Unknown preset: ${presetName}`);
      }

      return preset;
    }

    // Load from file path
    const resolvedPath = basePath ? path.resolve(basePath, presetName) : path.resolve(presetName);

    try {
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const config = JSON.parse(content) as Config;
      this.validate(config);
      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Preset file not found: ${resolvedPath}`);
      }
      throw error;
    }
  }

  /**
   * Resolve extends in configuration
   * @param config - Configuration with possible extends
   * @param basePath - Base path for resolving relative paths
   * @param visited - Set of visited config paths to detect circular dependencies
   */
  async resolveExtends(
    config: Config,
    basePath: string,
    visited: Set<string> = new Set()
  ): Promise<Config> {
    // No extends, return config as-is
    if (!config.extends) {
      return config;
    }

    // Convert single string to array for uniform processing
    const extendsArray = Array.isArray(config.extends) ? config.extends : [config.extends];

    // Start with empty config
    let result: Config = {
      rules: {},
    };

    // Process each extends in order
    for (const extendName of extendsArray) {
      // Check for circular dependency
      const extendKey = extendName.startsWith('solin:')
        ? extendName
        : path.resolve(basePath, extendName);

      if (visited.has(extendKey)) {
        throw new Error(`Circular dependency detected in extends: ${extendKey}`);
      }

      visited.add(extendKey);

      // Load the preset/config
      const extendedConfig = await this.loadPreset(extendName, basePath);

      // Recursively resolve extends in the loaded config
      const resolvedExtended = await this.resolveExtends(
        extendedConfig,
        basePath,
        new Set(visited)
      );

      // Merge the extended config into result
      result = this.merge(result, resolvedExtended);

      visited.delete(extendKey);
    }

    // Merge the current config on top (to override extended configs)
    const configWithoutExtends: Config = { ...config };
    delete configWithoutExtends.extends;

    result = this.merge(result, configWithoutExtends);

    return result;
  }
}
