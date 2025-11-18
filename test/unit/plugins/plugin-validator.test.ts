/**
 * Plugin Validator Tests
 */

import { PluginValidator } from '@/plugins/plugin-validator';
import { PluginErrorCode } from '@/plugins/types';
import type { SolinPlugin } from '@/plugins/types';
import { AbstractRule } from '@/rules/abstract-rule';
import type { AnalysisContext } from '@core/analysis-context';
import { Severity, Category } from '@core/types';

// Test rule for plugin tests
class TestRule extends AbstractRule {
  constructor() {
    super({
      id: 'test/rule',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Test Rule',
      description: 'A test rule',
      recommendation: 'Test recommendation',
    });
  }

  analyze(_context: AnalysisContext): void {
    // No-op
  }
}

describe('PluginValidator', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator();
  });

  describe('Basic validation', () => {
    test('should accept valid plugin', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        rules: {
          'test-rule': TestRule,
        },
      };

      const errors = validator.validate(plugin);
      expect(errors).toHaveLength(0);
    });

    test('should reject non-object plugin', () => {
      const errors = validator.validate(null);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.code).toBe(PluginErrorCode.INVALID_STRUCTURE);
    });

    test('should reject plugin without metadata', () => {
      const plugin = {
        rules: {},
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.code === PluginErrorCode.MISSING_METADATA)).toBe(true);
    });
  });

  describe('Metadata validation', () => {
    test('should require name in metadata', () => {
      const plugin = {
        meta: {
          version: '1.0.0',
        },
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.message.includes('name'))).toBe(true);
    });

    test('should require version in metadata', () => {
      const plugin = {
        meta: {
          name: 'test-plugin',
        },
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.message.includes('version'))).toBe(true);
    });

    test('should validate version format', () => {
      const plugin = {
        meta: {
          name: 'test-plugin',
          version: 'invalid',
        },
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.message.includes('semver'))).toBe(true);
    });

    test('should accept valid semver version', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.2.3',
        },
      };

      const errors = validator.validate(plugin);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Rules validation', () => {
    test('should accept valid rule constructor', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        rules: {
          'my-rule': TestRule,
        },
      };

      const errors = validator.validate(plugin);
      expect(errors).toHaveLength(0);
    });

    test('should accept valid PluginRule object', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        rules: {
          'my-rule': {
            rule: TestRule,
          },
        },
      };

      const errors = validator.validate(plugin);
      expect(errors).toHaveLength(0);
    });

    test('should reject invalid rule ID format', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        rules: {
          'Invalid Rule Name': TestRule,
        },
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.code === PluginErrorCode.INVALID_RULE)).toBe(true);
    });

    test('should reject rule that does not implement IRule', () => {
      class InvalidRule {
        // Missing metadata and analyze
      }

      const plugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        rules: {
          'invalid-rule': InvalidRule,
        },
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.code === PluginErrorCode.INVALID_RULE)).toBe(true);
    });

    test('should reject non-constructor rule', () => {
      const plugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        rules: {
          'bad-rule': 'not a constructor',
        },
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.code === PluginErrorCode.INVALID_RULE)).toBe(true);
    });
  });

  describe('Presets validation', () => {
    test('should accept valid preset config', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        presets: {
          recommended: {
            rules: {
              'test-rule': 'error',
            },
          },
        },
      };

      const errors = validator.validate(plugin);
      expect(errors).toHaveLength(0);
    });

    test('should accept valid PluginPreset object', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        presets: {
          recommended: {
            name: 'recommended',
            description: 'Recommended settings',
            config: {
              rules: {
                'test-rule': 'error',
              },
            },
          },
        },
      };

      const errors = validator.validate(plugin);
      expect(errors).toHaveLength(0);
    });

    test('should reject invalid preset name', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        presets: {
          'Invalid Preset Name': {
            rules: {},
          },
        },
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.code === PluginErrorCode.INVALID_PRESET)).toBe(true);
    });

    test('should reject non-object preset', () => {
      const plugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        presets: {
          bad: 'not an object',
        },
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.code === PluginErrorCode.INVALID_PRESET)).toBe(true);
    });
  });

  describe('Hooks validation', () => {
    test('should accept valid setup function', () => {
      const plugin: SolinPlugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        setup: () => {
          // No-op
        },
      };

      const errors = validator.validate(plugin);
      expect(errors).toHaveLength(0);
    });

    test('should reject non-function setup', () => {
      const plugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        setup: 'not a function',
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.message.includes('setup'))).toBe(true);
    });

    test('should reject non-function teardown', () => {
      const plugin = {
        meta: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        teardown: 'not a function',
      };

      const errors = validator.validate(plugin);
      expect(errors.some((e) => e.message.includes('teardown'))).toBe(true);
    });
  });
});
