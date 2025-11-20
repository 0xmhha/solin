/**
 * Benign Reentrancy Security Rule
 *
 * Detects benign reentrancy where no funds are at risk but state inconsistency can occur.
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class ReentrancyBenignRule extends AbstractRule {
  constructor() {
    super({
      id: 'security/reentrancy-benign',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Benign Reentrancy',
      description:
        'Detects benign reentrancy where events are emitted after external calls. ' +
        'While funds are not at risk, this can cause state inconsistencies in event logs.',
      recommendation:
        'Emit events before making external calls to maintain consistency. ' +
        'Follow checks-effects-interactions pattern for all state changes including events.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefinition') {
      this.checkFunction(node, context);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkFunction(node: any, context: AnalysisContext): void {
    if (!node.body) return;

    const externalCalls: any[] = [];
    const eventEmissions: any[] = [];

    this.collectCallsAndEvents(node.body, externalCalls, eventEmissions);

    // Check for events emitted after external calls
    for (const call of externalCalls) {
      const callLine = call.loc?.start.line || 0;
      for (const event of eventEmissions) {
        const eventLine = event.loc?.start.line || 0;
        if (eventLine > callLine) {
          this.reportIssue(
            event,
            `Benign reentrancy: event emitted after external call (line ${callLine}). ` +
              'While funds are not at risk, this can cause event log inconsistencies if the function is reentered. ' +
              'Emit events before making external calls.',
            context
          );
        }
      }
    }
  }

  private collectCallsAndEvents(node: any, calls: any[], events: any[]): void {
    if (!node || typeof node !== 'object') return;

    // Detect external calls
    if (node.type === 'MemberAccess') {
      const memberName = node.memberName;
      if (
        memberName === 'call' ||
        memberName === 'delegatecall' ||
        memberName === 'transfer' ||
        memberName === 'send'
      ) {
        calls.push(node);
      }
    }

    // Detect event emissions
    if (node.type === 'EmitStatement') {
      events.push(node);
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.collectCallsAndEvents(child, calls, events));
      } else if (value && typeof value === 'object') {
        this.collectCallsAndEvents(value, calls, events);
      }
    }
  }

  private reportIssue(node: any, message: string, context: AnalysisContext): void {
    if (!node.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message,
      location: {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column },
      },
    });
  }
}
