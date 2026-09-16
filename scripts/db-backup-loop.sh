#!/bin/sh
# Dump Postgres on a fixed interval and post the file to a Bale chat via the
# bot API. Runs inside the db-backup compose service (postgres:16-alpine + curl).
#
# Required env: POSTGRES_*, BALE_BOT_TOKEN, BALE_BACKUP_CHAT_ID
# Optional: BACKUP_INTERVAL_SECONDS (default 900), BALE_API_BASE
set -eu

INTERVAL="${BACKUP_INTERVAL_SECONDS:-900}"
API_BASE="${BALE_API_BASE:-https://tapi.bale.ai}"
USER="${POSTGRES_USER:-secret_hitler}"
DB="${POSTGRES_DB:-secret_hitler}"
HOST="${POSTGRES_HOST:-postgres}"

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

dump_and_send() {
  if [ -z "${BALE_BOT_TOKEN:-}" ] || [ -z "${BALE_BACKUP_CHAT_ID:-}" ]; then
    log "skip: set BALE_BOT_TOKEN and BALE_BACKUP_CHAT_ID to enable backups"
    return 0
  fi

  stamp="$(date -u +%Y%m%d-%H%M%S)"
  # Plain SQL + gzip: portable, and avoids TTY corruption of custom dumps.
  outfile="/tmp/secret-hitler-${stamp}.sql.gz"

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
  caption="secret-hitler backup ${stamp} (${size} bytes)"
  url="${API_BASE}/bot${BALE_BOT_TOKEN}/sendDocument"

  log "sending ${outfile} (${size} bytes) to chat ${BALE_BACKUP_CHAT_ID}"
  response="$(curl -sS -X POST "$url" \
    -F "chat_id=${BALE_BACKUP_CHAT_ID}" \
    -F "document=@${outfile};filename=$(basename "$outfile");type=application/gzip" \
    -F "caption=${caption}")"

  rm -f "$outfile"

  compact="$(printf '%s' "$response" | tr -d '[:space:]')"
  case "$compact" in
    *'"ok":true'*)
      log "sent ok"
      ;;
    *)
      log "send failed: ${response}"
      return 1
      ;;
  esac
}

log "db-backup loop every ${INTERVAL}s"
while true; do
  if ! dump_and_send; then
    log "backup attempt failed; will retry after interval"
  fi
  sleep "$INTERVAL"
done
