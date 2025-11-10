/**
 * Recommended Preset Configuration
 *
 * Balanced set of rules for most Solidity projects
 */

import { Config } from '../types';

export const recommended: Config = {
  rules: {
    // Security Rules (High Priority)
    'security/reentrancy': 'error',
    'security/tx-origin': 'error',
    'security/delegatecall': 'warning',
    'security/selfdestruct': 'warning',
    'security/unchecked-send': 'error',
    'security/unprotected-selfdestruct': 'error',
    'security/integer-overflow': 'error',
    'security/timestamp-dependence': 'warning',
    'security/block-number-dependence': 'warning',
    'security/uninitialized-storage': 'error',

    // Best Practices
    'best-practices/external-calls': 'warning',
    'best-practices/visibility': 'error',
    'best-practices/state-mutability': 'warning',
    'best-practices/func-visibility': 'error',
    'best-practices/avoid-throw': 'error',
    'best-practices/avoid-suicide': 'error',
    'best-practices/prefer-interface': 'warning',

    // Code Quality
    'code-quality/complexity': ['warning', { max: 10 }],
    'code-quality/max-states-count': ['warning', { max: 15 }],
    'code-quality/function-max-lines': ['warning', { max: 50 }],
    'code-quality/no-unused-vars': 'warning',
    'code-quality/no-console': 'warning',

    // Naming Conventions
    'naming/contract-name-camelcase': 'warning',
    'naming/func-name-mixedcase': 'warning',
    'naming/var-name-mixedcase': 'warning',
    'naming/const-name-snakecase': 'warning',
    'naming/modifier-name-mixedcase': 'warning',
    'naming/event-name-camelcase': 'warning',

    // Gas Optimization (Basic)
    'gas-optimization/no-unused-imports': 'warning',
    'gas-optimization/prefer-calldata': 'warning',
    'gas-optimization/cache-array-length': 'warning',
  },

  parser: {
    tolerant: false,
    sourceType: 'module',
  },

  excludedFiles: ['node_modules/**', '**/node_modules/**', 'lib/**'],
};
