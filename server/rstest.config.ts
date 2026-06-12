import { defineConfig } from '@rstest/core';

export default defineConfig({
  // Unit tests sit beside their module; cross-cutting suites live in ./test.
  include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
});
