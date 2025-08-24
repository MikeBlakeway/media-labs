export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
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
    plugins: {
      // make plugin names available to flat config
      import: import('eslint-plugin-import'),
      '@typescript-eslint': import('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      // Basic rules for any JS/TS files in root
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'error',
      // import ordering for cross-repo consistency
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
    },
  },

  // UI app overrides — enable React/Next rules for the UI only
  {
    files: ['apps/ui/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      react: import('eslint-plugin-react'),
    },
    languageOptions: {
      ecmaFeatures: { jsx: true },
    },
    rules: {
      // allow JSX-specific rules to be enabled at package level
    },
  },
];
