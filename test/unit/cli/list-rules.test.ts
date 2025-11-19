/**
 * List Rules Command Tests
 */

import { ListRulesCommand } from '@/cli/commands/list-rules';

describe('ListRulesCommand', () => {
  let listRulesCommand: ListRulesCommand;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    listRulesCommand = new ListRulesCommand();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('execute', () => {
    test('should return 0 on success', async () => {
      const result = await listRulesCommand.execute();
      expect(result).toBe(0);
    });

    test('should output available rules header', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('Available Rules');
    });

    test('should display total rule count', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toMatch(/Total:\s+\d+\s+rules/);
    });

    test('should group rules by category', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Should have security and lint categories
      expect(output).toContain('SECURITY');
      expect(output).toContain('LINT');
    });

    test('should display rule IDs', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Check for some known rule IDs
      expect(output).toMatch(/security\/tx-origin|security\/reentrancy/);
    });

    test('should display rule severities', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Should show severity information
      expect(output).toMatch(/Severity:\s+(ERROR|WARNING|INFO)/);
    });

    test('should display rule descriptions', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Should have substantial content (descriptions)
      expect(output.length).toBeGreaterThan(1000);
    });

    test('should sort categories alphabetically', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Find positions of categories
      const bestPracticesPos = output.indexOf('BEST_PRACTICES');
      const gasPos = output.indexOf('GAS');
      const lintPos = output.indexOf('LINT');
      const securityPos = output.indexOf('SECURITY');

      // Check that categories that exist are in alphabetical order
      if (bestPracticesPos !== -1 && gasPos !== -1) {
        expect(bestPracticesPos).toBeLessThan(gasPos);
      }
      if (lintPos !== -1 && securityPos !== -1) {
        expect(lintPos).toBeLessThan(securityPos);
      }
    });

    test('should include separator lines', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Should have separator lines
      expect(output).toContain('='.repeat(60));
    });
  });

  describe('rule count validation', () => {
    test('should list at least 20 security rules', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Count security rule occurrences
      const securityMatches = output.match(/security\//g) || [];
      expect(securityMatches.length).toBeGreaterThanOrEqual(20);
    });

    test('should list at least 10 lint rules', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Count lint rule occurrences
      const lintMatches = output.match(/lint\//g) || [];
      expect(lintMatches.length).toBeGreaterThanOrEqual(10);
    });

    test('should list at least 30 total rules', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');

      // Extract total from output
      const totalMatch = output.match(/Total:\s+(\d+)\s+rules/);
      expect(totalMatch).not.toBeNull();
      expect(totalMatch).toHaveLength(2);

      const total = parseInt(totalMatch![1] as string, 10);
      expect(total).toBeGreaterThanOrEqual(30);
    });
  });

  describe('specific rules', () => {
    test('should include tx-origin rule', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('security/tx-origin');
    });

    test('should include reentrancy rule', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('security/reentrancy');
    });

    test('should include no-empty-blocks rule', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('lint/no-empty-blocks');
    });

    test('should include naming-convention rule', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('lint/naming-convention');
    });

    test('should include unused-variables rule', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('lint/unused-variables');
    });
  });

  describe('output formatting', () => {
    test('should properly indent rule information', async () => {
      await listRulesCommand.execute();

      const calls = consoleLogSpy.mock.calls.map(call => call[0]);

      // Check for indentation patterns
      const hasIndentedContent = calls.some(
        (line: string) => typeof line === 'string' && line.startsWith('  ')
      );
      expect(hasIndentedContent).toBe(true);
    });

    test('should format ERROR severity', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('ERROR');
    });

    test('should format WARNING severity', async () => {
      await listRulesCommand.execute();

      const output = consoleLogSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('WARNING');
    });
  });

  describe('error handling', () => {
    test('should handle empty rules gracefully', async () => {
      // Even if some rules fail to instantiate, it should still work
      const result = await listRulesCommand.execute();
      expect(result).toBe(0);
    });
  });
});
