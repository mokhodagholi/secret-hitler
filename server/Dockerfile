FROM node:22-alpine AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_DEFAULT_TO_LATEST=0

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY bale-bot/package.json ./bale-bot/
COPY server/package.json ./server/

RUN pnpm install --frozen-lockfile --filter @secret-hitler/server...

COPY shared ./shared
COPY bale-bot ./bale-bot
COPY server ./server

RUN pnpm --filter @secret-hitler/shared build \
  && pnpm --filter bale-bot build \
  && pnpm --filter @secret-hitler/server build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_DEFAULT_TO_LATEST=0

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

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
