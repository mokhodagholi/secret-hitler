import { defineConfig } from '@rstest/core';

export default defineConfig({
  // Tests live next to the code they cover; shared helpers sit in ./test.
  include: ['src/**/*.test.ts'],
});
