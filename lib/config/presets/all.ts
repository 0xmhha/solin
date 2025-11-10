/**
 * All Rules Preset Configuration
 *
 * Enables all available rules (may be too strict for some projects)
 */

import { Config } from '../types';
import { recommended } from './recommended';
import { security } from './security';

export const all: Config = {
  rules: {
    // Include all rules from recommended
    ...recommended.rules,

    // Include all rules from security
    ...security.rules,

    // Additional lint rules
    'lint/no-empty-blocks': 'warning',
    'lint/no-unused-imports': 'warning',
    'lint/no-global-import': 'warning',
    'lint/explicit-types': 'warning',
    'lint/max-line-length': ['warning', { max: 120 }],
    'lint/quotes': ['warning', { prefer: 'double' }],
    'lint/indentation': ['warning', { spaces: 4 }],
    'lint/bracket-align': 'warning',
    'lint/separate-by-one-line-in-contract': 'warning',
    'lint/no-mix-tabs-and-spaces': 'error',
    'lint/no-trailing-whitespace': 'warning',

    // Documentation
    'documentation/natspec-contract': 'warning',
    'documentation/natspec-function': 'warning',
    'documentation/natspec-params': 'warning',
    'documentation/natspec-return': 'warning',

    // Performance
    'performance/no-unused-state-var': 'warning',
    'performance/prefer-constant': 'warning',
    'performance/prefer-immutable': 'warning',
    'performance/pack-variables': 'warning',
    'performance/avoid-storage-in-loops': 'warning',

    // Code Smells
    'code-smell/similar-contracts': 'warning',
    'code-smell/avoid-low-level-calls': 'warning',
    'code-smell/multiple-sends': 'warning',
    'code-smell/compiler-version': 'warning',
    'code-smell/contract-name-matches-filename': 'warning',

    // Maintainability
    'maintainability/max-complexity': ['warning', { max: 15 }],
    'maintainability/max-depth': ['warning', { max: 4 }],
    'maintainability/max-params': ['warning', { max: 5 }],
    'maintainability/avoid-tx-origin': 'error',
    'maintainability/no-complex-fallback': 'warning',
  },

  parser: {
    tolerant: false,
    sourceType: 'module',
  },

  excludedFiles: ['node_modules/**', '**/node_modules/**', 'lib/**'],
};
