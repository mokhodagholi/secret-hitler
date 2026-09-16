#!/bin/sh
# Dump Postgres on a fixed interval and post the dump + host .env to a Bale
# chat via the bot API. Runs inside the db-backup compose service
# (postgres:16-alpine + curl). Compose mounts the work-tree .env at ENV_FILE.
#
# Required env: POSTGRES_*, BALE_BOT_TOKEN, BALE_BACKUP_CHAT_ID
# Optional: BACKUP_INTERVAL_SECONDS (default 900), BALE_API_BASE, ENV_FILE
set -eu

INTERVAL="${BACKUP_INTERVAL_SECONDS:-900}"
API_BASE="${BALE_API_BASE:-https://tapi.bale.ai}"
USER="${POSTGRES_USER:-secret_hitler}"
DB="${POSTGRES_DB:-secret_hitler}"
HOST="${POSTGRES_HOST:-postgres}"
ENV_FILE="${ENV_FILE:-/backup-env/.env}"

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

# POST one file to BALE_BACKUP_CHAT_ID. $1=path $2=upload filename $3=mime $4=caption
send_document() {
  path="$1"
  filename="$2"
  mime="$3"
  caption="$4"
  url="${API_BASE}/bot${BALE_BOT_TOKEN}/sendDocument"
  size="$(wc -c <"$path" | tr -d ' ')"

  log "sending ${filename} (${size} bytes) to chat ${BALE_BACKUP_CHAT_ID}"
  response="$(curl -sS -X POST "$url" \
    -F "chat_id=${BALE_BACKUP_CHAT_ID}" \
    -F "document=@${path};filename=${filename};type=${mime}" \
    -F "caption=${caption}")"

  compact="$(printf '%s' "$response" | tr -d '[:space:]')"
  case "$compact" in
    *'"ok":true'*)
      log "sent ${filename} ok"
      return 0
      ;;
    *)
      log "send ${filename} failed: ${response}"
      return 1
      ;;
  esac
}

dump_and_send() {
  if [ -z "${BALE_BOT_TOKEN:-}" ] || [ -z "${BALE_BACKUP_CHAT_ID:-}" ]; then
    log "skip: set BALE_BOT_TOKEN and BALE_BACKUP_CHAT_ID to enable backups"
    return 0
  fi

  stamp="$(date -u +%Y%m%d-%H%M%S)"
  # Plain SQL + gzip: portable, and avoids TTY corruption of custom dumps.
  outfile="/tmp/secret-hitler-${stamp}.sql.gz"
  env_out="/tmp/secret-hitler-${stamp}.env"

  log "dumping ${DB}@${HOST} → ${outfile}"
  # No TTY: never pipe through `docker exec -t` or the file corrupts.
  pg_dump \
    --host="$HOST" \
    --username="$USER" \
    --dbname="$DB" \
    --no-owner \
    --no-acl \
    | gzip -c >"$outfile"

  size="$(wc -c <"$outfile" | tr -d ' ')"
  send_document \
    "$outfile" \
    "$(basename "$outfile")" \
    "application/gzip" \
    "secret-hitler backup ${stamp} (${size} bytes)" || {
    rm -f "$outfile"
    return 1
  }
  rm -f "$outfile"

  if [ ! -f "$ENV_FILE" ]; then
    log "skip .env: ${ENV_FILE} missing (mount work-tree .env into the container)"
    return 0
  fi

  # Copy so the upload name is timestamped and pairs with the dump above.
  cp "$ENV_FILE" "$env_out"
  send_document \
    "$env_out" \
    "$(basename "$env_out")" \
    "text/plain" \
    "secret-hitler .env ${stamp}" || {
    rm -f "$env_out"
    return 1
  }
  rm -f "$env_out"
}

log "db-backup loop every ${INTERVAL}s"
while true; do
  if ! dump_and_send; then
    log "backup attempt failed; will retry after interval"
  fi
  sleep "$INTERVAL"
done
