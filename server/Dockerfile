FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN npm install -g pnpm@11.25.0
# Official Alpine CDN TLS often fails on the VPS. apk still verifies signed
# packages, so HTTP + Tehran / ParsPack mirrors are enough for the mediasoup toolchain.
RUN set -eu; \
    alpine_version=$(cut -d. -f1,2 /etc/alpine-release); \
    installed=0; \
    for mirror in \
      http://dl-cdn.alpinelinux.org/alpine \
      http://mirrors.pardisco.co/alpine \
      http://mirror.mobinhost.com/alpine \
      https://repo.abrha.net/alpine \
      http://uk.alpinelinux.org/alpine; do \
      printf '%s/v%s/main\n%s/v%s/community\n' \
        "$mirror" "$alpine_version" "$mirror" "$alpine_version" \
        > /etc/apk/repositories; \
      if apk add --no-cache python3 make g++ linux-headers; then \
        installed=1; \
        break; \
      fi; \
    done; \
    test "$installed" -eq 1

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

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN npm install -g pnpm@11.25.0
RUN set -eu; \
    alpine_version=$(cut -d. -f1,2 /etc/alpine-release); \
    installed=0; \
    for mirror in \
      http://dl-cdn.alpinelinux.org/alpine \
      http://mirrors.pardisco.co/alpine \
      http://mirror.mobinhost.com/alpine \
      https://repo.abrha.net/alpine \
      http://uk.alpinelinux.org/alpine; do \
      printf '%s/v%s/main\n%s/v%s/community\n' \
        "$mirror" "$alpine_version" "$mirror" "$alpine_version" \
        > /etc/apk/repositories; \
      if apk add --no-cache python3 make g++ linux-headers; then \
        installed=1; \
        break; \
      fi; \
    done; \
    test "$installed" -eq 1

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
