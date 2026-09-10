#!/usr/bin/env bash
# Bake the current commit SHA into the SPA and rebuild containers.
# The VPS post-receive hook checks out first, then calls this.
set -euo pipefail

cd "$(dirname "$0")/.."

# The VPS work tree is a checkout of the sibling bare repo, so it has no .git.
# The post-receive hook already exports GIT_DIR; this covers a manual retry.
if [[ ! -e .git ]]; then
  if [[ -d "${HOME}/secret-hitler.git" ]]; then
    export GIT_DIR="${HOME}/secret-hitler.git"
    export GIT_WORK_TREE="$(pwd)"
  elif [[ -d ../secret-hitler.git ]]; then
    export GIT_DIR="$(cd ../secret-hitler.git && pwd)"
    export GIT_WORK_TREE="$(pwd)"
  fi
fi

APP_VERSION="$(git rev-parse --short HEAD)"
export APP_VERSION

echo "Deploying ${APP_VERSION}"
docker compose up -d --build
