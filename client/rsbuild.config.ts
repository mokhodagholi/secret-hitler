import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSolid } from '@rsbuild/plugin-solid';

function appVersion(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    return sha || String(Date.now());
  } catch {
    return String(Date.now());
  }
}

const APP_VERSION = appVersion();

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
    {
      name: 'app-version',
      setup(api) {
        api.onAfterBuild(() => {
          fs.writeFileSync(
            path.join(api.context.distPath, 'version.json'),
            JSON.stringify({ version: APP_VERSION }),
          );
        });
      },
    },
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
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(APP_VERSION),
    },
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
