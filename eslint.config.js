import eslint from '@eslint/js';
import sdl from '@microsoft/eslint-plugin-sdl';
import vitest from '@vitest/eslint-plugin';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import nodePlugin from 'eslint-plugin-n';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  security.configs.recommended,
  unicorn.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'vitest.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'no-unsanitized': noUnsanitized,
      '@microsoft/sdl': sdl,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      'import-x': importX,
      n: nodePlugin,
    },
    rules: {
      // Console logging
      'no-console': 'warn',

      // TypeScript strict rules
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Import sorting and organization
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',

      // Node.js rules
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-process-exit': 'error',

      // Security rules from no-unsanitized
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',

      // Microsoft SDL rules
      '@microsoft/sdl/no-inner-html': 'error',
      '@microsoft/sdl/no-document-write': 'error',
      '@microsoft/sdl/no-insecure-random': 'error',
      '@microsoft/sdl/no-insecure-url': 'warn',

      // Enabled - CLI file access points have targeted disables with justification
      'security/detect-non-literal-fs-filename': 'error',

      // Enable detect-non-literal-regexp (no dynamic regexes in codebase)
      'security/detect-non-literal-regexp': 'error',

      // Enable detect-child-process (audited uses are safe execFile with hardcoded commands)
      'security/detect-child-process': 'error',

      // Unicorn rule adjustments
      'unicorn/no-null': 'off', // APIs return null, this is too strict
      'unicorn/no-process-exit': 'off', // Already have n/no-process-exit
      'unicorn/prevent-abbreviations': 'off', // Too noisy for CLI args like 'repo', 'pr', 'env'
      'unicorn/no-array-reduce': 'off', // Reduce is fine for some use cases
      'unicorn/no-array-for-each': 'off', // forEach is acceptable
      'unicorn/no-hex-escape': 'off', // Hex escapes are clearer for ANSI color codes
      'unicorn/escape-case': 'off', // Allow lowercase hex escapes for ANSI codes
      'unicorn/prefer-code-point': 'off', // charCodeAt is fine for ASCII handling
      'unicorn/no-negated-condition': 'off', // Conflicts with guard clause pattern (early returns)
      'unicorn/prefer-ternary': 'off', // if/else with comments is often clearer
      'unicorn/filename-case': ['error', { case: 'kebabCase' }], // Enforce kebab-case for files
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '!eslint.config.js'],
  },
  {
    files: ['src/test/**/*.ts'],
    plugins: { vitest },
    rules: {
      // Vitest recommended rules
      ...vitest.configs.recommended.rules,

      // Disable import-x/no-cycle due to resolver compatibility issues with MSW
      'import-x/no-cycle': 'off',
      // Mock factory functions have complex inferred return types
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // mockResolvedValue(undefined) is needed for void return types
      'unicorn/no-useless-undefined': 'off',
    },
  },
]);
