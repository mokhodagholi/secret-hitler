#!/usr/bin/env bash
# Run once ON the VPS (ssh, then this file). Creates a bare repo you can push to
# and a work tree where Docker Compose runs.
set -euo pipefail

BARE="${HOME}/secret-hitler.git"
WORK="${HOME}/secret-hitler"

git init --bare "$BARE"
mkdir -p "$WORK"

# Hook sees GIT_DIR / GIT_WORK_TREE from git; pin the work tree so checkout
# does not run inside the bare repo.
cat > "$BARE/hooks/post-receive" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export GIT_DIR="${BARE}"
export GIT_WORK_TREE="${WORK}"
while read -r _oldrev _newrev ref; do
  if [[ "\$ref" != "refs/heads/master" ]]; then
    continue
  fi
  git checkout -f master
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
echo "The first push will check out the app and run docker compose."
