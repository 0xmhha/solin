/**
 * State Mutability Rule
 *
 * Suggests appropriate state mutability modifiers for functions
 */

import { AbstractRule } from '../abstract-rule';
import { ASTWalker } from '@parser/ast-walker';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';
import type { ASTNode } from '@parser/types';

/**
 * Rule that suggests state mutability modifiers:
 * - Functions that don't access state should be marked as pure
 * - Functions that only read state should be marked as view
 * - Detects unnecessary payable modifiers
 */
export class StateMutabilityRule extends AbstractRule {
  private walker: ASTWalker;

  constructor() {
    super({
      id: 'lint/state-mutability',
      category: Category.LINT,
      severity: Severity.WARNING,
      title: 'State Mutability',
      description: 'Functions should have appropriate state mutability modifiers (pure, view)',
      recommendation:
        'Use "pure" for functions that don\'t access state, "view" for functions that only read state, and avoid unnecessary "payable" modifiers.',
    });

    this.walker = new ASTWalker();
  }

  analyze(context: AnalysisContext): void {
    this.walker.walk(context.ast, {
      enter: (node: ASTNode) => {
        if (node.type === 'FunctionDefinition') {
          this.checkFunctionMutability(node, context);
        }
        return undefined;
      },
    });
  }

  /**
   * Check if function has appropriate state mutability
   */
  private checkFunctionMutability(node: any, context: AnalysisContext): void {
    const name = node.name;
    const stateMutability = node.stateMutability;
    const body = node.body;
    const isPayable = node.isPayable || node.stateMutability === 'payable';

    if (!node.loc) {
      return;
    }

    // Skip special functions
    if (this.isSpecialFunction(name, node)) {
      return;
    }

    // Skip payable functions (they interact with value transfer)
    if (isPayable) {
      return;
    }

    // Skip functions without body (interface functions)
    if (!body) {
      return;
    }

    // If function already has view or pure, accept it
    if (stateMutability === 'view' || stateMutability === 'pure') {
      return;
    }

    // Collect parameter and local variable names
    const localNames = this.collectLocalNames(node);

    // Analyze function body to determine appropriate mutability
    const analysis = this.analyzeFunctionBody(body, localNames);

    // Suggest pure if function doesn't access state
    if (!analysis.readsState && !analysis.writesState) {
      const functionName = name || 'unnamed function';
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Function '${functionName}' does not access state and should be marked as 'pure'`,
        location: {
          start: {
            line: node.loc.start.line,
            column: node.loc.start.column,
          },
          end: {
            line: node.loc.end.line,
            column: node.loc.end.column,
          },
        },
      });
    }
    // Suggest view if function only reads state
    else if (analysis.readsState && !analysis.writesState) {
      const functionName = name || 'unnamed function';
      context.report({
        ruleId: this.metadata.id,
        severity: this.metadata.severity,
        category: this.metadata.category,
        message: `Function '${functionName}' only reads state and should be marked as 'view'`,
        location: {
          start: {
            line: node.loc.start.line,
            column: node.loc.start.column,
          },
          end: {
            line: node.loc.end.line,
            column: node.loc.end.column,
          },
        },
      });
    }
    // Function writes state - this is acceptable without mutability modifier
  }

  /**
   * Collect parameter and local variable names
   */
  private collectLocalNames(functionNode: any): Set<string> {
    const localNames = new Set<string>();

    // Collect parameter names
    const parameters = functionNode.parameters || [];
    for (const param of parameters) {
      if (param.name) {
        localNames.add(param.name);
      }
    }

    // Collect local variable declarations in function body
    const body = functionNode.body;
    if (body) {
      this.walker.walk(body, {
        enter: (node: any) => {
          // Handle VariableDeclarationStatement
          if (node.type === 'VariableDeclarationStatement') {
            const variables = node.variables || [];
            for (const variable of variables) {
              if (variable.name) {
                localNames.add(variable.name);
              }
            }
          }
          // Handle VariableDeclaration (older or different AST structure)
          else if (node.type === 'VariableDeclaration') {
            if (node.name) {
              localNames.add(node.name);
            }
            const declarations = node.declarations || [];
            for (const decl of declarations) {
              if (decl.name) {
                localNames.add(decl.name);
              }
            }
          }
          return undefined;
        },
      });
    }

    return localNames;
  }

  /**
   * Analyze function body to detect state access patterns
   */
  private analyzeFunctionBody(
    body: any,
    localNames: Set<string>,
  ): { readsState: boolean; writesState: boolean } {
    let readsState = false;
    let writesState = false;

    // Walk through function body
    this.walker.walk(body, {
      enter: (node: any) => {
        // Detect state variable writes (assignments to identifiers)
        if (node.type === 'ExpressionStatement') {
          const expr = node.expression;
          if (expr && expr.type === 'BinaryOperation' && expr.operator === '=') {
            // Check if left side is a state variable access
            if (expr.left && expr.left.type === 'Identifier') {
              const name = expr.left.name;
              if (name && !localNames.has(name) && !this.isBuiltinOrKeyword(name)) {
                writesState = true;
              }
            }
          }
        }

        // Detect direct assignments
        if (node.type === 'BinaryOperation' && node.operator === '=') {
          if (node.left && node.left.type === 'Identifier') {
            const name = node.left.name;
            if (name && !localNames.has(name) && !this.isBuiltinOrKeyword(name)) {
              writesState = true;
            }
          }
        }

        // Detect state variable reads (identifiers that aren't parameters or local vars)
        if (node.type === 'Identifier') {
          const name = node.name;
          if (name && !localNames.has(name) && !this.isBuiltinOrKeyword(name)) {
            // This identifier is not a parameter or local variable
            // It could be a state variable
            readsState = true;
          }
        }

        return undefined;
      },
    });

    // Refine: if we write state, we probably also read it
    // But if we ONLY write, that's still state modification
    return { readsState, writesState };
  }

  /**
   * Check if a name is a built-in identifier or keyword
   */
  private isBuiltinOrKeyword(name: string): boolean {
    const builtins = [
      'msg',
      'block',
      'tx',
      'now',
      'this',
      'super',
      'true',
      'false',
      'wei',
      'gwei',
      'ether',
      'seconds',
      'minutes',
      'hours',
      'days',
      'weeks',
    ];
    return builtins.includes(name);
  }

  /**
   * Check if a function is special (constructor, fallback, receive)
   */
  private isSpecialFunction(name: string, node: any): boolean {
    if (name === 'constructor' || node.isConstructor) {
      return true;
    }

    if (name === 'fallback' || name === 'receive' || node.isFallback || node.isReceiveEther) {
      return true;
    }

    return false;
  }
}
