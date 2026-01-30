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
      // Coverage thresholds - updated after Stage 7 completion
      // Current baseline: ~11% statements, ~10% branches, ~20% functions, ~11% lines
      thresholds: {
        statements: 10,
        branches: 8,
        functions: 18,
        lines: 10,
      },
    },
  },
});
