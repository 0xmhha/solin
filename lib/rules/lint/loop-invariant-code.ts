/**
 * Loop Invariant Code Lint Rule
 *
 * Detects loop-invariant code that can be moved outside loops for gas optimization
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects loop-invariant code:
 * - State variables read but not modified in loops
 * - Function parameters used in loops (invariant by nature)
 * - Constants and literals (already optimized by compiler)
 * - Provides gas optimization guidance
 */
export class LoopInvariantCodeRule extends AbstractRule {
  constructor() {
    super({
      id: 'lint/loop-invariant-code',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'Loop Invariant Code',
      description:
        'Detects loop-invariant code that can be moved outside loops for gas optimization. Reading the same state variable or using the same parameter in every iteration wastes gas.',
      recommendation:
        'Cache loop-invariant values in local variables before the loop. This saves gas by avoiding repeated storage reads or redundant calculations.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Step 1: Collect state variables
    const stateVariables = this.collectStateVariables(context.ast);

    // Step 2: Walk AST to find functions with loops
    this.walkAst(context.ast, context, stateVariables);
  }

  /**
   * Collect all state variable names
   */
  private collectStateVariables(node: any): Set<string> {
    const stateVars = new Set<string>();

    const walk = (n: any): void => {
      if (!n || typeof n !== 'object') return;

      if (n.type === 'ContractDefinition' && Array.isArray(n.subNodes)) {
        for (const subNode of n.subNodes) {
          if (subNode.type === 'StateVariableDeclaration' && Array.isArray(subNode.variables)) {
            for (const variable of subNode.variables) {
              if (variable.name) {
                stateVars.add(variable.name);
              }
            }
          }
        }
      }

      for (const key in n) {
        if (key === 'loc' || key === 'range') continue;
        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(child => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(node);
    return stateVars;
  }

  /**
   * Walk AST to find functions with loops
   */
  private walkAst(node: any, context: AnalysisContext, stateVariables: Set<string>): void {
    if (!node || typeof node !== 'object') return;

    // Check for FunctionDefinition
    if (node.type === 'FunctionDefinition') {
      this.analyzeFunctionLoops(node, context, stateVariables);
    }

    // Recursively walk
    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context, stateVariables));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context, stateVariables);
      }
    }
  }

  /**
   * Analyze loops in a function
   */
  private analyzeFunctionLoops(
    funcNode: any,
    context: AnalysisContext,
    stateVariables: Set<string>
  ): void {
    // Collect function parameters
    const parameters = new Set<string>();

    // Try different AST structures for parameters
    if (funcNode.parameters) {
      // Try: parameters.parameters (nested)
      if (Array.isArray(funcNode.parameters.parameters)) {
        for (const param of funcNode.parameters.parameters) {
          if (param && param.name) {
            parameters.add(param.name);
          }
        }
      }
      // Try: parameters is array directly
      else if (Array.isArray(funcNode.parameters)) {
        for (const param of funcNode.parameters) {
          if (param && param.name) {
            parameters.add(param.name);
          }
        }
      }
    }

    // Find loops in function body
    const loops = this.findLoops(funcNode.body);

    for (const loop of loops) {
      this.analyzeLoop(loop, funcNode.body, context, stateVariables, parameters);
    }
  }

