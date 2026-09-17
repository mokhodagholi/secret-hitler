#!/usr/bin/env bash
# Run once ON the VPS (ssh, then this file). Creates a bare repo you can push to
# and a work tree where Docker Compose runs.
set -euo pipefail

BARE="${HOME}/secret-hitler.git"
WORK="${HOME}/secret-hitler"

git init --bare "$BARE"
mkdir -p "$WORK"

# Hook sees GIT_DIR / GIT_WORK_TREE from git; pin the work tree so checkout
# does not run inside the bare repo. Paths listed in .deploy-keep-local (host
# nginx/TLS overlays) are restored after checkout -f so a laptop push does not
# wipe them.
cat > "$BARE/hooks/post-receive" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export GIT_DIR="${BARE}"
export GIT_WORK_TREE="${WORK}"
KEEP_LIST="\${GIT_WORK_TREE}/.deploy-keep-local"

save_keep() {
  local keep_dir="\$1"
  [[ -f "\$KEEP_LIST" ]] || return 0
  while IFS= read -r rel || [[ -n "\${rel:-}" ]]; do
    [[ -z "\$rel" || "\$rel" == \#* ]] && continue
    local src="\${GIT_WORK_TREE}/\${rel}"
    if [[ -f "\$src" ]]; then
      mkdir -p "\$keep_dir/\$(dirname "\$rel")"
      cp -a "\$src" "\$keep_dir/\$rel"
    fi
  done < "\$KEEP_LIST"
}

restore_keep() {
  local keep_dir="\$1"
  [[ -f "\$KEEP_LIST" ]] || return 0
  while IFS= read -r rel || [[ -n "\${rel:-}" ]]; do
    [[ -z "\$rel" || "\$rel" == \#* ]] && continue
    local saved="\$keep_dir/\$rel"
    if [[ -f "\$saved" ]]; then
      mkdir -p "\$(dirname "\${GIT_WORK_TREE}/\${rel}")"
      cp -a "\$saved" "\${GIT_WORK_TREE}/\${rel}"
    fi
  done < "\$KEEP_LIST"
}

while read -r _oldrev _newrev ref; do
  if [[ "\$ref" != "refs/heads/master" ]]; then
    continue
  fi
  KEEP_DIR="\$(mktemp -d /tmp/deploy-keep.XXXXXX)"
  save_keep "\$KEEP_DIR"
  git checkout -f master
  restore_keep "\$KEEP_DIR"
  rm -rf "\$KEEP_DIR"
  cd "${WORK}"
  exec ./scripts/deploy.sh "\$_oldrev"
done
EOF
chmod +x "$BARE/hooks/post-receive"

USER_NAME="$(id -un)"
echo "Bare repo: ${BARE}"
echo "App dir:   ${WORK}"
echo
echo "On your laptop:"
echo "  git remote add vps ${USER_NAME}@YOUR_SERVER:secret-hitler.git"
echo "  git push -u vps master"
echo
echo "Once, copy .env and ssl/*.pem into ${WORK} (they are gitignored)."
echo "Host-only files (nginx server_name, extra compose mounts) go in ${WORK}/.deploy-keep-local,"
echo "one relative path per line; the hook restores them after each checkout."
echo "The first push will check out the app and run docker compose."
