FROM node:22-alpine AS build
WORKDIR /app

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_DEFAULT_TO_LATEST=0

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/

RUN pnpm install --frozen-lockfile --filter @secret-hitler/client...

COPY shared ./shared
COPY client ./client

RUN pnpm --filter @secret-hitler/shared build \
  && pnpm --filter @secret-hitler/client build

FROM nginx:1.27-alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80 443
ENTRYPOINT ["/docker-entrypoint.sh"]
