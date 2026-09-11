import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSolid } from '@rsbuild/plugin-solid';
import { generateSW } from 'workbox-build';

const configDir = path.dirname(fileURLToPath(import.meta.url));

function lanIpv4Addresses(): string[] {
  let interfaces: ReturnType<typeof os.networkInterfaces>;
  try {
    interfaces = os.networkInterfaces();
  } catch {
    return [];
  }
  const addresses: string[] = [];
  for (const interfaceAddresses of Object.values(interfaces)) {
    for (const entry of interfaceAddresses ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses;
}

/** Phone browsers refuse HTTP on a LAN IP (not a secure context; some force HTTPS). */
function devHttpsOptions(): { key: Buffer; cert: Buffer } {
  const certDir = path.join(configDir, '.dev-certs');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');
  const hostsPath = path.join(certDir, 'hosts.txt');
  const configPath = path.join(certDir, 'openssl.cnf');
  const lanAddresses = lanIpv4Addresses();
  const hosts = ['localhost', '127.0.0.1', '::1', ...lanAddresses];
  const stamp = `${hosts.join('\n')}\n`;

  if (
    fs.existsSync(keyPath) &&
    fs.existsSync(certPath) &&
    fs.existsSync(hostsPath) &&
    fs.readFileSync(hostsPath, 'utf8') === stamp
  ) {
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  }

  fs.mkdirSync(certDir, { recursive: true });

  const altLines = [
    'DNS.1 = localhost',
    'IP.1 = 127.0.0.1',
    'IP.2 = ::1',
    ...lanAddresses.map((address, index) => `IP.${index + 3} = ${address}`),
  ];
  fs.writeFileSync(
    configPath,
    [
      '[req]',
      'distinguished_name = dn',
      'x509_extensions = v3',
      'prompt = no',
      '[dn]',
      'CN = localhost',
      '[v3]',
      'subjectAltName = @alt',
      'basicConstraints = CA:false',
      'keyUsage = digitalSignature, keyEncipherment',
      'extendedKeyUsage = serverAuth',
      '[alt]',
      ...altLines,
      '',
    ].join('\n'),
  );
  execSync(
    [
      'openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 825',
      `-config ${JSON.stringify(configPath)}`,
      '-extensions v3',
      `-keyout ${JSON.stringify(keyPath)}`,
      `-out ${JSON.stringify(certPath)}`,
    ].join(' '),
    { stdio: 'pipe' },
  );
  fs.writeFileSync(hostsPath, stamp);
  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

function disableRequestTimeouts(server: http.Server | https.Server): void {
  // Node 18+ still treats an upgraded WebSocket as an unfinished HTTP request
  // and 408s it (~60s headersTimeout, 5min requestTimeout) through the proxy.
  server.headersTimeout = 0;
  server.requestTimeout = 0;
  server.timeout = 0;
}

function wrapCreateServer<Factory extends typeof http.createServer | typeof https.createServer>(
  create: Factory,
): Factory {
  return ((...args: unknown[]) => {
    const server = (create as (...createArgs: unknown[]) => http.Server)(...args);
    disableRequestTimeouts(server);
    return server;
  }) as Factory;
}

http.createServer = wrapCreateServer(http.createServer.bind(http));
https.createServer = wrapCreateServer(https.createServer.bind(https));

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
            JSON.stringify({ version: APP_VERSION, package: APP_PACKAGE_VERSION }),
          );
          fs.copyFileSync(
            path.join(configDir, 'src/changelog/releases.json'),
            path.join(distPath, 'changelog.json'),
          );
          await generateSW({
            globDirectory: distPath,
            globPatterns: ['**/*.{js,css,woff2}'],
            globIgnores: ['**/sw.js', '**/version.json', '**/changelog.json', '**/index.html'],
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
                    maxEntries: 400,
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
  // Saving a file must not live-reload every phone on the LAN (`pnpm dev:https`).
  dev: {
    hmr: process.env.DEV_HTTPS !== '1',
    liveReload: process.env.DEV_HTTPS !== '1',
  },
  server: {
    port: 3000,
    // Phone on the same Wi-Fi can open https://<lan-ip>:3000 (`pnpm dev:https`).
    host: '0.0.0.0',
    // /join/CODE share links must serve the app shell, not 404.
    historyApiFallback: true,
    ...(process.env.DEV_HTTPS === '1' ? { https: devHttpsOptions() } : {}),
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'http://localhost:3001',
        ws: true,
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
});
