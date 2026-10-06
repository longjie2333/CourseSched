import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', '.weapp-vite/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.es2021,
        ...globals.node,
        ...globals.vitest,
        App: 'readonly',
        Component: 'readonly',
        Page: 'readonly',
        getCurrentPages: 'readonly',
        wx: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
