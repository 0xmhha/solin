/**
 * Generate Rule Command
 *
 * CLI command to generate rule templates for custom rules
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Command } from 'commander';

interface GenerateRuleOptions {
  category?: string;
  severity?: string;
  output?: string;
  test?: boolean;
}

/**
 * Register generate-rule command
 */
export function registerGenerateRuleCommand(program: Command): void {
  program
    .command('generate-rule')
    .description('Generate a custom rule template')
    .argument('<name>', 'Rule name (e.g., no-unsafe-math)')
    .option('-c, --category <category>', 'Rule category (lint|security|custom)', 'custom')
    .option('-s, --severity <severity>', 'Rule severity (error|warning|info)', 'warning')
    .option('-o, --output <dir>', 'Output directory', './custom-rules')
    .option('--test', 'Also generate test file', false)
    .action(async (name: string, options: GenerateRuleOptions) => {
      try {
        await generateRule(name, options);
      } catch (error) {
        console.error('Error generating rule:', error);
        process.exit(1);
      }
    });
}

/**
 * Generate rule template
 */
async function generateRule(name: string, options: GenerateRuleOptions): Promise<void> {
  const {
    category = 'custom',
    severity = 'warning',
    output = './custom-rules',
    test = false,
  } = options;

  // Validate inputs
  const validCategories = ['lint', 'security', 'custom'];
  const validSeverities = ['error', 'warning', 'info'];

  if (!validCategories.includes(category.toLowerCase())) {
    throw new Error(`Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}`);
  }

  if (!validSeverities.includes(severity.toLowerCase())) {
    throw new Error(`Invalid severity: ${severity}. Must be one of: ${validSeverities.join(', ')}`);
  }

  // Create output directory
  const outputDir = path.resolve(output);
  await fs.mkdir(outputDir, { recursive: true });

  // Generate rule file
  const ruleFilePath = path.join(outputDir, `${name}.ts`);
  const ruleContent = generateRuleContent(name, category, severity);
  await fs.writeFile(ruleFilePath, ruleContent, 'utf-8');

  console.log(`✅ Generated rule: ${ruleFilePath}`);

  // Generate test file if requested
  if (test) {
    const testDir = path.join(outputDir, '__tests__');
    await fs.mkdir(testDir, { recursive: true });

    const testFilePath = path.join(testDir, `${name}.test.ts`);
    const testContent = generateTestContent(name, category);
    await fs.writeFile(testFilePath, testContent, 'utf-8');

    console.log(`✅ Generated test: ${testFilePath}`);
  }

  console.log('\n📖 Next steps:');
  console.log('1. Implement the detect() method in your rule');
  console.log('2. Add tests to verify rule behavior');
  console.log('3. Register the rule in your configuration');
  console.log(`\nExample usage in .solinrc.json:`);
  console.log(`{
  "rules": {
    "${category}/${name}": "${severity}"
  }
}`);
}

/**
 * Generate rule content
 */
function generateRuleContent(name: string, category: string, severity: string): string {
  const className = toPascalCase(name) + 'Rule';
  const categoryEnum = category.toUpperCase();
  const severityEnum = severity.toUpperCase();

  return `/**
 * ${toTitleCase(name)} Rule
 *
 * Custom rule implementation
 */

import { AbstractRule } from 'solin';
import type { AnalysisContext, Issue } from 'solin';
import { Category, Severity } from 'solin';

/**
 * ${toTitleCase(name)} rule
 *
 * TODO: Add detailed description of what this rule checks
 */
export class ${className} extends AbstractRule {
  constructor() {
    super({
      id: '${category}/${name}',
      category: Category.${categoryEnum},
      severity: Severity.${severityEnum},
      metadata: {
        title: '${toTitleCase(name)}',
        description: 'TODO: Add rule description',
        recommendation: 'TODO: Add recommendation for fixing issues',
      },
    });
  }

  /**
   * Detect issues in the provided context
   */
  async analyze(context: AnalysisContext): Promise<void> {
    const ast = context.ast;

    // TODO: Implement your detection logic
    // Example: Walk the AST and check for specific patterns
    this.walkAST(ast, (node: any) => {
      // Example condition - replace with your actual logic
      if (node.type === 'ContractDefinition') {
        // Example: Report an issue
        // context.report({
        //   node,
        //   message: 'Issue detected in contract',
        // });
      }
    });
  }
}

// Export as default for easier imports
export default ${className};
`;
}

/**
 * Generate test content
 */
function generateTestContent(name: string, category: string): string {
  const className = toPascalCase(name) + 'Rule';

  return `/**
 * ${toTitleCase(name)} Rule Tests
 */

import { ${className} } from '../${name}';
import { RuleTester } from 'solin';
import { Severity } from 'solin';

describe('${className}', () => {
  const tester = new RuleTester();

  describe('Valid code', () => {
    test('should not report issues for valid code', async () => {
      const code = \`
        pragma solidity ^0.8.0;

        contract ValidExample {
          // TODO: Add valid code example
        }
      \`;

      const issues = await tester.run(${className}, code);
      expect(issues).toHaveLength(0);
    });
  });

  describe('Invalid code', () => {
    test('should report issues for invalid code', async () => {
      const code = \`
        pragma solidity ^0.8.0;

        contract InvalidExample {
          // TODO: Add invalid code example
        }
      \`;

      const issues = await tester.run(${className}, code);

      // TODO: Update expectations based on your rule
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe(Severity.WARNING);
      expect(issues[0].ruleId).toBe('${category}/${name}');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty contracts', async () => {
      const code = \`
        pragma solidity ^0.8.0;
        contract Empty {}
      \`;

      const issues = await tester.run(${className}, code);
      expect(issues).toHaveLength(0);
    });

    // TODO: Add more edge case tests
  });
});
`;
}

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Convert kebab-case to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
