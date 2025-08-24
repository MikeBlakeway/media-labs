// Flat-config entrypoint for ESLint v9+ that mirrors the legacy
// `.eslintrc.cjs` semantics using FlatCompat so the project can run
// without a full, immediate rewrite of the existing config.
//
// This file intentionally keeps rule semantics the same as the legacy
// config and maps `env` -> `languageOptions.globals` and
// `parserOptions` -> `languageOptions.parserOptions`.

const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  // Convert common shared extends/plugins using compat shims
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ),
  ...compat.plugins('@typescript-eslint'),

  // Project-specific configuration (mirrors .eslintrc.cjs)
  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      // Use the TypeScript parser for .ts/.tsx files
      parser: require.resolve('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      // Map legacy 'env' definitions to flat-config globals
      globals: {
        // browser
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        // node
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },

    // Rules copied from legacy .eslintrc.cjs
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
