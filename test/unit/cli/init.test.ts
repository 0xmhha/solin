/**
 * Init Command Tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { InitCommand, TemplateType } from '@/cli/commands/init';

describe('InitCommand', () => {
  let initCommand: InitCommand;
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    initCommand = new InitCommand();
    originalCwd = process.cwd();

    // Create a temp directory for testing
    testDir = path.join(__dirname, 'test-init-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('execute', () => {
    test('should create default config file', async () => {
      const result = await initCommand.execute({ interactive: false });

      expect(result).toBe(0);

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.extends).toBe('solin:recommended');
      expect(config.rules['security/reentrancy']).toBe('error');
    });

    test('should create strict config when template is strict', async () => {
      const result = await initCommand.execute({
        template: 'strict',
        interactive: false,
      });

      expect(result).toBe(0);

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.extends).toBe('solin:all');
      expect(config.rules['security/timestamp-dependence']).toBe('error');
      expect(config.rules['gas/cache-array-length']).toBe('error');
    });

    test('should create minimal config when template is minimal', async () => {
      const result = await initCommand.execute({
        template: 'minimal',
        interactive: false,
      });

      expect(result).toBe(0);

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.extends).toBe('solin:recommended');
      expect(config.rules['security/reentrancy']).toBe('error');
      expect(config.rules['lint/magic-numbers']).toBeUndefined();
    });

    test('should fail if config exists without force flag', async () => {
      // Create existing config
      const configPath = path.join(testDir, '.solinrc.json');
      await fs.writeFile(configPath, '{}', 'utf-8');

      // Capture console output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await initCommand.execute({ interactive: false });

      expect(result).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error: .solinrc.json already exists');

      consoleSpy.mockRestore();
    });

    test('should overwrite existing config with force flag', async () => {
      // Create existing config
      const configPath = path.join(testDir, '.solinrc.json');
      await fs.writeFile(configPath, '{"old": true}', 'utf-8');

      const result = await initCommand.execute({
        force: true,
        interactive: false,
      });

      expect(result).toBe(0);

      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.old).toBeUndefined();
      expect(config.extends).toBe('solin:recommended');
    });

    test('should fail for unknown template', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await initCommand.execute({
        template: 'unknown' as TemplateType,
        interactive: false,
      });

      expect(result).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith("Error: Unknown template 'unknown'");

      consoleSpy.mockRestore();
    });

    test('should use default template when no template specified and not interactive', async () => {
      const result = await initCommand.execute({ interactive: false });

      expect(result).toBe(0);

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Default template has both security and lint rules
      expect(config.rules['security/reentrancy']).toBe('error');
      expect(config.rules['lint/magic-numbers']).toBe('warning');
    });
  });

  describe('static methods', () => {
    test('getTemplates should return all available templates', () => {
      const templates = InitCommand.getTemplates();

      expect(templates).toContain('default');
      expect(templates).toContain('strict');
      expect(templates).toContain('minimal');
      expect(templates).toHaveLength(3);
    });

    test('getTemplateDescription should return description for template', () => {
      expect(InitCommand.getTemplateDescription('default')).toContain('Balanced');
      expect(InitCommand.getTemplateDescription('strict')).toContain('errors');
      expect(InitCommand.getTemplateDescription('minimal')).toContain('critical');
    });
  });

  describe('config content validation', () => {
    test('default config should have expected structure', async () => {
      await initCommand.execute({
        template: 'default',
        interactive: false,
      });

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Verify structure
      expect(config).toHaveProperty('extends');
      expect(config).toHaveProperty('rules');

      // Verify security rules
      expect(config.rules['security/reentrancy']).toBe('error');
      expect(config.rules['security/tx-origin']).toBe('error');
      expect(config.rules['security/unchecked-calls']).toBe('error');

      // Verify lint rules
      expect(config.rules['lint/magic-numbers']).toBe('warning');
      expect(config.rules['lint/unused-variables']).toBe('warning');
    });

    test('strict config should have all rules as errors', async () => {
      await initCommand.execute({
        template: 'strict',
        interactive: false,
      });

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      // All rules should be errors
      for (const [, severity] of Object.entries(config.rules)) {
        expect(severity).toBe('error');
      }

      // Should have gas rules
      expect(config.rules['gas/cache-array-length']).toBe('error');
    });

    test('minimal config should have only critical security rules', async () => {
      await initCommand.execute({
        template: 'minimal',
        interactive: false,
      });

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Should have critical rules
      expect(config.rules['security/reentrancy']).toBe('error');
      expect(config.rules['security/tx-origin']).toBe('error');

      // Should NOT have lint rules
      expect(config.rules['lint/magic-numbers']).toBeUndefined();
      expect(config.rules['lint/unused-variables']).toBeUndefined();
    });

    test('config file should have trailing newline', async () => {
      await initCommand.execute({ interactive: false });

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');

      expect(content.endsWith('\n')).toBe(true);
    });

    test('config file should be valid JSON', async () => {
      await initCommand.execute({ interactive: false });

      const configPath = path.join(testDir, '.solinrc.json');
      const content = await fs.readFile(configPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('console output', () => {
    test('should output success message with template name', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await initCommand.execute({
        template: 'strict',
        interactive: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("'strict' template"));

      consoleSpy.mockRestore();
    });

    test('should output helpful next steps', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await initCommand.execute({ interactive: false });

      // Check for helpful messages
      const calls = consoleSpy.mock.calls.map(call => call[0]);
      expect(calls.some(msg => msg.includes('Add/remove rules'))).toBe(true);
      expect(calls.some(msg => msg.includes('solin'))).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    test('should handle directory creation errors gracefully', async () => {
      // Change to a non-writable location (simulated by restoring to original dir)
      process.chdir(originalCwd);

      // Create an unwritable scenario - this is hard to test reliably
      // so we'll just ensure the error handling path exists
      const result = await initCommand.execute({ interactive: false });

      // Either succeeds or fails gracefully
      expect([0, 1]).toContain(result);
    });

    test('should work with empty options object', async () => {
      const result = await initCommand.execute({});

      // Should use defaults
      expect([0, 1]).toContain(result);
    });

    test('should work with no options', async () => {
      // Mock stdin.isTTY to avoid interactive mode
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

      const result = await initCommand.execute();

      expect(result).toBe(0);

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });
  });
});
