import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
})

const eslintConfig = [
  {
    ignores: ['.next/**', 'cache/**', 'dist/**', 'build/**', 'out/**']
  },
  ...compat.config({
    extends: ['next/core-web-vitals', 'prettier'],
    plugins: ['import', '@typescript-eslint'],
    settings: {
      next: {
        rootDir: 'apps/web/'
      }
    },
    rules: {
      'import/no-unresolved': 'error',
      // Next.js rule expecting a `pages/` dir can be noisy for App Router projects.
      // Disable it here because this project uses the `app/` router and custom root.
      // The Next ESLint plugin registers rules under the `@next/next` plugin id,
      // so disable both variants to be safe across plugin versions.
      'next/no-html-link-for-pages': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Built-in imports (come from NodeJS native) go first
            'external', // <- External imports
            'internal', // <- Absolute imports
            ['sibling', 'parent'], // <- Relative imports, the sibling and parent types they can be mingled together
            'index',
            'object',
            'type'
          ],
          'newlines-between': 'always',
          alphabetize: {
            /* sort in ascending order. Options: ["ignore", "asc", "desc"] */
            order: 'asc',
            /* ignore case. Options: [true, false] */
            caseInsensitive: true
          }
        }
      ]
    }
  })
]

export default eslintConfig
