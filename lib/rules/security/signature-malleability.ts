/**
 * Signature Malleability Security Rule
 *
 * Detects ECDSA signature malleability vulnerabilities that can enable replay attacks.
 * Due to elliptic curve properties, each ECDSA signature (r,s) has a corresponding
 * malleable signature (r, -s mod n) that is also valid. This allows attackers to
 * create different valid signatures for the same message.
 *
 * @example
 * // Vulnerable: No validation on s value
 * function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public {
 *   address signer = ecrecover(hash, v, r, s); // Malleable!
 * }
 *
 * // Safe: Validate s is in lower half order
 * require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0);
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

export class SignatureMalleabilityRule extends AbstractRule {
  private hasSValidation = false;
  private hasVValidation = false;
  private usesECDSALibrary = false;

  constructor() {
    super({
      id: 'security/signature-malleability',
      category: Category.SECURITY,
      severity: Severity.ERROR,
      title: 'Signature Malleability Vulnerability',
      description:
        'Detects ECDSA signature malleability that enables replay attacks. ' +
        'Each signature (r,s) has a malleable counterpart (r, -s mod n). Without proper validation, ' +
        'attackers can modify signatures to bypass replay protection. The s value must be in the ' +
        'lower half of the curve order to prevent malleability.',
      recommendation:
        'Validate signature components before ecrecover: ' +
        "(1) require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, 'Invalid s'); " +
        "(2) require(v == 27 || v == 28, 'Invalid v'); " +
        'Alternatively, use OpenZeppelin ECDSA library which includes these checks. ' +
        'Implement nonce-based replay protection. Consider EIP-712 for structured data signing.',
    });
  }

  analyze(context: AnalysisContext): void {
    // Check for ECDSA import
    this.checkECDSAImport(context.ast);
    this.walkAst(context.ast, context);
  }

  private checkECDSAImport(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'ImportDirective') {
      const path = node.path || '';
      if (path.includes('ECDSA') || path.includes('cryptography')) {
        this.usesECDSALibrary = true;
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkECDSAImport(child));
      } else if (value && typeof value === 'object') {
        this.checkECDSAImport(value);
      }
    }
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
        value.forEach((child) => this.walkAst(child, context));
      } else if (value && typeof value === 'object') {
        this.walkAst(value, context);
      }
    }
  }

  private checkFunction(node: any, context: AnalysisContext): void {
    if (!node.body) return;

    // Skip if using ECDSA library
    if (this.usesECDSALibrary) {
      // Check if function uses ECDSA.recover or similar
      if (this.usesECDSARecover(node.body)) {
        return;
      }
    }

    // Reset per-function state
    this.hasSValidation = false;
    this.hasVValidation = false;

    // Check for ecrecover usage
    const ecrecoverCalls = this.findEcrecoverCalls(node.body);
    if (ecrecoverCalls.length === 0) return;

    // Check for s and v validation
    this.checkValidations(node.body);

    // Report if ecrecover is used without proper validation
    for (const call of ecrecoverCalls) {
      if (!this.hasSValidation || !this.hasVValidation) {
        this.reportIssue(call, context);
      }
    }
  }

  private usesECDSARecover(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // Check for ECDSA.recover or hash.recover patterns
    if (node.type === 'MemberAccess' && node.memberName === 'recover') {
      return true;
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        if (value.some((child) => this.usesECDSARecover(child))) {
          return true;
        }
      } else if (value && typeof value === 'object') {
        if (this.usesECDSARecover(value)) {
          return true;
        }
      }
    }
    return false;
  }

  private findEcrecoverCalls(node: any): any[] {
    const calls: any[] = [];
    if (!node || typeof node !== 'object') return calls;

    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      if (expr?.type === 'Identifier' && expr.name === 'ecrecover') {
        calls.push(node);
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => calls.push(...this.findEcrecoverCalls(child)));
      } else if (value && typeof value === 'object') {
        calls.push(...this.findEcrecoverCalls(value));
      }
    }

    return calls;
  }

  private checkValidations(node: any): void {
    if (!node || typeof node !== 'object') return;

    // Check for require statements validating s and v
    if (node.type === 'FunctionCall') {
      const expr = node.expression;
      if (expr?.type === 'Identifier' && expr.name === 'require') {
        const condition = node.arguments?.[0];
        if (condition) {
          // Check for s validation (comparing to secp256k1n/2)
          if (this.isSValidation(condition)) {
            this.hasSValidation = true;
          }
          // Check for v validation (v == 27 || v == 28)
          if (this.isVValidation(condition)) {
            this.hasVValidation = true;
          }
        }
      }
    }

    for (const key in node) {
      if (key === 'loc' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => this.checkValidations(child));
      } else if (value && typeof value === 'object') {
        this.checkValidations(value);
      }
    }
  }

  private isSValidation(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // Look for comparisons with the magic number (secp256k1 curve order / 2)
    // 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
    if (node.type === 'BinaryOperation') {
      const op = node.operator;
      if (op === '<=' || op === '<' || op === '==') {
        // Check if comparing 's' variable to the threshold
        const left = this.extractVariableName(node.left);
        const right = this.extractNumber(node.right);
        if (left === 's' && right && right.includes('7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0')) {
          return true;
        }
      }
    }

    return false;
  }

  private isVValidation(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // Look for: v == 27 || v == 28
    if (node.type === 'BinaryOperation' && node.operator === '||') {
      const left = this.isVComparison(node.left);
      const right = this.isVComparison(node.right);
      return left && right;
    }

    return this.isVComparison(node);
  }

  private isVComparison(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    if (node.type === 'BinaryOperation' && node.operator === '==') {
      const left = this.extractVariableName(node.left);
      const right = this.extractNumber(node.right);
      if (left === 'v' && (right === '27' || right === '28')) {
        return true;
      }
    }

    return false;
  }

  private extractVariableName(node: any): string | null {
    if (!node) return null;
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'FunctionCall') {
      // uint256(s) pattern
      const expr = node.expression;
      if (expr?.type === 'ElementaryTypeName' || expr?.type === 'ElementaryTypeNameExpression') {
        return this.extractVariableName(node.arguments?.[0]);
      }
    }
    return null;
  }

  private extractNumber(node: any): string | null {
    if (!node) return null;
    if (node.type === 'NumberLiteral') {
      return String(node.number || node.value || '');
    }
    if (node.type === 'HexLiteral' || node.type === 'HexNumber') {
      return String(node.number || node.value || '');
    }
    return null;
  }

  private reportIssue(node: any, context: AnalysisContext): void {
    if (!node.loc) return;

    let message = 'Signature malleability vulnerability: ecrecover() used without proper validation. ';

    if (!this.hasSValidation) {
      message +=
        "Missing 's' value validation. The signature 's' component must be in the lower half of the curve order " +
        "to prevent malleability. Add: require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, 'Invalid s'). ";
    }

    if (!this.hasVValidation) {
      message +=
        "Missing 'v' value validation. The recovery identifier 'v' must be 27 or 28. " +
        "Add: require(v == 27 || v == 28, 'Invalid v'). ";
    }

    message +=
      'Alternatively, use OpenZeppelin ECDSA library which includes these validations. ' +
      'Without these checks, attackers can create alternative valid signatures enabling replay attacks.';

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
