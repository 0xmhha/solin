/**
 * List Rules Command
 *
 * Display all available rules
 */

import * as Rules from '@rules/index';
import type { AbstractRule } from '@rules/abstract-rule';

interface RuleInfo {
  id: string;
  category: string;
  severity: string;
  description: string;
}

/**
 * List Rules command - displays all available rules
 */
export class ListRulesCommand {
  /**
   * Execute list-rules command
   *
   * @returns Exit code (0 = success)
   */
  async execute(): Promise<number> {
    try {
      const rules = this.getAllRules();
      const ruleInfos = this.extractRuleInfos(rules);

      // Group by category
      const grouped = this.groupByCategory(ruleInfos);

      // Display rules
      this.displayRules(grouped);

      return 0;
    } catch (error) {
      console.error('Error listing rules:', error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  /**
   * Get all rule instances
   */
  private getAllRules(): AbstractRule[] {
    const ruleClasses = [
      // Security rules
      Rules.TxOriginRule,
      Rules.UncheckedCallsRule,
      Rules.TimestampDependenceRule,
      Rules.UninitializedStateRule,
      Rules.ArbitrarySendRule,
      Rules.DelegatecallInLoopRule,
      Rules.ShadowingVariablesRule,
      Rules.SelfdestructRule,
      Rules.ControlledDelegatecallRule,
      Rules.WeakPrngRule,
      Rules.UninitializedStorageRule,
      Rules.LockedEtherRule,
      Rules.ReentrancyRule,
      Rules.DivideBeforeMultiplyRule,
      Rules.MsgValueLoopRule,
      Rules.FloatingPragmaRule,
      Rules.OutdatedCompilerRule,
      Rules.AssertStateChangeRule,
      Rules.MissingZeroCheckRule,
      Rules.MissingEventsRule,
      Rules.UnsafeCastRule,
      Rules.ShadowingBuiltinRule,
      Rules.UncheckedSendRule,
      Rules.UncheckedLowlevelRule,
      Rules.CostlyLoopRule,
      Rules.DeprecatedFunctionsRule,
      Rules.AvoidSha3,
      Rules.AvoidThrow,
      Rules.IncorrectEqualityRule,
      Rules.NoInlineAssembly,
      Rules.ReturnBombRule,
      Rules.UnprotectedEtherWithdrawalRule,
      Rules.VoidConstructorRule,
      // Lint rules
      Rules.NoEmptyBlocksRule,
      Rules.NamingConventionRule,
      Rules.VisibilityModifiersRule,
      Rules.UnusedVariablesRule,
      Rules.FunctionComplexityRule,
      Rules.MagicNumbersRule,
      Rules.RequireRevertReasonRule,
      Rules.CacheArrayLengthRule,
      Rules.ConstantImmutableRule,
      Rules.UnusedStateVariablesRule,
      Rules.LoopInvariantCodeRule,
      Rules.BooleanEqualityRule,
      Rules.BraceStyleRule,
      Rules.ContractNameCamelCaseRule,
      Rules.FunctionMaxLinesRule,
      Rules.FunctionNameMixedcaseRule,
      Rules.GasCustomErrors,
      Rules.GasIndexedEvents,
      Rules.GasSmallStrings,
      Rules.IndentRule,
      Rules.MaxLineLengthRule,
      Rules.NoConsoleRule,
      Rules.NoTrailingWhitespaceRule,
      Rules.QuotesRule,
      Rules.SpaceAfterCommaRule,
      Rules.VarNameMixedcaseRule,
    ];

    const rules: AbstractRule[] = [];
    for (const RuleClass of ruleClasses) {
      if (RuleClass) {
        try {
          rules.push(new RuleClass());
        } catch {
          // Skip rules that fail to instantiate
        }
      }
    }

    return rules;
  }

  /**
   * Extract rule information
   */
  private extractRuleInfos(rules: AbstractRule[]): RuleInfo[] {
    return rules.map((rule) => ({
      id: rule.metadata.id,
      category: rule.metadata.category,
      severity: rule.metadata.severity,
      description: rule.metadata.description,
    }));
  }

  /**
   * Group rules by category
   */
  private groupByCategory(ruleInfos: RuleInfo[]): Map<string, RuleInfo[]> {
    const grouped = new Map<string, RuleInfo[]>();

    for (const ruleInfo of ruleInfos) {
      const category = ruleInfo.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(ruleInfo);
    }

    // Sort rules within each category
    for (const rules of grouped.values()) {
      rules.sort((a, b) => a.id.localeCompare(b.id));
    }

    return grouped;
  }

  /**
   * Display rules in formatted output
   */
  private displayRules(grouped: Map<string, RuleInfo[]>): void {
    console.log('\nAvailable Rules:\n');

    // Sort categories
    const categories = Array.from(grouped.keys()).sort();

    for (const category of categories) {
      const rules = grouped.get(category)!;

      console.log(`\n${this.formatCategory(category)}`);
      console.log('='.repeat(60));

      for (const rule of rules) {
        const severity = this.formatSeverity(rule.severity);
        console.log(`\n  ${rule.id}`);
        console.log(`    Severity: ${severity}`);
        console.log(`    ${rule.description}`);
      }
    }

    console.log(`\n\nTotal: ${Array.from(grouped.values()).reduce((sum, rules) => sum + rules.length, 0)} rules\n`);
  }

  /**
   * Format category name
   */
  private formatCategory(category: string): string {
    return category.toUpperCase();
  }

  /**
   * Format severity with color
   */
  private formatSeverity(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'error':
        return 'ERROR';
      case 'warning':
        return 'WARNING';
      default:
        return severity.toUpperCase();
    }
  }
}
