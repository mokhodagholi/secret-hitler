import { defineConfig } from '@rstest/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSolid } from '@rsbuild/plugin-solid';
import { pluginSass } from '@rsbuild/plugin-sass';

export default defineConfig({
  plugins: [
    pluginBabel({ include: /\.(?:jsx|tsx)$/ }),
    pluginSolid(),
    pluginSass(),
  ],
  testEnvironment: 'jsdom',
  setupFiles: ['./test/setup.ts'],
  // Tests live next to the components they cover; shared helpers sit in ./test.
  include: ['src/**/*.test.{ts,tsx}'],
});
