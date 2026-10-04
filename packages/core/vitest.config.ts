import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/*.types.ts'],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 75 },
      reporter: ['text-summary', 'text'],
    },
  },
});
