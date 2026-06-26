#!/usr/bin/env bash
# Create detailed Phase 1–2 GitHub issues from scripts/phase1-phase2-issues.json
# Requires: gh CLI (issues:write), jq
#
# Usage:
#   ./scripts/create-phase-issues.sh              # create all
#   ./scripts/create-phase-issues.sh --dry-run   # preview only
#   ./scripts/create-phase-issues.sh --labels-only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_FILE="$SCRIPT_DIR/phase1-phase2-issues.json"
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

label_color() {
  case "$1" in
    phase-1) echo "5319E7" ;;
    phase-2) echo "B60205" ;;
    roadmap) echo "EDEDED" ;;
    backend) echo "1D76DB" ;;
    mobile) echo "0E8A16" ;;
    devops) echo "FBCA04" ;;
    qa) echo "D93F0B" ;;
    infra) echo "C5DEF5" ;;
    *) echo "BFD4F2" ;;
  esac
}

echo ""
echo "=== Creating labels ==="
jq -r '.labels[]' "$DATA_FILE" | while read -r label; do
  color=$(label_color "$label")
  if $DRY_RUN; then
    echo "[dry-run] label: $label (#$color)"
  else
    gh api "repos/$REPO/labels" \
      -f name="$label" \
      -f color="$color" \
      -f description="Phase issues: $label" 2>/dev/null \
      || gh api "repos/$REPO/labels/$label" \
        -X PATCH \
        -f color="$color" \
        -f description="Phase issues: $label" 2>/dev/null \
      || true
    echo "  label: $label"
  fi
done

if $LABELS_ONLY; then
  echo "Done (labels only)."
  exit 0
fi

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
  parent=$(jq -r ".issues[$i].parent" "$DATA_FILE")
  effort=$(jq -r ".issues[$i].effort_days" "$DATA_FILE")
  role=$(jq -r ".issues[$i].role" "$DATA_FILE")
  depends=$(jq -r ".issues[$i].depends_on | if length == 0 then \"—\" else join(\", \") end" "$DATA_FILE")
  blocks=$(jq -r ".issues[$i].blocks | if length == 0 then \"—\" else join(\", \") end" "$DATA_FILE")

  footer=$(
    cat <<EOF

---

| Поле | Значение |
|------|----------|
| **ID** | \`$task_id\` |
| **Родитель** | \`$parent\` |
| **Роль** | $role |
| **Оценка** | ${effort} дн. |
| **Зависит от** | $depends |
| **Блокирует** | $blocks |

См. [docs/phase1-phase2-issues.md](../docs/phase1-phase2-issues.md) · [roadmap-to-prod.md](../docs/roadmap-to-prod.md)
EOF
  )

  full_body="${body}${footer}"

  if $DRY_RUN; then
    echo "[dry-run] $task_id (${effort}d, $role) → $milestone | deps: $depends"
    continue
  fi

  existing=$(gh issue list --repo "$REPO" --search "in:title \"$task_id\"" --json number --jq '.[0].number' 2>/dev/null || true)
  if [[ -n "$existing" && "$existing" != "null" ]]; then
    echo "  skip (exists #$existing): $title"
    ((skipped++)) || true
    continue
  fi

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$full_body" \
    --label "$labels" \
    --milestone "$milestone"

  echo "  created: $task_id — $title"
  ((created++)) || true
  sleep 0.5
done

echo ""
echo "=== Summary ==="
if $DRY_RUN; then
  total_days=$(jq '[.issues[].effort_days] | add' "$DATA_FILE")
  echo "Dry run: $issue_count issues, ~${total_days} person-days total."
else
  echo "Created: $created, skipped: $skipped"
  echo "Issues: https://github.com/$REPO/issues?q=label%3Aroadmap+label%3Aphase-1"
fi
