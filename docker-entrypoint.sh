#!/bin/sh
set -eu

MAX_RETRIES=${DB_MIGRATION_RETRIES:-20}
SLEEP_SECONDS=${DB_MIGRATION_SLEEP_SECONDS:-3}
RETRY_COUNT=1

until pnpm prisma migrate deploy; do
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "Prisma migration failed after $MAX_RETRIES attempts."
    exit 1
  fi

  echo "Migration attempt $RETRY_COUNT failed. Retrying in $SLEEP_SECONDS seconds..."
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep "$SLEEP_SECONDS"
done

exec node dist/src/main
