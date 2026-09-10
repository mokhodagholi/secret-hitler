import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSolid } from '@rsbuild/plugin-solid';
import { generateSW } from 'workbox-build';

const configDir = path.dirname(fileURLToPath(import.meta.url));

function appVersion(): string {
  const fromEnv = process.env.APP_VERSION?.trim();
  if (fromEnv) return fromEnv;
  try {
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    return sha || 'dev';
  } catch {
    return 'dev';
  }
}

function packageVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(configDir, 'package.json'), 'utf8')) as {
    version: string;
  };
  return pkg.version;
}

const APP_VERSION = appVersion();
const APP_PACKAGE_VERSION = packageVersion();

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
        api.onAfterBuild(async () => {
          const distPath = api.context.distPath;
          fs.writeFileSync(
            path.join(distPath, 'version.json'),
            JSON.stringify({ version: APP_VERSION }),
          );
          await generateSW({
            globDirectory: distPath,
            globPatterns: ['**/*.{js,css,woff2}'],
            globIgnores: ['**/sw.js', '**/version.json', '**/index.html'],
            swDest: path.join(distPath, 'sw.js'),
            skipWaiting: false,
            clientsClaim: true,
            cleanupOutdatedCaches: true,
            inlineWorkboxRuntime: true,
            sourcemap: false,
            runtimeCaching: [
              {
                urlPattern: ({ request }) =>
                  request.mode === 'navigate' || request.destination === 'document',
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'pages',
                  networkTimeoutSeconds: 3,
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                urlPattern: /\.(?:mp3|webp|png|jpe?g|svg|woff2)$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'assets',
                  cacheableResponse: { statuses: [200] },
                  expiration: {
                    maxEntries: 250,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                  },
                },
              },
            ],
          });
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
      'import.meta.env.APP_PACKAGE_VERSION': JSON.stringify(APP_PACKAGE_VERSION),
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
