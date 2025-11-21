/**
 * Rule Registry Tests
 *
 * Testing rule registration and management
 */

import { RuleRegistry } from '@core/rule-registry';
import { AbstractRule } from '@/rules/abstract-rule';
import { NoEmptyBlocksRule } from '@/rules/lint/no-empty-blocks';
import { Severity, Category } from '@core/types';

/**
 * Sample test rules
 */
class TestSecurityRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/test-rule',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Test Security Rule',
      description: 'A test security rule',
      recommendation: 'Follow security best practices',
    });
  }

  analyze(): void {
    // No-op
  }
}

class TestLintRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/test-rule',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Test Lint Rule',
      description: 'A test lint rule',
      recommendation: 'Follow coding standards',
    });
  }

  analyze(): void {
    // No-op
  }
}

describe('RuleRegistry', () => {
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = new RuleRegistry();
  });

  describe('constructor', () => {
    test('should create empty registry', () => {
      expect(registry).toBeInstanceOf(RuleRegistry);
      expect(registry.getAllRules()).toHaveLength(0);
    });
  });

  describe('register', () => {
    test('should register a rule', () => {
      const rule = new TestLintRule();

      registry.register(rule);

      expect(registry.getAllRules()).toHaveLength(1);
      expect(registry.getRule('lint/test-rule')).toBe(rule);
    });

    test('should register multiple rules', () => {
      const rule1 = new TestLintRule();
      const rule2 = new TestSecurityRule();

      registry.register(rule1);
      registry.register(rule2);

      expect(registry.getAllRules()).toHaveLength(2);
    });

    test('should throw error when registering duplicate rule ID', () => {
      const rule1 = new TestLintRule();
      const rule2 = new TestLintRule();

      registry.register(rule1);

      expect(() => {
        registry.register(rule2);
      }).toThrow(/already registered/i);
    });

    test('should allow force re-registration', () => {
      const rule1 = new TestLintRule();
      const rule2 = new TestLintRule();

      registry.register(rule1);
      registry.register(rule2, { force: true });

      expect(registry.getAllRules()).toHaveLength(1);
      expect(registry.getRule('lint/test-rule')).toBe(rule2);
    });
  });

  describe('getRule', () => {
    test('should return rule by ID', () => {
      const rule = new TestLintRule();
      registry.register(rule);

      const retrieved = registry.getRule('lint/test-rule');

      expect(retrieved).toBe(rule);
    });

    test('should return undefined for non-existent rule', () => {
      const retrieved = registry.getRule('nonexistent/rule');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('hasRule', () => {
    test('should return true for registered rule', () => {
      const rule = new TestLintRule();
      registry.register(rule);

      expect(registry.hasRule('lint/test-rule')).toBe(true);
    });

    test('should return false for non-existent rule', () => {
      expect(registry.hasRule('nonexistent/rule')).toBe(false);
    });
  });

  describe('getAllRules', () => {
    test('should return empty array for empty registry', () => {
      expect(registry.getAllRules()).toEqual([]);
    });

    test('should return all registered rules', () => {
      const rule1 = new TestLintRule();
      const rule2 = new TestSecurityRule();
      const rule3 = new NoEmptyBlocksRule();

      registry.register(rule1);
      registry.register(rule2);
      registry.register(rule3);

      const all = registry.getAllRules();

      expect(all).toHaveLength(3);
      expect(all).toContain(rule1);
      expect(all).toContain(rule2);
      expect(all).toContain(rule3);
    });
  });

  describe('getRulesByCategory', () => {
    beforeEach(() => {
      registry.register(new TestLintRule());
      registry.register(new TestSecurityRule());
      registry.register(new NoEmptyBlocksRule());
    });

    test('should return rules filtered by category', () => {
      const lintRules = registry.getRulesByCategory(Category.LINT);

      expect(lintRules).toHaveLength(2);
      expect(lintRules.every(r => r.metadata.category === Category.LINT)).toBe(true);
    });

    test('should return empty array for category with no rules', () => {
      const gasRules = registry.getRulesByCategory(Category.GAS_OPTIMIZATION);

      expect(gasRules).toEqual([]);
    });
  });

  describe('unregister', () => {
    test('should remove rule from registry', () => {
      const rule = new TestLintRule();
      registry.register(rule);

      registry.unregister('lint/test-rule');

      expect(registry.hasRule('lint/test-rule')).toBe(false);
      expect(registry.getAllRules()).toHaveLength(0);
    });

    test('should not throw when unregistering non-existent rule', () => {
      expect(() => {
        registry.unregister('nonexistent/rule');
      }).not.toThrow();
    });
  });

  describe('clear', () => {
    test('should remove all rules', () => {
      registry.register(new TestLintRule());
      registry.register(new TestSecurityRule());
      registry.register(new NoEmptyBlocksRule());

      registry.clear();

      expect(registry.getAllRules()).toHaveLength(0);
    });
  });

  describe('registerBulk', () => {
    test('should register multiple rules at once', () => {
      const rules = [new TestLintRule(), new TestSecurityRule(), new NoEmptyBlocksRule()];

      registry.registerBulk(rules);

      expect(registry.getAllRules()).toHaveLength(3);
    });

    test('should stop on duplicate if force is false', () => {
      const rule1 = new TestLintRule();
      registry.register(rule1);

      const rules = [new TestSecurityRule(), new TestLintRule()];

      expect(() => {
        registry.registerBulk(rules);
      }).toThrow(/already registered/i);

      // First rule should be registered, second should fail
      expect(registry.hasRule('security/test-rule')).toBe(true);
    });
  });
});
