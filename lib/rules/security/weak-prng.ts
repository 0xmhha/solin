/**
 * Weak PRNG Security Rule
 *
 * Detects weak pseudo-random number generation using predictable block properties.
 * Using block.timestamp, blockhash, block.number, etc. for randomness is dangerous because:
 * - Miners can manipulate these values within certain ranges
 * - Values are predictable and observable on-chain
 * - Attackers can exploit this in gambling/lottery contracts
 * - Front-running attacks are possible
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Rule that detects weak PRNG patterns:
 * - block.timestamp with modulo (%)
 * - blockhash with modulo
 * - block.number with modulo
 * - block.prevrandao with modulo (post-merge)
 * - block.difficulty with modulo (pre-merge)
 * - keccak256 containing block properties
 * - Deprecated 'now' with modulo
 *
 * Safe patterns (excluded):
 * - block.timestamp for time comparisons (>, <, >=, <=)
 * - block.number for block range checks
 * - Contracts without randomness logic
 */
export class WeakPrngRule extends AbstractRule {
  private static readonly BLOCK_PROPERTIES = new Set([
    'timestamp',
    'number',
    'difficulty',
    'prevrandao',
    'gaslimit',
    'coinbase',
  ]);

  constructor() {
    super({
      id: 'security/weak-prng',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Weak Pseudo-Random Number Generation',
      description:
        'Detects use of predictable block properties (timestamp, blockhash, number, prevrandao, difficulty) for random number generation. These values can be manipulated by miners and are observable on-chain, making them unsuitable for secure randomness.',
      recommendation:
        'Use Chainlink VRF (Verifiable Random Function) or similar oracle-based randomness solutions. Never rely on block properties for security-critical randomness in gambling, lotteries, or NFT distributions.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Walk the AST to find weak randomness patterns
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST nodes
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for modulo operations with block properties
    if (node.type === 'BinaryOperation' && node.operator === '%') {
      this.checkModuloOperation(node, context);
    }

    // Check for keccak256/sha256 with block properties
    if (node.type === 'FunctionCall') {
      this.checkHashFunction(node, context);
    }

    // Recursively walk all properties
    for (const key in node) {
      if (key === 'loc' || key === 'range') {
        continue;
      }

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(child => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  /**
   * Check modulo operation for block property usage
   */
  private checkModuloOperation(node: any, context: AnalysisContext): void {
    // Check if left side contains block properties or now
    if (this.containsBlockProperty(node.left) || this.containsNow(node.left)) {
      this.reportWeakRandomness(node, 'modulo operation', context);
    }
  }

  /**
   * Check hash functions (keccak256, sha256) for block property usage
   */
  private checkHashFunction(node: any, context: AnalysisContext): void {
    if (!node.expression || node.expression.type !== 'Identifier') {
      return;
    }

    const functionName = node.expression.name;

    // Check if it's a hash function
    if (functionName === 'keccak256' || functionName === 'sha256' || functionName === 'sha3') {
      // Check if arguments contain block properties
      if (node.arguments) {
        for (const arg of node.arguments) {
          if (this.containsBlockProperty(arg) || this.containsNow(arg)) {
            this.reportWeakRandomness(node, 'hash function with block properties', context);
            return;
          }
        }
      }
    }
  }

  /**
   * Check if expression contains block properties
   */
  private containsBlockProperty(node: any): boolean {
    if (!node || typeof node !== 'object') {
      return false;
    }

    // Check for block.property
    if (node.type === 'MemberAccess') {
      if (node.expression && node.expression.type === 'Identifier') {
        if (node.expression.name === 'block') {
          return WeakPrngRule.BLOCK_PROPERTIES.has(node.memberName);
        }
      }
    }

    // Check for binary operations (arithmetic, etc.)
    if (node.type === 'BinaryOperation') {
      if (node.left && this.containsBlockProperty(node.left)) {
        return true;
      }
      if (node.right && this.containsBlockProperty(node.right)) {
        return true;
      }
    }

    // Check for type conversions that might wrap block properties
    if (node.type === 'FunctionCall') {
      // Check if it's a type conversion like uint256(...)
      if (this.isTypeConversion(node)) {
        if (node.arguments && node.arguments.length > 0) {
          return this.containsBlockProperty(node.arguments[0]);
        }
      }

      // Check if it's blockhash
      if (node.expression && node.expression.type === 'Identifier') {
        if (node.expression.name === 'blockhash') {
          return true;
        }
      }

      // Check all arguments for hash functions
      if (node.arguments) {
        for (const arg of node.arguments) {
          if (this.containsBlockProperty(arg)) {
            return true;
          }
        }
      }
    }

    // Check for TupleExpression (parentheses)
    if (node.type === 'TupleExpression') {
      if (node.components) {
        for (const component of node.components) {
          if (this.containsBlockProperty(component)) {
            return true;
          }
        }
      }
    }

    // Recursively check expression
    if (node.expression && this.containsBlockProperty(node.expression)) {
      return true;
    }

    return false;
  }

  /**
   * Check if expression contains 'now' (deprecated alias for block.timestamp)
   */
  private containsNow(node: any): boolean {
    if (!node || typeof node !== 'object') {
      return false;
    }

    // Check for 'now' identifier
    if (node.type === 'Identifier' && node.name === 'now') {
      return true;
    }

    // Check for binary operations
    if (node.type === 'BinaryOperation') {
      if (node.left && this.containsNow(node.left)) {
        return true;
      }
      if (node.right && this.containsNow(node.right)) {
        return true;
      }
    }

    // Check type conversions
    if (node.type === 'FunctionCall' && this.isTypeConversion(node)) {
      if (node.arguments && node.arguments.length > 0) {
        return this.containsNow(node.arguments[0]);
      }
    }

    // Check for TupleExpression (parentheses)
    if (node.type === 'TupleExpression') {
      if (node.components) {
        for (const component of node.components) {
          if (this.containsNow(component)) {
            return true;
          }
        }
      }
    }

    // Recursively check expression
    if (node.expression && this.containsNow(node.expression)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a function call is a type conversion
   */
  private isTypeConversion(node: any): boolean {
    if (node.type !== 'FunctionCall') {
      return false;
    }

    // Check if it's a simple identifier (type name)
    if (node.expression && node.expression.type === 'Identifier') {
      const typeName = node.expression.name;
      // Common type conversions
      return (
        typeName === 'address' ||
        typeName === 'uint256' ||
        typeName === 'uint' ||
        typeName === 'int' ||
        typeName === 'bytes' ||
        typeName === 'string' ||
        typeName === 'bytes32'
      );
    }

    // Check for ElementaryTypeNameExpression
    if (node.expression && node.expression.type === 'ElementaryTypeNameExpression') {
      return true;
    }

    return false;
  }

  /**
   * Report a weak randomness issue
   */
  private reportWeakRandomness(node: any, pattern: string, context: AnalysisContext): void {
    if (!node.loc) {
      return;
    }

    const blockPropertyUsed = this.identifyBlockProperty(node);
    const propertyDescription = blockPropertyUsed ? ` using ${blockPropertyUsed}` : '';

    context.report({
      ruleId: this.metadata.id,
      severity: this.metadata.severity,
      category: this.metadata.category,
      message: `Weak randomness detected: ${pattern}${propertyDescription}. Block properties are predictable and can be manipulated by miners. Use Chainlink VRF or similar oracle-based randomness for security-critical applications.`,
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

  /**
   * Identify which block property is being used
   */
  private identifyBlockProperty(node: any): string | null {
    if (!node || typeof node !== 'object') {
      return null;
    }

    // Check for block.property
    if (node.type === 'MemberAccess') {
      if (node.expression && node.expression.type === 'Identifier') {
        if (node.expression.name === 'block') {
          if (WeakPrngRule.BLOCK_PROPERTIES.has(node.memberName)) {
            return `block.${node.memberName}`;
          }
        }
      }
    }

    // Check for 'now'
    if (node.type === 'Identifier' && node.name === 'now') {
      return 'now (deprecated)';
    }

    // Check for blockhash
    if (node.type === 'FunctionCall') {
      if (node.expression && node.expression.type === 'Identifier') {
        if (node.expression.name === 'blockhash') {
          return 'blockhash()';
        }
      }
    }

    // Recursively check sub-expressions
    const leftProp = node.left ? this.identifyBlockProperty(node.left) : null;
    if (leftProp) return leftProp;

    const rightProp = node.right ? this.identifyBlockProperty(node.right) : null;
    if (rightProp) return rightProp;

    const exprProp = node.expression ? this.identifyBlockProperty(node.expression) : null;
    if (exprProp) return exprProp;

    if (node.arguments && Array.isArray(node.arguments)) {
      for (const arg of node.arguments) {
        const argProp = this.identifyBlockProperty(arg);
        if (argProp) return argProp;
      }
    }

    return null;
  }
}
