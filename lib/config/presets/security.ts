/**
 * Security Preset Configuration
 *
 * Comprehensive security-focused rules for auditing and security-critical projects
 */

import { Config } from '../types';

export const security: Config = {
  rules: {
    // Reentrancy
    'security/reentrancy': 'error',
    'security/reentrancy-benign': 'warning',
    'security/reentrancy-no-eth': 'warning',
    'security/reentrancy-events': 'warning',

    // Access Control
    'security/tx-origin': 'error',
    'security/unprotected-selfdestruct': 'error',
    'security/unprotected-upgrade': 'error',
    'security/arbitrary-send': 'error',
    'security/controlled-delegatecall': 'error',

    // State Management
    'security/uninitialized-storage': 'error',
    'security/uninitialized-state': 'error',
    'security/uninitialized-local': 'error',
    'security/storage-array': 'warning',

    // Arithmetic
    'security/integer-overflow': 'error',
    'security/divide-before-multiply': 'warning',
    'security/weak-randomness': 'error',

    // External Calls
    'security/unchecked-send': 'error',
    'security/unchecked-lowlevel': 'warning',
    'security/delegatecall': 'error',
    'security/delegatecall-loop': 'error',

    // Denial of Service
    'security/costly-loop': 'warning',
    'security/msg-value-loop': 'error',
    'security/calls-loop': 'warning',

    // Block Variables
    'security/timestamp-dependence': 'error',
    'security/block-number-dependence': 'error',
    'security/blockhash-usage': 'warning',

    // Visibility
    'security/locked-ether': 'warning',
    'security/function-default-visibility': 'error',
    'security/state-variable-default-visibility': 'error',

    // Code Injection
    'security/assembly-usage': 'warning',
    'security/low-level-calls': 'warning',
    'security/inline-assembly': 'warning',

    // Deprecated
    'security/selfdestruct': 'warning',
    'security/avoid-suicide': 'error',
    'security/avoid-throw': 'error',
    'security/avoid-sha3': 'warning',
    'security/avoid-call-value': 'error',

    // Best Practices
    'security/missing-zero-check': 'warning',
    'security/ether-strict-equality': 'warning',
    'security/assert-state-change': 'warning',
    'security/requires-in-loops': 'warning',

    // Shadowing
    'security/shadowing-abstract': 'warning',
    'security/shadowing-builtin': 'error',
    'security/shadowing-local': 'warning',
    'security/shadowing-state': 'error',

    // Events
    'security/events-access': 'warning',
    'security/events-maths': 'warning',

    // Permissions
    'security/protected-vars': 'error',
    'security/suicidal': 'error',
  },

  parser: {
    tolerant: false,
    sourceType: 'module',
  },
};
