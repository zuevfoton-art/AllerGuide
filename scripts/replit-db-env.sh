#!/usr/bin/env bash
# Configure Postgres env for Replit Deploy (Helium or legacy Neon).
# Source from deploy build and production run — do not execute directly.

if [ -z "${DATABASE_URL:-}" ]; then
  return 0 2>/dev/null || exit 0
fi

# Respect sslmode= in the URL. Replit Helium looks like:
#   postgresql://postgres:password@helium/heliumdb?sslmode=disable
# Do NOT force DB_SSL=require on Helium — it breaks the connection.

if [[ "${DATABASE_URL}" == *"sslmode=disable"* ]]; then
  export DB_SSL="${DB_SSL:-disable}"
elif [[ "${DATABASE_URL}" == *"neon.tech"* ]] || [[ "${DATABASE_URL}" == *"-pooler"* ]]; then
  export DB_SSL="${DB_SSL:-require}"
  export DB_PREPARE="${DB_PREPARE:-false}"
fi

# Drizzle migrations need the direct (unpooled) endpoint when only pooled Neon URL is injected.
if [ -z "${DIRECT_DATABASE_URL:-}" ] && [[ "${DATABASE_URL}" == *"-pooler"* ]]; then
  export DIRECT_DATABASE_URL="${DATABASE_URL//-pooler/}"
  echo "Derived DIRECT_DATABASE_URL from pooled DATABASE_URL for migrations."
fi
