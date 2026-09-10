#!/usr/bin/env bash
# Bake the current commit SHA into the SPA and rebuild containers.
# The VPS post-receive hook checks out first, then calls this.
set -euo pipefail

cd "$(dirname "$0")/.."

APP_VERSION="$(git rev-parse --short HEAD)"
export APP_VERSION

echo "Deploying ${APP_VERSION}"
docker compose up -d --build
