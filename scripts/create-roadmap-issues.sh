#!/usr/bin/env bash
# Create GitHub milestones and issues from docs/roadmap-to-prod.md
# Requires: gh CLI with repo scope (issues:write, milestones:write)
#
# Usage:
#   ./scripts/create-roadmap-issues.sh              # create all
#   ./scripts/create-roadmap-issues.sh --dry-run   # print actions only
#   ./scripts/create-roadmap-issues.sh --labels-only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_FILE="$SCRIPT_DIR/roadmap-issues.json"
DRY_RUN=false
LABELS_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --labels-only) LABELS_ONLY=true ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--labels-only]"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required." >&2
  exit 1
fi

REPO=$(jq -r '.repo' "$DATA_FILE")
echo "Repository: $REPO"

run_gh() {
  if $DRY_RUN; then
    echo "[dry-run] gh $*"
  else
    gh "$@"
  fi
}

# --- Labels ---
echo ""
echo "=== Creating labels ==="
jq -r '.labels[]' "$DATA_FILE" | while read -r label; do
  color="0E8A16"
  case "$label" in
    phase-0) color="1D76DB" ;;
    phase-1) color="5319E7" ;;
    phase-2) color="B60205" ;;
    phase-3) color="FBCA04" ;;
    phase-4) color="0E8A16" ;;
    phase-5) color="C5DEF5" ;;
    roadmap) color="EDEDED" ;;
  esac
  if $DRY_RUN; then
    echo "[dry-run] create label: $label (#$color)"
  else
    gh api "repos/$REPO/labels" \
      -f name="$label" \
      -f color="$color" \
      -f description="Roadmap: $label" 2>/dev/null \
      || gh api "repos/$REPO/labels/$label" \
        -X PATCH \
        -f color="$color" \
        -f description="Roadmap: $label" 2>/dev/null \
      || true
    echo "  label: $label"
  fi
done

if $LABELS_ONLY; then
  echo "Done (labels only)."
  exit 0
fi

# --- Milestones ---
echo ""
echo "=== Creating milestones ==="
declare -A MILESTONE_NUM

milestone_count=$(jq '.milestones | length' "$DATA_FILE")
for ((i = 0; i < milestone_count; i++)); do
  title=$(jq -r ".milestones[$i].title" "$DATA_FILE")
  description=$(jq -r ".milestones[$i].description" "$DATA_FILE")
  due_on=$(jq -r ".milestones[$i].due_on // empty" "$DATA_FILE")

  if $DRY_RUN; then
    echo "[dry-run] milestone: $title"
    MILESTONE_NUM["$title"]="$((i + 1))"
  else
    args=(
      api "repos/$REPO/milestones"
      -f title="$title"
      -f description="$description"
    )
    if [[ -n "$due_on" && "$due_on" != "null" ]]; then
      args+=(-f "due_on=$due_on")
    fi
    result=$(gh "${args[@]}" 2>/dev/null || true)
    if [[ -z "$result" ]]; then
      # Milestone may already exist — find it
      num=$(gh api "repos/$REPO/milestones?state=all&per_page=100" \
        --jq ".[] | select(.title==\"$title\") | .number" | head -1)
      if [[ -z "$num" ]]; then
        echo "Error: failed to create or find milestone: $title" >&2
        exit 1
      fi
      echo "  exists: $title (#$num)"
      MILESTONE_NUM["$title"]="$num"
    else
      num=$(echo "$result" | jq -r '.number')
      echo "  created: $title (#$num)"
      MILESTONE_NUM["$title"]="$num"
    fi
  fi
done

# --- Issues ---
echo ""
echo "=== Creating issues ==="
issue_count=$(jq '.issues | length' "$DATA_FILE")
created=0
skipped=0

for ((i = 0; i < issue_count; i++)); do
  task_id=$(jq -r ".issues[$i].id" "$DATA_FILE")
  title=$(jq -r ".issues[$i].title" "$DATA_FILE")
  body=$(jq -r ".issues[$i].body" "$DATA_FILE")
  milestone=$(jq -r ".issues[$i].milestone" "$DATA_FILE")
  labels=$(jq -r ".issues[$i].labels | join(\",\")" "$DATA_FILE")

  if $DRY_RUN; then
    echo "[dry-run] issue $task_id: $title → $milestone"
    continue
  fi

  # Skip if issue with same title already exists
  existing=$(gh issue list --repo "$REPO" --search "in:title \"$task_id\"" --json number,title --jq '.[0].number' 2>/dev/null || true)
  if [[ -n "$existing" && "$existing" != "null" ]]; then
    echo "  skip (exists #$existing): $title"
    ((skipped++)) || true
    continue
  fi

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --milestone "$milestone"

  echo "  created: $title"
  ((created++)) || true
  sleep 0.5
done

echo ""
echo "=== Summary ==="
if $DRY_RUN; then
  echo "Dry run complete. $issue_count issues would be created."
else
  echo "Created: $created issues, skipped: $skipped (already exist)"
  echo ""
  echo "Milestones: https://github.com/$REPO/milestones"
  echo "Issues:     https://github.com/$REPO/issues?q=label%3Aroadmap"
fi
