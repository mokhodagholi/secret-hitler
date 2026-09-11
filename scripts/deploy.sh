#!/usr/bin/env bash
# Bake the current commit SHA into the SPA and rebuild only images whose
# source changed. The VPS post-receive hook checks out first, then calls this
# (optionally with the previous revision as $1).
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
CURRENT="$(git rev-parse HEAD)"
STATE_FILE=".deployed-revision"
ZERO="0000000000000000000000000000000000000000"

PREV="${1:-}"
if [[ -z "$PREV" && -f "$STATE_FILE" ]]; then
  PREV="$(<"$STATE_FILE")"
fi

echo "Deploying ${APP_VERSION}"

rebuild_all=false
if [[ -z "$PREV" || "$PREV" == "$ZERO" ]] || ! git cat-file -e "${PREV}^{commit}" 2>/dev/null; then
  rebuild_all=true
fi

if [[ "$rebuild_all" == true ]]; then
  echo "No previous revision; rebuilding all images"
  docker compose up -d --build
  printf '%s\n' "$CURRENT" > "$STATE_FILE"
  exit 0
fi

CHANGED="$(git diff --name-only "$PREV" "$CURRENT")"
if [[ -z "$CHANGED" ]]; then
  echo "No file changes; skipping image rebuild"
  docker compose up -d
  printf '%s\n' "$CURRENT" > "$STATE_FILE"
  exit 0
fi

needs_nginx=false
needs_server=false

while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  case "$path" in
    client/*|nginx/*|shared/*|package.json|pnpm-lock.yaml|pnpm-workspace.yaml|tsconfig.base.json|.dockerignore)
      needs_nginx=true
      ;;
  esac
  case "$path" in
    server/*|bale-bot/*|shared/*|package.json|pnpm-lock.yaml|pnpm-workspace.yaml|tsconfig.base.json|.dockerignore)
      needs_server=true
      ;;
  esac
done <<< "$CHANGED"

to_build=()
if [[ "$needs_nginx" == true ]]; then
  to_build+=(nginx)
fi
if [[ "$needs_server" == true ]]; then
  to_build+=(server)
fi

if [[ ${#to_build[@]} -eq 0 ]]; then
  echo "Changes do not affect images; skipping rebuild"
  docker compose up -d
else
  echo "Rebuilding: ${to_build[*]}"
  docker compose build "${to_build[@]}"
  docker compose up -d
fi

printf '%s\n' "$CURRENT" > "$STATE_FILE"