  /**
   * Find all loops in a node
   */
  private findLoops(node: any): any[] {
    const loops: any[] = [];

    const walk = (n: any): void => {
      if (!n || typeof n !== 'object') return;

      if (n.type === 'ForStatement' || n.type === 'WhileStatement') {
        loops.push(n);
      }

      for (const key in n) {
        if (key === 'loc' || key === 'range') continue;
        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(child => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(node);
    return loops;
  }

  /**
   * Analyze a single loop for invariants
   */
  private analyzeLoop(
    loopNode: any,
    funcBody: any,
    context: AnalysisContext,
    stateVariables: Set<string>,
    parameters: Set<string>
  ): void {
    // Get loop variables (variables declared/modified in loop init)
    const loopVariables = this.getLoopVariables(loopNode);

    // Get local variables declared before loop in parent scope
    const localVars = this.getLocalVariablesBefore(funcBody, loopNode);

    // Find all identifiers used in loop body
    const usedIdentifiers = this.findUsedIdentifiers(loopNode.body);

    // Find all identifiers modified in loop body
    const modifiedIdentifiers = this.findModifiedIdentifiers(loopNode.body);

    // Check each used identifier
    for (const identifier of usedIdentifiers) {
      // Skip if it's a loop variable
      if (loopVariables.has(identifier)) continue;

      // Skip if it's a local variable (already in local scope)
      if (localVars.has(identifier)) continue;

      // Skip if it's modified in the loop
      if (modifiedIdentifiers.has(identifier)) continue;

      // Skip if it's being used as an array index (array[i])
      if (this.isArrayIndexAccess(loopNode.body, identifier)) continue;

      // Report if it's a state variable or parameter
      if (stateVariables.has(identifier) || parameters.has(identifier)) {
        this.reportInvariant(identifier, loopNode, context);
      }
    }
  }

  /**
   * Get loop variables (for loop init variables)
   */
  private getLoopVariables(loopNode: any): Set<string> {
    const loopVars = new Set<string>();

    // For ForStatement, check initExpression
    if (loopNode.type === 'ForStatement' && loopNode.initExpression) {
      const init = loopNode.initExpression;
      if (init.type === 'VariableDeclarationStatement' && init.variables) {
        for (const variable of init.variables) {
          if (variable.name) {
            loopVars.add(variable.name);
          }
        }
      }
    }

    return loopVars;
  }

  /**
   * Get local variables declared before the loop in function body
   */
  private getLocalVariablesBefore(funcBody: any, loopNode: any): Set<string> {
    const localVars = new Set<string>();
    const loopStartLine = loopNode.loc?.start?.line ?? Infinity;

    // Walk the function body to find variable declarations before the loop
    const walk = (n: any): void => {
      if (!n || typeof n !== 'object') return;

      // Check if this node is the loop - stop processing this branch
      if (n === loopNode) return;

      // Check for variable declarations
      if (n.type === 'VariableDeclarationStatement') {
        const declLine = n.loc?.start?.line ?? 0;
        // Only include variables declared before the loop
        if (declLine < loopStartLine && Array.isArray(n.variables)) {
          for (const variable of n.variables) {
            if (variable && variable.name) {
              localVars.add(variable.name);
            }
          }
        }
      }

      // Recursively walk child nodes
      for (const key in n) {
        if (key === 'loc' || key === 'range') continue;
        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(child => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    // Walk the function body (Block node)
    if (funcBody && funcBody.statements) {
      for (const statement of funcBody.statements) {
        walk(statement);
      }
    } else {
      walk(funcBody);
    }

    return localVars;
  }

  /**
   * Find all identifiers used in a node
   */
  private findUsedIdentifiers(node: any): Set<string> {
    const identifiers = new Set<string>();

    const walk = (n: any): void => {
      if (!n || typeof n !== 'object') return;

      if (n.type === 'Identifier' && n.name) {
        identifiers.add(n.name);
      }

      for (const key in n) {
        if (key === 'loc' || key === 'range') continue;
        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(child => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(node);
    return identifiers;
  }

  /**
   * Find all identifiers modified in a node (assignments)
   */
  private findModifiedIdentifiers(node: any): Set<string> {
    const modified = new Set<string>();

    const walk = (n: any): void => {
      if (!n || typeof n !== 'object') return;

      // Check for assignments
      if (n.type === 'BinaryOperation' && n.operator === '=') {
        const target = this.getAssignmentTarget(n.left);
        if (target) modified.add(target);
      }

      // Check for unary operations (++, --)
      if (n.type === 'UnaryOperation' && (n.operator === '++' || n.operator === '--')) {
        const target = this.getAssignmentTarget(n.subExpression);
        if (target) modified.add(target);
      }

      // Check for compound assignments (+=, -=, etc.)
      if (
        n.type === 'BinaryOperation' &&
        (n.operator === '+=' ||
          n.operator === '-=' ||
          n.operator === '*=' ||
          n.operator === '/=' ||
          n.operator === '%=')
      ) {
        const target = this.getAssignmentTarget(n.left);
        if (target) modified.add(target);
      }

      for (const key in n) {
        if (key === 'loc' || key === 'range') continue;
        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(child => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(node);
    return modified;
  }

  /**
   * Get assignment target identifier name
   */
  private getAssignmentTarget(node: any): string | null {
    if (!node) return null;

    if (node.type === 'Identifier') {
      return node.name;
    }

    // For member access or index access, get the base
    if (node.type === 'IndexAccess') {
      return this.getAssignmentTarget(node.base);
    }

    if (node.type === 'MemberAccess') {
      // Don't return the member name, only the base
      return null;
    }

    return null;
  }

  /**
   * Check if identifier is used as array index (array[identifier])
   */
  private isArrayIndexAccess(node: any, identifier: string): boolean {
    let isIndex = false;

    const walk = (n: any): void => {
      if (!n || typeof n !== 'object' || isIndex) return;

      // Check for IndexAccess where identifier is the base being indexed
      if (n.type === 'IndexAccess') {
        // If the base is the identifier, it's being accessed as array
        if (n.base && n.base.type === 'Identifier' && n.base.name === identifier) {
          isIndex = true;
          return;
        }
      }

      for (const key in n) {
        if (key === 'loc' || key === 'range') continue;
        const value = n[key];
        if (Array.isArray(value)) {
          value.forEach(child => walk(child));
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    };

    walk(node);
    return isIndex;
  }

  /**
   * Report loop-invariant code
   */
  private reportInvariant(identifier: string, loopNode: any, context: AnalysisContext): void {
    if (!loopNode.loc) return;

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Loop-invariant variable '${identifier}' is read on every iteration. Cache it in a local variable before the loop to save gas.`,
      location: {
        start: {
          line: loopNode.loc.start.line,
          column: loopNode.loc.start.column,
        },
        end: {
          line: loopNode.loc.end.line,
          column: loopNode.loc.end.column,
        },
      },
    });
  }
}
