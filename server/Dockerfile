# mediasoup's prebuilt worker is glibc. Alpine musl cannot run it (status 127).
# Debian can, but Docker seccomp blocks io_uring so postinstall treats the
# binary as invalid (status 1) and tries to compile via PyPI. Fetch the worker
# ourselves and skip that compile.
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
# Keep in sync with pnpm-lock.yaml mediasoup.
ENV MEDIASOUP_WORKER_VERSION=3.26.0
ENV MEDIASOUP_WORKER_BIN=/usr/local/bin/mediasoup-worker
ENV MEDIASOUP_DISABLE_LIBURING=true

RUN npm install -g pnpm@11.25.0

# Node 22 has fetch; slim already has tar. Skip mediasoup postinstall compile.
RUN node --input-type=module <<'EOF'
import { chmod, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';

const exec = promisify(execFile);
const version = process.env.MEDIASOUP_WORKER_VERSION;
const kernel = os.release().split('.')[0];
const name = `mediasoup-worker-${version}-${os.platform()}-${os.arch()}-kernel${kernel}.tgz`;
const url = `https://github.com/versatica/mediasoup/releases/download/${version}/${name}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`${url} -> ${res.status}`);
await writeFile('/tmp/mediasoup-worker.tgz', Buffer.from(await res.arrayBuffer()));
await exec('tar', ['-xzf', '/tmp/mediasoup-worker.tgz', '-C', '/usr/local/bin']);
await chmod(process.env.MEDIASOUP_WORKER_BIN, 0o755);
EOF

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY bale-bot/package.json ./bale-bot/
COPY server/package.json ./server/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @secret-hitler/server...

COPY shared ./shared
COPY bale-bot ./bale-bot
COPY server ./server
COPY tsconfig.base.json ./

RUN pnpm --filter @secret-hitler/shared build \
  && pnpm --filter bale-bot build \
  && pnpm --filter @secret-hitler/server build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV MEDIASOUP_WORKER_BIN=/usr/local/bin/mediasoup-worker
ENV MEDIASOUP_DISABLE_LIBURING=true

RUN npm install -g pnpm@11.25.0
COPY --from=build /usr/local/bin/mediasoup-worker /usr/local/bin/mediasoup-worker

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY bale-bot/package.json ./bale-bot/
COPY server/package.json ./server/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @secret-hitler/server... --prod

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/bale-bot/dist ./bale-bot/dist
COPY --from=build /app/server/dist ./server/dist
COPY server/drizzle ./server/drizzle

WORKDIR /app/server
EXPOSE 3001
CMD ["node", "dist/index.js"]
