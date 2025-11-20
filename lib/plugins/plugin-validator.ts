/**
 * Plugin Validator
 *
 * Validates plugin structure and ensures plugins conform to the expected interface.
 */

import type {
  SolinPlugin,
  PluginValidationError,
  PluginRule,
} from './types';
import { PluginErrorCode } from './types';

/**
 * Validates Solin plugins
 */
export class PluginValidator {
  /**
   * Validate a plugin
   *
   * @param plugin - Plugin to validate
   * @param name - Plugin name (for error messages)
   * @returns Array of validation errors (empty if valid)
   */
  validate(plugin: unknown, name?: string): PluginValidationError[] {
    const errors: PluginValidationError[] = [];
    const pluginName = name || 'unknown';

    // Check if plugin is an object
    if (!plugin || typeof plugin !== 'object') {
      errors.push({
        pluginName,
        message: 'Plugin must be an object',
        code: PluginErrorCode.INVALID_STRUCTURE,
      });
      return errors;
    }

    const p = plugin as SolinPlugin;

    // Validate metadata
    errors.push(...this.validateMetadata(p, pluginName));

    // Validate rules if present
    if (p.rules) {
      errors.push(...this.validateRules(p.rules, pluginName));
    }

    // Validate presets if present
    if (p.presets) {
      errors.push(...this.validatePresets(p.presets, pluginName));
    }

    // Validate hooks if present
    if (p.setup && typeof p.setup !== 'function') {
      errors.push({
        pluginName,
        message: 'Plugin setup must be a function',
        code: PluginErrorCode.INVALID_STRUCTURE,
      });
    }

    if (p.teardown && typeof p.teardown !== 'function') {
      errors.push({
        pluginName,
        message: 'Plugin teardown must be a function',
        code: PluginErrorCode.INVALID_STRUCTURE,
      });
    }

    return errors;
  }

  /**
   * Validate plugin metadata
   */
  private validateMetadata(
    plugin: SolinPlugin,
    pluginName: string,
  ): PluginValidationError[] {
    const errors: PluginValidationError[] = [];

    if (!plugin.meta) {
      errors.push({
        pluginName,
        message: 'Plugin must have a "meta" property with metadata',
        code: PluginErrorCode.MISSING_METADATA,
      });
      return errors;
    }

    const { meta } = plugin;

    if (!meta.name || typeof meta.name !== 'string') {
      errors.push({
        pluginName,
        message: 'Plugin metadata must have a "name" string',
        code: PluginErrorCode.MISSING_METADATA,
      });
    }

    if (!meta.version || typeof meta.version !== 'string') {
      errors.push({
        pluginName,
        message: 'Plugin metadata must have a "version" string',
        code: PluginErrorCode.MISSING_METADATA,
      });
    }

    // Validate version format (basic semver check)
    if (meta.version && !/^\d+\.\d+\.\d+/.test(meta.version)) {
      errors.push({
        pluginName,
        message: `Invalid version format: ${meta.version}. Use semver (e.g., 1.0.0)`,
        code: PluginErrorCode.MISSING_METADATA,
      });
    }

    return errors;
  }

