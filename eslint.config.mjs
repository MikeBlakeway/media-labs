export default [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      'apps/**', // Apps have their own configs
      'services/**' // Services are Python, not JS/TS
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
        exports: 'readonly'
      }
    },
    rules: {
      // Basic rules for any JS/TS files in root
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'error'
    }
  }
]