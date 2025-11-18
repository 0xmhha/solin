/**
 * Init Command
 *
 * Generate default .solinrc.json configuration file
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Default configuration template
 */
const DEFAULT_CONFIG = {
  extends: 'solin:recommended',
  rules: {
    // Security rules (errors)
    'security/reentrancy': 'error',
    'security/tx-origin': 'error',
    'security/unchecked-calls': 'error',
    'security/weak-prng': 'error',
    'security/arbitrary-send': 'error',
    'security/selfdestruct': 'error',

    // Security rules (warnings)
    'security/timestamp-dependence': 'warning',
    'security/floating-pragma': 'warning',
    'security/outdated-compiler': 'warning',
    'security/missing-zero-check': 'warning',
    'security/missing-events': 'warning',

    // Lint rules (warnings)
    'lint/magic-numbers': 'warning',
    'lint/unused-variables': 'warning',
    'lint/naming-convention': 'warning',
    'lint/function-complexity': 'warning',
  },
};

/**
 * Init command - creates default configuration file
 */
export class InitCommand {
  /**
   * Execute init command
   *
   * @param force - Overwrite existing config file
   * @returns Exit code (0 = success, 1 = error)
   */
  async execute(force: boolean = false): Promise<number> {
    try {
      const configPath = path.join(process.cwd(), '.solinrc.json');

      // Check if config already exists
      try {
        await fs.access(configPath);
        if (!force) {
          console.error('Error: .solinrc.json already exists');
          console.log('Use --force to overwrite');
          return 1;
        }
      } catch {
        // File doesn't exist, proceed
      }

      // Write config file
      const configContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
      await fs.writeFile(configPath, configContent + '\n', 'utf-8');

      console.log('✓ Created .solinrc.json');
      console.log('\nYou can now customize your configuration:');
      console.log('  - Add/remove rules');
      console.log('  - Change rule severities (off, warning, error)');
      console.log('  - Configure rule options');
      console.log('\nRun "solin <files>" to analyze your Solidity code');

      return 0;
    } catch (error) {
      console.error('Error creating config:', error instanceof Error ? error.message : String(error));
      return 1;
    }
  }
}
