/**
 * Rule Template Generator
 *
 * Generates boilerplate code for creating new Solin rules.
 */

import { Category, Severity } from '@core/types';

/**
 * Rule generation options
 */
export interface RuleGeneratorOptions {
  /**
   * Rule name in kebab-case (e.g., "my-custom-rule")
   */
  name: string;

  /**
   * Rule category
   */
  category: Category;

  /**
   * Default severity
   */
  severity: Severity;

  /**
   * Human-readable title
   */
  title: string;

  /**
   * Rule description
   */
  description: string;

  /**
   * Recommendation for fixing issues
   */
  recommendation: string;

  /**
   * Include example test cases
   * @default true
   */
  includeTests?: boolean;

  /**
   * AST node types to visit
   */
  nodeTypes?: string[];
}

/**
 * Generated rule output
 */
export interface GeneratedRule {
  /**
   * Rule source code
   */
  ruleCode: string;

  /**
   * Test file source code
   */
  testCode: string;

  /**
   * Rule file name
   */
  ruleFileName: string;

  /**
   * Test file name
   */
  testFileName: string;
}

/**
 * Generate rule template code
 */
export class RuleGenerator {
  /**
   * Generate a new rule from options
   */
  generate(options: RuleGeneratorOptions): GeneratedRule {
    const className = this.toClassName(options.name);
    const ruleId = `${options.category.toLowerCase()}/${options.name}`;

    const ruleCode = this.generateRuleCode(options, className, ruleId);
    const testCode =
      options.includeTests !== false ? this.generateTestCode(options, className, ruleId) : '';

    return {
      ruleCode,
      testCode,
      ruleFileName: `${options.name}.ts`,
      testFileName: `${options.name}.test.ts`,
    };
  }

  /**
   * Generate rule source code
   */
  private generateRuleCode(
    options: RuleGeneratorOptions,
    className: string,
    ruleId: string
  ): string {
    const categoryImport = `Category.${this.categoryToString(options.category)}`;
    const severityImport = `Severity.${this.severityToString(options.severity)}`;
    const nodeTypes = options.nodeTypes || ['FunctionDefinition'];

    return `/**
 * ${options.title}
 *
 * ${options.description}
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/analysis-context';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * ${options.title}
 *
 * ${options.description}
 */
export class ${className} extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: '${ruleId}',
      category: ${categoryImport},
      severity: ${severityImport},
      title: '${options.title}',
      description: '${options.description}',
      recommendation: '${options.recommendation}',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        ${this.generateNodeChecks(nodeTypes)}
        return undefined;
      },
    });
  }

  ${this.generateCheckMethods(nodeTypes)}
}
`;
  }

  /**
   * Generate test source code
   */
  private generateTestCode(
    options: RuleGeneratorOptions,
    className: string,
    ruleId: string
  ): string {
    const categoryImport = `Category.${this.categoryToString(options.category)}`;
    const severityImport = `Severity.${this.severityToString(options.severity)}`;

    return `/**
 * ${options.title} Tests
 */

import { ${className} } from './${options.name}';
import { AnalysisContext } from '@core/analysis-context';
import { SolidityParser } from '@parser/solidity-parser';
import { Severity, Category } from '@core/types';
import type { ResolvedConfig } from '@config/types';

describe('${className}', () => {
  let rule: ${className};
  let parser: SolidityParser;
  let config: ResolvedConfig;

  beforeEach(() => {
    rule = new ${className}();
    parser = new SolidityParser();
    config = {
      basePath: '/test',
      rules: {},
    };
  });

  describe('metadata', () => {
    test('should have correct metadata', () => {
      expect(rule.metadata.id).toBe('${ruleId}');
      expect(rule.metadata.category).toBe(${categoryImport});
      expect(rule.metadata.severity).toBe(${severityImport});
      expect(rule.metadata.title).toBeDefined();
      expect(rule.metadata.description).toBeDefined();
      expect(rule.metadata.recommendation).toBeDefined();
    });
  });

  describe('valid cases', () => {
    test('should not report issue for valid code', async () => {
      const source = \`
        pragma solidity ^0.8.0;

        contract ValidContract {
          // TODO: Add valid test case
        }
      \`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues).toHaveLength(0);
    });
  });

  describe('invalid cases', () => {
    test('should report issue for invalid code', async () => {
      const source = \`
        pragma solidity ^0.8.0;

        contract InvalidContract {
          // TODO: Add invalid test case
        }
      \`;

      const { ast } = await parser.parse(source);
      const context = new AnalysisContext('test.sol', source, ast, config);

      rule.analyze(context);

      const issues = context.getIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0]?.ruleId).toBe('${ruleId}');
    });
  });
});
`;
  }

  /**
   * Generate node type checks
   */
  private generateNodeChecks(nodeTypes: string[]): string {
    return nodeTypes
      .map(
        type => `if (node.type === '${type}') {
          this.check${type}(node, context);
        }`
      )
      .join('\n        ');
  }

  /**
   * Generate check methods for each node type
   */
  private generateCheckMethods(nodeTypes: string[]): string {
    return nodeTypes
      .map(
        type => `/**
   * Check ${type} node
   */
  private check${type}(node: any, context: AnalysisContext): void {
    // TODO: Implement check logic

    if (!node.loc) {
      return;
    }

    // Example: Report an issue
    // context.report({
    //   ruleId: this.metadata.id,
    //   severity: this.metadata.severity,
    //   category: this.metadata.category,
    //   message: 'Your error message here',
    //   location: {
    //     start: {
    //       line: node.loc.start.line,
    //       column: node.loc.start.column,
    //     },
    //     end: {
    //       line: node.loc.end.line,
    //       column: node.loc.end.column,
    //     },
    //   },
    // });
  }`
      )
      .join('\n\n  ');
  }

  /**
   * Convert kebab-case to PascalCase class name
   */
  private toClassName(name: string): string {
    return (
      name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') + 'Rule'
    );
  }

  /**
   * Convert severity to string
   */
  private severityToString(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR:
        return 'ERROR';
      case Severity.WARNING:
        return 'WARNING';
      case Severity.INFO:
        return 'INFO';
      default:
        return 'INFO';
    }
  }

  /**
   * Convert category to string
   */
  private categoryToString(category: Category): string {
    switch (category) {
      case Category.SECURITY:
        return 'SECURITY';
      case Category.LINT:
        return 'LINT';
      case Category.GAS_OPTIMIZATION:
        return 'GAS_OPTIMIZATION';
      case Category.BEST_PRACTICES:
        return 'BEST_PRACTICES';
      case Category.CUSTOM:
        return 'CUSTOM';
      default:
        return 'LINT';
    }
  }
}

/**
 * Helper function to generate a rule template
 */
export function generateRule(options: RuleGeneratorOptions): GeneratedRule {
  const generator = new RuleGenerator();
  return generator.generate(options);
}
