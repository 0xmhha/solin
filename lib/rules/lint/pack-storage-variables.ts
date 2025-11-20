/**
 * Pack Storage Variables Lint Rule
 *
 * Suggests packing storage variables to save storage slots
 */

import { AbstractRule } from '../abstract-rule';
import type { AnalysisContext } from '@core/types';
import { Severity, Category } from '@core/types';

/**
 * Storage variable information
 */
interface VariableInfo {
  name: string;
  size: number; // size in bytes
  line: number;
  isConstant: boolean;
  node: any;
}

/**
 * Rule that detects storage variable packing opportunities:
 * - Solidity packs storage variables into 32-byte slots
 * - Variables < 32 bytes can share slots if declared consecutively
 * - Each SSTORE costs 20,000 gas (first write) or 5,000 gas (update)
 * - Packing saves one SSTORE per slot saved (~20,000 gas deployment, ~5,000 gas per update)
 *
 * Type sizes:
 * - bool: 1 byte
 * - uint8/int8: 1 byte
 * - uint16/int16: 2 bytes
 * - uint32/int32: 4 bytes
 * - uint64/int64: 8 bytes
 * - uint128/int128: 16 bytes
 * - uint256/int256: 32 bytes
 * - address: 20 bytes
 * - bytes1-bytes32: 1-32 bytes
 */
export class PackStorageVariables extends AbstractRule {
  constructor() {
    super({
      id: 'gas/pack-storage-variables',
      category: Category.LINT,
      severity: Severity.INFO,
      title: 'Pack storage variables to save slots',
      description:
        'Detects storage variables that can be packed into fewer 32-byte slots. Each slot saved reduces SSTORE gas cost by ~20,000 (deployment) and ~5,000 per update.',
      recommendation:
        'Reorder state variables to pack smaller types together. Group uint128, uint64, uint32, uint16, uint8, bool, and address types consecutively to fit multiple variables in single storage slots.',
    });
  }

  analyze(context: AnalysisContext): void {
    this.walkAst(context.ast, context);
  }

