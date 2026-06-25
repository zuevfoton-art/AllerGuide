#!/usr/bin/env bash
# Configure Postgres env for Replit Deploy (managed Neon / Helium).
# Source from deploy build and production run — do not execute directly.

if [ -z "${DATABASE_URL:-}" ]; then
  return 0 2>/dev/null || exit 0
fi

# Managed Postgres on Replit (Neon legacy or Helium): TLS + no prepared statements on pooled URL.
case "${DATABASE_URL}" in
  *neon.tech*|*helium*)
    export DB_SSL="${DB_SSL:-require}"
    export DB_PREPARE="${DB_PREPARE:-false}"
    ;;
esac

# Drizzle migrations need the direct (unpooled) endpoint when only pooled URL is injected.
if [ -z "${DIRECT_DATABASE_URL:-}" ] && [[ "${DATABASE_URL}" == *"-pooler"* ]]; then
  export DIRECT_DATABASE_URL="${DATABASE_URL//-pooler/}"
  echo "Derived DIRECT_DATABASE_URL from pooled DATABASE_URL for migrations."
fi
