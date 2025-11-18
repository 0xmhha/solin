/**
 * Example Solin Plugin
 *
 * This example demonstrates how to create a Solin plugin
 * that adds custom rules and presets.
 */

import { AbstractRule } from '../../lib/rules/abstract-rule';
import type { AnalysisContext } from '../../lib/core/analysis-context';
import { Severity, Category } from '../../lib/core/types';
import type { SolinPlugin } from '../../lib/plugins/types';

/**
 * Example custom rule: No TODO comments
 *
 * Reports when TODO comments are found in the code.
 */
class NoTodoCommentsRule extends AbstractRule {
  constructor() {
    super({
      id: 'example-plugin/no-todo-comments',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'No TODO Comments',
      description: 'Detects TODO comments in source code',
      recommendation: 'Resolve TODO items before committing to production.',
    });
  }

  analyze(context: AnalysisContext): void {
    const source = context.source;
    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check for TODO comments
      const todoMatch = line.match(/\/\/\s*TODO:?\s*(.*)/i);
      if (todoMatch) {
        const todoText = todoMatch[1] || 'No description';

        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `TODO comment found: "${todoText.trim()}"`,
          location: {
            start: { line: i + 1, column: 0 },
            end: { line: i + 1, column: line.length },
          },
        });
      }

      // Check for FIXME comments
      const fixmeMatch = line.match(/\/\/\s*FIXME:?\s*(.*)/i);
      if (fixmeMatch) {
        const fixmeText = fixmeMatch[1] || 'No description';

        context.report({
          ruleId: this.metadata.id,
          severity: Severity.WARNING,
          category: this.metadata.category,
          message: `FIXME comment found: "${fixmeText.trim()}"`,
          location: {
            start: { line: i + 1, column: 0 },
            end: { line: i + 1, column: line.length },
          },
        });
      }
    }
  }
}

/**
 * Example custom rule: No magic addresses
 *
 * Reports hardcoded Ethereum addresses in the code.
 */
class NoMagicAddressesRule extends AbstractRule {
  constructor() {
    super({
      id: 'example-plugin/no-magic-addresses',
      category: Category.SECURITY,
      severity: Severity.WARNING,
      title: 'No Magic Addresses',
      description: 'Detects hardcoded Ethereum addresses in source code',
      recommendation:
        'Use constants or configuration for addresses. Hardcoded addresses make code less maintainable and can be a security risk.',
    });
  }

  analyze(context: AnalysisContext): void {
    const source = context.source;
    const lines = source.split('\n');

    // Regex to match Ethereum addresses (0x followed by 40 hex chars)
    const addressRegex = /0x[a-fA-F0-9]{40}/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      let match;
      while ((match = addressRegex.exec(line)) !== null) {
        // Skip if it's in a constant declaration (NAME = 0x...)
        if (/constant\s+\w+\s*=/.test(line) || /immutable\s+\w+\s*=/.test(line)) {
          continue;
        }

        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Hardcoded address "${match[0]}" found. Consider using a named constant.`,
          location: {
            start: { line: i + 1, column: match.index },
            end: { line: i + 1, column: match.index + match[0].length },
          },
        });
      }
    }
  }
}

/**
 * Example Solin Plugin
 */
const examplePlugin: SolinPlugin = {
  meta: {
    name: 'example-plugin',
    version: '1.0.0',
    description: 'Example Solin plugin demonstrating custom rules',
    author: 'Solin Contributors',
    homepage: 'https://github.com/0xmhha/solin',
  },

  // Custom rules provided by this plugin
  rules: {
    'no-todo-comments': NoTodoCommentsRule,
    'no-magic-addresses': NoMagicAddressesRule,
  },

  // Configuration presets
  presets: {
    recommended: {
      rules: {
        'example-plugin/no-todo-comments': 'info',
        'example-plugin/no-magic-addresses': 'warning',
      },
    },
    strict: {
      rules: {
        'example-plugin/no-todo-comments': 'warning',
        'example-plugin/no-magic-addresses': 'error',
      },
    },
  },

  // Optional setup hook
  setup() {
    console.log('Example plugin loaded!');
  },

  // Optional teardown hook
  teardown() {
    console.log('Example plugin unloaded!');
  },
};

export default examplePlugin;

// Also export the rules for direct use
export { NoTodoCommentsRule, NoMagicAddressesRule };
