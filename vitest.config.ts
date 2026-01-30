import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/test/**',
        'src/**/*.test.ts',
        'src/**/types.ts', // Type-only files
      ],
      // Coverage thresholds - Phase 5 complete: All CLI commands, API tests
      // Current: ~70% statements, ~67% branches, ~77% functions, ~70% lines
      thresholds: {
        statements: 68,
        branches: 65,
        functions: 75,
        lines: 68,
      },
    },
  },
});