  /**
   * Validate plugin rules
   */
  private validateRules(
    rules: Record<string, PluginRule | (new () => unknown)>,
    pluginName: string,
  ): PluginValidationError[] {
    const errors: PluginValidationError[] = [];

    if (typeof rules !== 'object' || Array.isArray(rules)) {
      errors.push({
        pluginName,
        message: 'Plugin rules must be an object',
        code: PluginErrorCode.INVALID_RULE,
      });
      return errors;
    }

    for (const [ruleId, ruleDefinition] of Object.entries(rules)) {
      // Validate rule ID format
      if (!/^[a-z][a-z0-9-]*$/i.test(ruleId)) {
        errors.push({
          pluginName,
          message: `Invalid rule ID "${ruleId}". Use kebab-case (e.g., my-rule)`,
          code: PluginErrorCode.INVALID_RULE,
        });
        continue;
      }

      // Check if it's a constructor or PluginRule object
      if (typeof ruleDefinition === 'function') {
        // It's a constructor, try to instantiate
        try {
          const instance = new ruleDefinition();
          if (!this.isValidRuleInstance(instance)) {
            errors.push({
              pluginName,
              message: `Rule "${ruleId}" does not implement IRule interface`,
              code: PluginErrorCode.INVALID_RULE,
            });
          }
        } catch (error) {
          errors.push({
            pluginName,
            message: `Failed to instantiate rule "${ruleId}": ${error instanceof Error ? error.message : String(error)}`,
            code: PluginErrorCode.INVALID_RULE,
          });
        }
      } else if (typeof ruleDefinition === 'object' && ruleDefinition !== null) {
        // It's a PluginRule object
        const pluginRule = ruleDefinition;
        if (typeof pluginRule.rule !== 'function') {
          errors.push({
            pluginName,
            message: `Rule "${ruleId}" must have a "rule" constructor`,
            code: PluginErrorCode.INVALID_RULE,
          });
        } else {
          try {
            const instance = new pluginRule.rule();
            if (!this.isValidRuleInstance(instance)) {
              errors.push({
                pluginName,
                message: `Rule "${ruleId}" does not implement IRule interface`,
                code: PluginErrorCode.INVALID_RULE,
              });
            }
          } catch (error) {
            errors.push({
              pluginName,
              message: `Failed to instantiate rule "${ruleId}": ${error instanceof Error ? error.message : String(error)}`,
              code: PluginErrorCode.INVALID_RULE,
            });
          }
        }
      } else {
        errors.push({
          pluginName,
          message: `Rule "${ruleId}" must be a constructor or PluginRule object`,
          code: PluginErrorCode.INVALID_RULE,
        });
      }
    }

    return errors;
  }

  /**
   * Validate plugin presets
   */
  private validatePresets(
    presets: Record<string, unknown>,
    pluginName: string,
  ): PluginValidationError[] {
    const errors: PluginValidationError[] = [];

    if (typeof presets !== 'object' || Array.isArray(presets)) {
      errors.push({
        pluginName,
        message: 'Plugin presets must be an object',
        code: PluginErrorCode.INVALID_PRESET,
      });
      return errors;
    }

    for (const [presetName, preset] of Object.entries(presets)) {
      // Validate preset name format
      if (!/^[a-z][a-z0-9-]*$/i.test(presetName)) {
        errors.push({
          pluginName,
          message: `Invalid preset name "${presetName}". Use kebab-case`,
          code: PluginErrorCode.INVALID_PRESET,
        });
        continue;
      }

      // Check if preset is valid
      if (!preset || typeof preset !== 'object') {
        errors.push({
          pluginName,
          message: `Preset "${presetName}" must be an object`,
          code: PluginErrorCode.INVALID_PRESET,
        });
        continue;
      }

      // If it's a PluginPreset, check for config
      const p = preset as { config?: unknown; name?: string };
      if (p.name && !p.config) {
        errors.push({
          pluginName,
          message: `Preset "${presetName}" must have a "config" property`,
          code: PluginErrorCode.INVALID_PRESET,
        });
      }
    }

    return errors;
  }

  /**
   * Check if an object implements IRule interface
   */
  private isValidRuleInstance(instance: unknown): boolean {
    if (!instance || typeof instance !== 'object') {
      return false;
    }

    const rule = instance as Record<string, unknown>;

    // Check for required properties
    if (!rule.metadata || typeof rule.metadata !== 'object') {
      return false;
    }

    // Check for analyze method
    if (typeof rule.analyze !== 'function') {
      return false;
    }

    // Check metadata has required fields
    const metadata = rule.metadata as Record<string, unknown>;
    if (!metadata.id || typeof metadata.id !== 'string') {
      return false;
    }

    return true;
  }
}
