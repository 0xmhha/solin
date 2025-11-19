/**
 * Rule Generator Tests
 */

import { RuleGenerator, generateRule } from '@/rules/rule-generator';
import { Severity, Category } from '@core/types';

describe('RuleGenerator', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  describe('Rule code generation', () => {
    test('should generate valid rule code', () => {
      const result = generator.generate({
        name: 'my-custom-rule',
        category: Category.SECURITY,
        severity: Severity.ERROR,
        title: 'My Custom Rule',
        description: 'A custom security rule',
        recommendation: 'Fix the issue',
      });

      expect(result.ruleCode).toContain('class MyCustomRuleRule');
      expect(result.ruleCode).toContain("id: 'security/my-custom-rule'");
      expect(result.ruleCode).toContain('Category.SECURITY');
      expect(result.ruleCode).toContain('Severity.ERROR');
      expect(result.ruleCode).toContain("title: 'My Custom Rule'");
    });

    test('should include imports', () => {
      const result = generator.generate({
        name: 'test-rule',
        category: Category.LINT,
        severity: Severity.WARNING,
        title: 'Test Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain("import { AbstractRule } from '../abstract-rule'");
      expect(result.ruleCode).toContain("import { ASTWalker } from '@parser/ast-walker'");
      expect(result.ruleCode).toContain("import type { AnalysisContext } from '@core/analysis-context'");
      expect(result.ruleCode).toContain("import { Severity, Category } from '@core/types'");
    });

    test('should generate analyze method', () => {
      const result = generator.generate({
        name: 'test-rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'Test Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('analyze(context: AnalysisContext): void');
      expect(result.ruleCode).toContain('this.walker.walk(context.ast');
    });

    test('should generate check methods for node types', () => {
      const result = generator.generate({
        name: 'test-rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'Test Rule',
        description: 'Test',
        recommendation: 'Test',
        nodeTypes: ['FunctionDefinition', 'ContractDefinition'],
      });

      expect(result.ruleCode).toContain('checkFunctionDefinition(node: any, context: AnalysisContext)');
      expect(result.ruleCode).toContain('checkContractDefinition(node: any, context: AnalysisContext)');
    });

    test('should use default FunctionDefinition node type', () => {
      const result = generator.generate({
        name: 'test-rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'Test Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain("if (node.type === 'FunctionDefinition')");
      expect(result.ruleCode).toContain('checkFunctionDefinition');
    });
  });

  describe('Test code generation', () => {
    test('should generate test code by default', () => {
      const result = generator.generate({
        name: 'my-rule',
        category: Category.LINT,
        severity: Severity.WARNING,
        title: 'My Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.testCode).toBeTruthy();
      expect(result.testCode).toContain("describe('MyRuleRule'");
      expect(result.testCode).toContain("import { MyRuleRule } from './my-rule'");
    });

    test('should include metadata test', () => {
      const result = generator.generate({
        name: 'my-rule',
        category: Category.SECURITY,
        severity: Severity.ERROR,
        title: 'My Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.testCode).toContain("describe('metadata'");
      expect(result.testCode).toContain("expect(rule.metadata.id).toBe('security/my-rule')");
      expect(result.testCode).toContain('Category.SECURITY');
      expect(result.testCode).toContain('Severity.ERROR');
    });

    test('should include valid and invalid test cases', () => {
      const result = generator.generate({
        name: 'my-rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'My Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.testCode).toContain("describe('valid cases'");
      expect(result.testCode).toContain("describe('invalid cases'");
      expect(result.testCode).toContain('expect(issues).toHaveLength(0)');
      expect(result.testCode).toContain('expect(issues.length).toBeGreaterThanOrEqual(1)');
    });

    test('should skip test generation when includeTests is false', () => {
      const result = generator.generate({
        name: 'my-rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'My Rule',
        description: 'Test',
        recommendation: 'Test',
        includeTests: false,
      });

      expect(result.testCode).toBe('');
    });
  });

  describe('File names', () => {
    test('should generate correct file names', () => {
      const result = generator.generate({
        name: 'my-custom-rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'My Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleFileName).toBe('my-custom-rule.ts');
      expect(result.testFileName).toBe('my-custom-rule.test.ts');
    });
  });

  describe('Class name conversion', () => {
    test('should convert kebab-case to PascalCase', () => {
      const result = generator.generate({
        name: 'my-awesome-rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'My Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('class MyAwesomeRuleRule');
    });

    test('should handle single word names', () => {
      const result = generator.generate({
        name: 'rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('class RuleRule');
    });
  });

  describe('Different severities', () => {
    test('should handle ERROR severity', () => {
      const result = generator.generate({
        name: 'test',
        category: Category.SECURITY,
        severity: Severity.ERROR,
        title: 'Test',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('Severity.ERROR');
    });

    test('should handle WARNING severity', () => {
      const result = generator.generate({
        name: 'test',
        category: Category.LINT,
        severity: Severity.WARNING,
        title: 'Test',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('Severity.WARNING');
    });

    test('should handle INFO severity', () => {
      const result = generator.generate({
        name: 'test',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'Test',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('Severity.INFO');
    });
  });

  describe('Different categories', () => {
    test('should handle SECURITY category', () => {
      const result = generator.generate({
        name: 'test',
        category: Category.SECURITY,
        severity: Severity.ERROR,
        title: 'Test',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('Category.SECURITY');
      expect(result.ruleCode).toContain("id: 'security/test'");
    });

    test('should handle LINT category', () => {
      const result = generator.generate({
        name: 'test',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'Test',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('Category.LINT');
      expect(result.ruleCode).toContain("id: 'lint/test'");
    });
  });

  describe('generateRule helper', () => {
    test('should generate rule using helper function', () => {
      const result = generateRule({
        name: 'helper-rule',
        category: Category.LINT,
        severity: Severity.INFO,
        title: 'Helper Rule',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.ruleCode).toContain('class HelperRuleRule');
      expect(result.ruleFileName).toBe('helper-rule.ts');
    });
  });
});
