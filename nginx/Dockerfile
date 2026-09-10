FROM node:22-alpine AS build
WORKDIR /app

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

RUN npm install -g pnpm@11.25.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/

RUN pnpm install --frozen-lockfile --filter @secret-hitler/client...

COPY shared ./shared
COPY client ./client
COPY tsconfig.base.json ./

RUN pnpm --filter @secret-hitler/shared build \
  && pnpm --filter @secret-hitler/client build

FROM nginx:1.27-alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80 443
ENTRYPOINT ["/docker-entrypoint.sh"]
