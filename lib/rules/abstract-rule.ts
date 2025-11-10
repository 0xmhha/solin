/**
 * Abstract Rule
 *
 * Base class for all lint and security rules
 */

import type { IRule, RuleMetadata, AnalysisContext } from '@core/types';

/**
 * Abstract base class for all rules
 *
 * Provides common functionality and enforces rule interface
 */
export abstract class AbstractRule implements IRule {
  /**
   * Rule metadata (immutable)
   */
  public readonly metadata: RuleMetadata;

  /**
   * Create a new rule
   */
  constructor(metadata: RuleMetadata) {
    this.metadata = Object.freeze({ ...metadata });
  }

  /**
   * Analyze code and report issues
   *
   * Must be implemented by concrete rule classes
   */
  abstract analyze(context: AnalysisContext): void | Promise<void>;
}
