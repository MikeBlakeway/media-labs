export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      'apps/**', // Apps have their own configs
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      // Basic rules for any JS/TS files in root
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'error',
    },
  },

  // UI app overrides — enable React/Next rules for the UI only
  // apps/ui has its own ESLint config (eslint-config-next). Keep UI-specific rules in the package.
];
