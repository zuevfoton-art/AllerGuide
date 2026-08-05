#!/usr/bin/env bash
# Install mockup canvases into ~/.cursor/projects/<slug>/canvases/
# For local Desktop/Linux agents — Cloud Agent Canvas UI does not load.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$ROOT/docs/screens/canvas"
PROJECTS="${CURSOR_DATA_DIR:-$HOME/.cursor}/projects"
slug="$(printf '%s' "$ROOT" | sed -E 's/[^a-zA-Z0-9]+/-/g; s/^-+|-+$//g')"
DEST="$PROJECTS/$slug/canvases"
mkdir -p "$DEST"
cp -f "$SRC"/*.canvas.tsx "$DEST/"
echo "Installed -> $DEST"
echo "Open smoke.canvas.tsx in a LOCAL Cursor agent chat."
