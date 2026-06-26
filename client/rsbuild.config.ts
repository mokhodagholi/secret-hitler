import path from 'node:path';
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSolid } from '@rsbuild/plugin-solid';

export default defineConfig({
  // pluginSolid only injects babel-preset-solid into pluginBabel — without
  // pluginBabel registered, rsbuild's default SWC transform compiles JSX to
  // React.createElement instead of Solid's DOM templates.
  plugins: [
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
    }),
    pluginSolid(),
    pluginSass(),
  ],
  html: {
    template: './index.html',
  },
  tools: {
    // Scoped class names read as fileName-styleName; [name] alone keeps the
    // ".module" segment, so derive the bare file name ourselves.
    cssLoader(config) {
      if (typeof config.modules === 'object') {
        config.modules.getLocalIdent = (context, _localIdentName, localName) => {
          const fileName = path
            .basename(context.resourcePath)
            .replace(/\.module\.\w+$/, '');
          return `${fileName}-${localName}`;
        };
      }
    },
  },
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  server: {
    port: 3000,
    // /join/CODE share links must serve the app shell, not 404.
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
