import { defineConfig } from '@rsbuild/core';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSolid } from '@rsbuild/plugin-solid';

export default defineConfig({
  plugins: [pluginSolid(), pluginSass()],
  html: {
    template: './index.html',
  },
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
