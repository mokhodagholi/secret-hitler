FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN npm install -g pnpm@11.25.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY bale-bot/package.json ./bale-bot/
COPY server/package.json ./server/

RUN pnpm install --frozen-lockfile --filter @secret-hitler/server...

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

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY bale-bot/package.json ./bale-bot/
COPY server/package.json ./server/

RUN pnpm install --frozen-lockfile --filter @secret-hitler/server... --prod

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/bale-bot/dist ./bale-bot/dist
COPY --from=build /app/server/dist ./server/dist
COPY server/drizzle ./server/drizzle

WORKDIR /app/server
EXPOSE 3001
CMD ["node", "dist/index.js"]
