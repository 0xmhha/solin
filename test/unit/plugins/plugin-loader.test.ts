/**
 * Plugin Loader Tests
 */

import { PluginLoader } from '@/plugins/plugin-loader';
import { PluginErrorCode } from '@/plugins/types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('PluginLoader', () => {
  let loader: PluginLoader;
  let tempDir: string;

  beforeEach(async () => {
    loader = new PluginLoader();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solin-plugin-test-'));
  });

  afterEach(async () => {
    await loader.unloadAll();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Loading plugins', () => {
    test('should load plugin from file path', async () => {
      // Create a test plugin file
      const pluginContent = `
        const { Severity, Category } = require('${path.resolve(__dirname, '../../../lib/core/types')}');
        const { AbstractRule } = require('${path.resolve(__dirname, '../../../lib/rules/abstract-rule')}');

        class MyRule extends AbstractRule {
          constructor() {
            super({
              id: 'file-plugin/my-rule',
              category: Category.LINT,
              severity: Severity.INFO,
              title: 'My Rule',
              description: 'Test',
              recommendation: 'Test',
            });
          }
          analyze() {}
        }

        module.exports = {
          meta: {
            name: 'file-plugin',
            version: '1.0.0',
          },
          rules: {
            'my-rule': MyRule,
          },
        };
      `;

      const pluginPath = path.join(tempDir, 'test-plugin.js');
      fs.writeFileSync(pluginPath, pluginContent);

      const result = await loader.load([pluginPath]);

      expect(result.success).toBe(true);
      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0]?.meta.name).toBe('file-plugin');
    });

    test('should return errors for invalid plugin', async () => {
      // Create an invalid plugin file
      const pluginContent = `
        module.exports = {
          // Missing meta
          rules: {},
        };
      `;

      const pluginPath = path.join(tempDir, 'invalid-plugin.js');
      fs.writeFileSync(pluginPath, pluginContent);

      const result = await loader.load([pluginPath]);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle non-existent plugin path', async () => {
      const result = await loader.load(['/non/existent/plugin.js']);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === PluginErrorCode.LOAD_FAILED)).toBe(true);
    });

    test('should detect duplicate plugins', async () => {
      // Create two plugins with the same name
      const pluginContent = `
        const { Severity, Category } = require('${path.resolve(__dirname, '../../../lib/core/types')}');
        const { AbstractRule } = require('${path.resolve(__dirname, '../../../lib/rules/abstract-rule')}');

        class MyRule extends AbstractRule {
          constructor() {
            super({
              id: 'duplicate-plugin/my-rule',
              category: Category.LINT,
              severity: Severity.INFO,
              title: 'My Rule',
              description: 'Test',
              recommendation: 'Test',
            });
          }
          analyze() {}
        }

        module.exports = {
          meta: {
            name: 'duplicate-plugin',
            version: '1.0.0',
          },
          rules: {
            'my-rule': MyRule,
          },
        };
      `;

      const pluginPath1 = path.join(tempDir, 'plugin1.js');
      const pluginPath2 = path.join(tempDir, 'plugin2.js');
      fs.writeFileSync(pluginPath1, pluginContent);
      fs.writeFileSync(pluginPath2, pluginContent);

      const result = await loader.load([pluginPath1, pluginPath2]);

      expect(result.errors.some(e => e.code === PluginErrorCode.DUPLICATE_RULE)).toBe(true);
    });
  });

  describe('Plugin resolution', () => {
    test('should resolve rules with full IDs', async () => {
      const pluginContent = `
        const { Severity, Category } = require('${path.resolve(__dirname, '../../../lib/core/types')}');
        const { AbstractRule } = require('${path.resolve(__dirname, '../../../lib/rules/abstract-rule')}');

        class MyRule extends AbstractRule {
          constructor() {
            super({
              id: 'test-plugin/my-rule',
              category: Category.LINT,
              severity: Severity.INFO,
              title: 'My Rule',
              description: 'Test',
              recommendation: 'Test',
            });
          }
          analyze() {}
        }

        module.exports = {
          meta: {
            name: 'test-plugin',
            version: '1.0.0',
          },
          rules: {
            'my-rule': MyRule,
          },
        };
      `;

      const pluginPath = path.join(tempDir, 'test-plugin.js');
      fs.writeFileSync(pluginPath, pluginContent);

      await loader.load([pluginPath]);

      const allRules = loader.getAllRules();
      expect(allRules.has('test-plugin/my-rule')).toBe(true);
    });

    test('should resolve presets with full names', async () => {
      const pluginContent = `
        module.exports = {
          meta: {
            name: 'preset-plugin',
            version: '1.0.0',
          },
          presets: {
            recommended: {
              rules: {
                'some-rule': 'error',
              },
            },
          },
        };
      `;

      const pluginPath = path.join(tempDir, 'preset-plugin.js');
      fs.writeFileSync(pluginPath, pluginContent);

      await loader.load([pluginPath], { validate: false });

      const allPresets = loader.getAllPresets();
      expect(allPresets.has('preset-plugin/recommended')).toBe(true);
    });
  });

  describe('Getting loaded plugins', () => {
    test('should get all loaded plugins', async () => {
      const pluginContent1 = `
        module.exports = {
          meta: { name: 'plugin-1', version: '1.0.0' },
        };
      `;

      const pluginContent2 = `
        module.exports = {
          meta: { name: 'plugin-2', version: '1.0.0' },
        };
      `;

      const pluginPath1 = path.join(tempDir, 'plugin1.js');
      const pluginPath2 = path.join(tempDir, 'plugin2.js');
      fs.writeFileSync(pluginPath1, pluginContent1);
      fs.writeFileSync(pluginPath2, pluginContent2);

      await loader.load([pluginPath1, pluginPath2], { validate: false });

      const plugins = loader.getLoadedPlugins();
      expect(plugins).toHaveLength(2);
    });

    test('should get specific plugin by name', async () => {
      const pluginContent = `
        module.exports = {
          meta: { name: 'my-plugin', version: '1.0.0' },
        };
      `;

      const pluginPath = path.join(tempDir, 'my-plugin.js');
      fs.writeFileSync(pluginPath, pluginContent);

      await loader.load([pluginPath], { validate: false });

      const plugin = loader.getPlugin('my-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.meta.name).toBe('my-plugin');
    });

    test('should return undefined for non-existent plugin', () => {
      const plugin = loader.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('Plugin hooks', () => {
    test('should call setup hook on load', async () => {
      const pluginContent = `
        module.exports = {
          meta: { name: 'hook-plugin', version: '1.0.0' },
          setup: () => { global.testSetupCalled = true; },
        };
      `;

      const pluginPath = path.join(tempDir, 'hook-plugin.js');
      fs.writeFileSync(pluginPath, pluginContent);

      await loader.load([pluginPath], { validate: false });

      expect((global as any).testSetupCalled).toBe(true);
      delete (global as any).testSetupCalled;
    });

    test('should call teardown hook on unload', async () => {
      const pluginContent = `
        module.exports = {
          meta: { name: 'teardown-plugin', version: '1.0.0' },
          teardown: () => { global.testTeardownCalled = true; },
        };
      `;

      const pluginPath = path.join(tempDir, 'teardown-plugin.js');
      fs.writeFileSync(pluginPath, pluginContent);

      await loader.load([pluginPath], { validate: false });
      await loader.unloadAll();

      expect((global as any).testTeardownCalled).toBe(true);
      delete (global as any).testTeardownCalled;
    });
  });

  describe('Unloading', () => {
    test('should clear all plugins on unloadAll', async () => {
      const pluginContent = `
        module.exports = {
          meta: { name: 'clear-plugin', version: '1.0.0' },
        };
      `;

      const pluginPath = path.join(tempDir, 'clear-plugin.js');
      fs.writeFileSync(pluginPath, pluginContent);

      await loader.load([pluginPath], { validate: false });
      expect(loader.getLoadedPlugins()).toHaveLength(1);

      await loader.unloadAll();
      expect(loader.getLoadedPlugins()).toHaveLength(0);
    });
  });
});
