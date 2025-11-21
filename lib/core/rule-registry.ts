/**
 * Rule Registry
 *
 * Manages registration and retrieval of analysis rules
 */

import type { IRule, Category } from './types';

/**
 * Options for rule registration
 */
export interface RegisterOptions {
  /**
   * Force re-registration of existing rule
   */
  force?: boolean;
}

/**
 * Registry for managing analysis rules
 */
export class RuleRegistry {
  private rules: Map<string, IRule>;

  constructor() {
    this.rules = new Map();
  }

  /**
   * Register a rule
   */
  register(rule: IRule, options: RegisterOptions = {}): void {
    const id = rule.metadata.id;

    if (this.rules.has(id) && !options.force) {
      throw new Error(`Rule '${id}' is already registered. Use force option to override.`);
    }

    this.rules.set(id, rule);
  }

  /**
   * Register multiple rules at once
   */
  registerBulk(rules: IRule[], options: RegisterOptions = {}): void {
    for (const rule of rules) {
      this.register(rule, options);
    }
  }

  /**
   * Get a rule by ID
   */
  getRule(id: string): IRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Check if a rule is registered
   */
  hasRule(id: string): boolean {
    return this.rules.has(id);
  }

  /**
   * Get all registered rules
   */
  getAllRules(): IRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules filtered by category
   */
  getRulesByCategory(category: Category): IRule[] {
    return this.getAllRules().filter(rule => rule.metadata.category === category);
  }

  /**
   * Unregister a rule
   */
  unregister(id: string): void {
    this.rules.delete(id);
  }

  /**
   * Clear all rules
   */
  clear(): void {
    this.rules.clear();
  }
}
