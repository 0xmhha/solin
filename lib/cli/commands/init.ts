/**
 * Init Command
 *
 * Generate default .solinrc.json configuration file
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';

/**
 * Template types
 */
export type TemplateType = 'default' | 'strict' | 'minimal';

/**
 * Init command options
 */
export interface InitOptions {
  force?: boolean;
  template?: TemplateType;
  interactive?: boolean;
}

/**
 * Default configuration template - Balanced rules for most projects
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
 * Strict configuration template - All rules as errors for maximum safety
 */
const STRICT_CONFIG = {
  extends: 'solin:all',
  rules: {
    // Security rules (all errors)
    'security/reentrancy': 'error',
    'security/tx-origin': 'error',
    'security/unchecked-calls': 'error',
    'security/weak-prng': 'error',
    'security/arbitrary-send': 'error',
    'security/selfdestruct': 'error',
    'security/timestamp-dependence': 'error',
    'security/floating-pragma': 'error',
    'security/outdated-compiler': 'error',
    'security/missing-zero-check': 'error',
    'security/missing-events': 'error',

    // Lint rules (all errors)
    'lint/magic-numbers': 'error',
    'lint/unused-variables': 'error',
    'lint/naming-convention': 'error',
    'lint/function-complexity': 'error',

    // Gas optimization rules
    'gas/cache-array-length': 'error',
    'gas/use-calldata': 'error',
    'gas/pack-storage': 'error',

    // Best practices
    'best-practices/explicit-types': 'error',
    'best-practices/function-visibility': 'error',
    'best-practices/state-visibility': 'error',
  },
};

/**
 * Minimal configuration template - Only critical security rules
 */
const MINIMAL_CONFIG = {
  extends: 'solin:recommended',
  rules: {
    // Critical security rules only
    'security/reentrancy': 'error',
    'security/tx-origin': 'error',
    'security/unchecked-calls': 'error',
    'security/arbitrary-send': 'error',
    'security/selfdestruct': 'warning',
  },
};

/**
 * Template configurations map
 */
const TEMPLATES: Record<TemplateType, object> = {
  default: DEFAULT_CONFIG,
  strict: STRICT_CONFIG,
  minimal: MINIMAL_CONFIG,
};

/**
 * Template descriptions
 */
const TEMPLATE_DESCRIPTIONS: Record<TemplateType, string> = {
  default: 'Balanced rules for most projects (recommended)',
  strict: 'All rules as errors for maximum safety',
  minimal: 'Only critical security rules',
};

/**
 * Init command - creates default configuration file
 */
export class InitCommand {
  /**
   * Execute init command
   *
   * @param options - Init command options
   * @returns Exit code (0 = success, 1 = error)
   */
  async execute(options: InitOptions = {}): Promise<number> {
    try {
      const configPath = path.join(process.cwd(), '.solinrc.json');

      // Check if config already exists
      const configExists = await this.fileExists(configPath);
      if (configExists && !options.force) {
        console.error('Error: .solinrc.json already exists');
        console.log('Use --force to overwrite');
        return 1;
      }

      // Determine template to use
      let template: TemplateType;

      if (options.template) {
        // Use specified template
        template = options.template;
        if (!TEMPLATES[template]) {
          console.error(`Error: Unknown template '${template}'`);
          console.log('Available templates: default, strict, minimal');
          return 1;
        }
      } else if (options.interactive !== false && process.stdin.isTTY) {
        // Interactive mode
        template = await this.promptForTemplate();
      } else {
        // Default template
        template = 'default';
      }

      // Get configuration for selected template
      const config = TEMPLATES[template];

      // Write config file
      const configContent = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, configContent + '\n', 'utf-8');

      console.log(`\n✓ Created .solinrc.json with '${template}' template`);
      console.log(`  ${TEMPLATE_DESCRIPTIONS[template]}`);
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

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prompt user to select a template interactively
   */
  private async promptForTemplate(): Promise<TemplateType> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      console.log('\nSolin Configuration Setup\n');
      console.log('Select a configuration template:\n');
      console.log('  1) default  - ' + TEMPLATE_DESCRIPTIONS.default);
      console.log('  2) strict   - ' + TEMPLATE_DESCRIPTIONS.strict);
      console.log('  3) minimal  - ' + TEMPLATE_DESCRIPTIONS.minimal);
      console.log('');

      const askQuestion = () => {
        rl.question('Enter your choice (1-3) [1]: ', (answer) => {
          const choice = answer.trim() || '1';

          switch (choice) {
            case '1':
            case 'default':
              rl.close();
              resolve('default');
              break;
            case '2':
            case 'strict':
              rl.close();
              resolve('strict');
              break;
            case '3':
            case 'minimal':
              rl.close();
              resolve('minimal');
              break;
            default:
              console.log('Invalid choice. Please enter 1, 2, or 3.');
              askQuestion();
          }
        });
      };

      askQuestion();
    });
  }

  /**
   * Get available templates
   */
  static getTemplates(): TemplateType[] {
    return Object.keys(TEMPLATES) as TemplateType[];
  }

  /**
   * Get template description
   */
  static getTemplateDescription(template: TemplateType): string {
    return TEMPLATE_DESCRIPTIONS[template];
  }
}
