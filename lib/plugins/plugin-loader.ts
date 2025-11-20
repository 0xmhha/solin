/**
 * Plugin Loader
 *
 * Loads and resolves Solin plugins from various sources.
 */

import * as path from 'path';
import type { SolinPlugin, ResolvedPlugin, PluginLoadOptions, PluginLoadResult } from './types';
import { PluginErrorCode } from './types';
import { PluginValidator } from './plugin-validator';
import type { IRule } from '@core/types';
import type { Config } from '@config/types';

/**
 * Loads and resolves Solin plugins
 */
export class PluginLoader {
  private validator: PluginValidator;
  private loadedPlugins: Map<string, ResolvedPlugin> = new Map();

  constructor() {
    this.validator = new PluginValidator();
  }

  /**
   * Load plugins from names or paths
   *
   * @param plugins - Array of plugin names or paths
   * @param options - Load options
   * @returns Plugin load result
   */
  async load(plugins: string[], options: PluginLoadOptions = {}): Promise<PluginLoadResult> {
    const { cwd = process.cwd(), validate = true, strict = true } = options;

    const result: PluginLoadResult = {
      plugins: [],
      errors: [],
      success: true,
    };

    for (const pluginName of plugins) {
      try {
        // Resolve plugin path
        const pluginPath = this.resolvePluginPath(pluginName, cwd);

        // Load plugin module
        const pluginModule = await this.loadPluginModule(pluginPath);

        // Validate plugin if requested
        if (validate) {
          const errors = this.validator.validate(pluginModule, pluginName);
          if (errors.length > 0) {
            result.errors.push(...errors);
            if (strict) {
              result.success = false;
              continue;
            }
          }
        }

        // Resolve plugin
        const resolvedPlugin = await this.resolvePlugin(pluginModule);

        // Check for duplicate plugin names
        if (this.loadedPlugins.has(resolvedPlugin.meta.name)) {
          result.errors.push({
            pluginName: resolvedPlugin.meta.name,
            message: `Plugin "${resolvedPlugin.meta.name}" is already loaded`,
            code: PluginErrorCode.DUPLICATE_RULE,
          });
          if (strict) {
            result.success = false;
            continue;
          }
        }

        // Store plugin
        this.loadedPlugins.set(resolvedPlugin.meta.name, resolvedPlugin);
        result.plugins.push(resolvedPlugin);

        // Call setup hook if present
        if (pluginModule.setup) {
          await pluginModule.setup();
        }
      } catch (error) {
        result.errors.push({
          pluginName,
          message: `Failed to load plugin: ${error instanceof Error ? error.message : String(error)}`,
          code: PluginErrorCode.LOAD_FAILED,
        });
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): ResolvedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Get a specific loaded plugin by name
   */
  getPlugin(name: string): ResolvedPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Get all rules from loaded plugins
   */
  getAllRules(): Map<string, new () => IRule> {
    const allRules = new Map<string, new () => IRule>();

    for (const plugin of this.loadedPlugins.values()) {
      for (const [ruleId, RuleClass] of plugin.rules) {
        allRules.set(ruleId, RuleClass);
      }
    }

    return allRules;
  }

  /**
   * Get all presets from loaded plugins
   */
  getAllPresets(): Map<string, Partial<Config>> {
    const allPresets = new Map<string, Partial<Config>>();

    for (const plugin of this.loadedPlugins.values()) {
      for (const [presetName, preset] of plugin.presets) {
        const fullName = `${plugin.meta.name}/${presetName}`;
        allPresets.set(fullName, preset);
      }
    }

    return allPresets;
  }

  /**
   * Unload all plugins
   */
  async unloadAll(): Promise<void> {
    for (const plugin of this.loadedPlugins.values()) {
      if (plugin.original.teardown) {
        await plugin.original.teardown();
      }
    }
    this.loadedPlugins.clear();
  }

  /**
   * Resolve plugin path from name
   */
  private resolvePluginPath(pluginName: string, cwd: string): string {
    // Handle relative paths
    if (pluginName.startsWith('./') || pluginName.startsWith('../')) {
      return path.resolve(cwd, pluginName);
    }

    // Handle absolute paths
    if (path.isAbsolute(pluginName)) {
      return pluginName;
    }

    // Handle npm package names
    // Try common naming conventions
    const possibleNames = [pluginName, `solin-plugin-${pluginName}`, `@solin/plugin-${pluginName}`];

    for (const name of possibleNames) {
      try {
        return require.resolve(name, { paths: [cwd] });
      } catch {
        // Continue to next name
      }
    }

    // Default to the original name (let require.resolve fail with a proper error)
    return require.resolve(pluginName, { paths: [cwd] });
  }

  /**
   * Load plugin module
   */
  private async loadPluginModule(pluginPath: string): Promise<SolinPlugin> {
    // Use dynamic import for ESM compatibility
    try {
      // Try require first (CommonJS)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require(pluginPath);
      return module.default || module;
    } catch {
      // Fall back to dynamic import (ESM)
      const module = await import(pluginPath);
      return module.default || module;
    }
  }

  /**
   * Resolve plugin to normalized structure
   */
  private async resolvePlugin(plugin: SolinPlugin): Promise<ResolvedPlugin> {
    const resolved: ResolvedPlugin = {
      meta: plugin.meta,
      rules: new Map(),
      presets: new Map(),
      original: plugin,
    };

    // Resolve rules
    if (plugin.rules) {
      for (const [ruleId, ruleDefinition] of Object.entries(plugin.rules)) {
        const fullRuleId = `${plugin.meta.name}/${ruleId}`;

        if (typeof ruleDefinition === 'function') {
          // Direct constructor
          resolved.rules.set(fullRuleId, ruleDefinition as new () => IRule);
        } else {
          // PluginRule object
          const pluginRule = ruleDefinition;
          resolved.rules.set(fullRuleId, pluginRule.rule);
        }
      }
    }

    // Resolve presets
    if (plugin.presets) {
      for (const [presetName, presetDefinition] of Object.entries(plugin.presets)) {
        if ('config' in presetDefinition) {
          // PluginPreset object
          const pluginPreset = presetDefinition;
          resolved.presets.set(presetName, pluginPreset.config);
        } else {
          // Direct config object
          resolved.presets.set(presetName, presetDefinition);
        }
      }
    }

    return resolved;
  }
}
