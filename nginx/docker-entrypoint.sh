#!/bin/sh
set -e

SSL_DIR=/etc/nginx/ssl

if [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
  echo "Missing TLS files. Copy them into the project's ssl/ directory:"
  echo "  ssl/fullchain.pem"
  echo "  ssl/privkey.pem"
  exit 1
fi

exec nginx -g "daemon off;"