  /**
   * Recursively walk AST to find contracts
   */
  private walkAst(node: any, context: AnalysisContext): void {
    if (!node || typeof node !== 'object') {
      return;
    }

    // Check for ContractDefinition nodes
    if (node.type === 'ContractDefinition') {
      this.checkContract(node, context);
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
   * Check contract for storage packing opportunities
   */
  private checkContract(node: any, context: AnalysisContext): void {
    if (!node.subNodes || !Array.isArray(node.subNodes)) {
      return;
    }

    // Extract storage variables
    const variables = this.extractStorageVariables(node.subNodes);

    if (variables.length === 0) {
      return;
    }

    // Simulate current storage layout
    const currentSlots = this.calculateStorageSlots(variables);

    // Find optimal packing
    const optimalSlots = this.calculateOptimalSlots(variables);

    // If we can save slots, report issue
    if (optimalSlots < currentSlots) {
      const slotsSaved = currentSlots - optimalSlots;
      const gasSaved = slotsSaved * 20000; // Approximate deployment gas saved

      // Find the first small variable that could be packed
      const firstPackableVar = variables.find(v => !v.isConstant && v.size < 32);

      if (firstPackableVar && firstPackableVar.node.loc) {
        context.report({
          ruleId: this.metadata.id,
          severity: this.metadata.severity,
          category: this.metadata.category,
          message: `Storage variables can be packed to save ${slotsSaved} slot${slotsSaved > 1 ? 's' : ''} (~${gasSaved.toLocaleString()} gas). Reorder small types (uint128, uint64, uint32, uint16, uint8, bool, address) to be consecutive.`,
          location: {
            start: {
              line: firstPackableVar.node.loc.start.line,
              column: firstPackableVar.node.loc.start.column,
            },
            end: {
              line: firstPackableVar.node.loc.end.line,
              column: firstPackableVar.node.loc.end.column,
            },
          },
        });
      }
    }
  }

  /**
   * Extract storage variables from contract
   */
  private extractStorageVariables(subNodes: any[]): VariableInfo[] {
    const variables: VariableInfo[] = [];

    for (const node of subNodes) {
      if (node.type === 'StateVariableDeclaration') {
        const varInfo = this.extractVariableInfo(node);
        if (varInfo) {
          variables.push(varInfo);
        }
      }
    }

    return variables;
  }

  /**
   * Extract variable information from declaration
   */
  private extractVariableInfo(node: any): VariableInfo | null {
    const variables = node.variables;
    if (!variables || !Array.isArray(variables) || variables.length === 0) {
      return null;
    }

    const variable = variables[0];
    if (!variable || !variable.typeName) {
      return null;
    }

    // Check if constant (constants don't use storage)
    const isConstant = variable.isDeclaredConst || variable.isImmutable;

    const size = this.getTypeSize(variable.typeName);

    // Skip if we can't determine size or it's a complex type
    if (size === null) {
      return null;
    }

    return {
      name: variable.name || 'unknown',
      size,
      line: node.loc?.start.line || 0,
      isConstant,
      node,
    };
  }

  /**
   * Get size of a type in bytes
   */
  private getTypeSize(typeName: any): number | null {
    if (!typeName || !typeName.type) {
      return null;
    }

    // Handle elementary types
    if (typeName.type === 'ElementaryTypeName') {
      return this.getElementaryTypeSize(typeName.name);
    }

    // Mappings, arrays, and structs take full slots
    if (
      typeName.type === 'Mapping' ||
      typeName.type === 'ArrayTypeName' ||
      typeName.type === 'UserDefinedTypeName'
    ) {
      return 32; // Full slot
    }

    return null;
  }

  /**
   * Get size of elementary type
   */
  private getElementaryTypeSize(name: string): number {
    // Address
    if (name === 'address') {
      return 20;
    }

    // Bool
    if (name === 'bool') {
      return 1;
    }

    // Bytes1-bytes32
    const bytesMatch = name.match(/^bytes(\d+)$/);
    if (bytesMatch) {
      return parseInt(bytesMatch[1]!, 10);
    }

    // Uint/int types
    const intMatch = name.match(/^u?int(\d+)?$/);
    if (intMatch) {
      const bits = intMatch[1] ? parseInt(intMatch[1], 10) : 256;
      return bits / 8;
    }

    // Default to full slot for unknown types
    return 32;
  }

  /**
   * Calculate number of storage slots used with current layout
   */
  private calculateStorageSlots(variables: VariableInfo[]): number {
    let slots = 0;
    let currentSlotUsed = 0;

    for (const variable of variables) {
      // Constants don't use storage
      if (variable.isConstant) {
        continue;
      }

      // Full-slot types start a new slot
      if (variable.size === 32) {
        if (currentSlotUsed > 0) {
          slots++;
          currentSlotUsed = 0;
        }
        slots++;
        continue;
      }

      // Try to fit in current slot
      if (currentSlotUsed + variable.size <= 32) {
        currentSlotUsed += variable.size;
      } else {
        // Start new slot
        slots++;
        currentSlotUsed = variable.size;
      }
    }

    // Count final slot if used
    if (currentSlotUsed > 0) {
      slots++;
    }

    return slots;
  }

  /**
   * Calculate optimal number of slots with best packing
   */
  private calculateOptimalSlots(variables: VariableInfo[]): number {
    // Filter out constants
    const storageVars = variables.filter(v => !v.isConstant);

    if (storageVars.length === 0) {
      return 0;
    }

    // Separate full-slot and packable variables
    const fullSlotVars = storageVars.filter(v => v.size === 32);
    const packableVars = storageVars.filter(v => v.size < 32);

    // Sort packable vars by size (largest first for better packing)
    packableVars.sort((a, b) => b.size - a.size);

    // Pack the packable variables optimally
    let slots = fullSlotVars.length; // Each full-slot var takes one slot
    let currentSlotUsed = 0;

    for (const variable of packableVars) {
      if (currentSlotUsed + variable.size <= 32) {
        currentSlotUsed += variable.size;
      } else {
        slots++;
        currentSlotUsed = variable.size;
      }
    }

    // Count final slot if used
    if (currentSlotUsed > 0) {
      slots++;
    }

    return slots;
  }
}
