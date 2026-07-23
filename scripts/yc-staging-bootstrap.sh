#!/usr/bin/env bash
# Bootstrap Aclearo staging on Yandex Cloud (VPC, private Postgres, API GW, GH runner).
#
# Prerequisites:
#   - yc CLI authenticated (yc init)
#   - terraform >= 1.5
#   - folder_id in infra/yandex/staging/terraform.tfvars (copy from terraform.tfvars.example)
#
# Usage:
#   cp infra/yandex/staging/terraform.tfvars.example infra/yandex/staging/terraform.tfvars
#   # edit terraform.tfvars — set folder_id, pg_password, runner_ssh_public_key
#   ./scripts/yc-staging-bootstrap.sh
#   ./scripts/yc-staging-bootstrap.sh plan    # terraform plan only
#   ./scripts/yc-staging-bootstrap.sh destroy # tear down (careful)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infra/yandex/staging"
ACTION="${1:-apply}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: $1 is required. See docs/staging-yandex-cloud.md" >&2
    exit 1
  fi
}

need_cmd yc
need_cmd terraform

if ! yc config list >/dev/null 2>&1; then
  echo "Error: yc CLI is not configured. Run: yc init" >&2
  exit 1
fi

if [[ ! -f "$TF_DIR/terraform.tfvars" ]]; then
  echo "Missing $TF_DIR/terraform.tfvars"
  echo "Copy terraform.tfvars.example and set folder_id, pg_password, runner_ssh_public_key."
  exit 1
fi

cd "$TF_DIR"

echo "=== Aclearo staging — Yandex Cloud bootstrap ($ACTION) ==="
terraform init -input=false

case "$ACTION" in
  plan)
    terraform plan -input=false
    ;;
  apply)
    terraform apply -input=false
    echo ""
    echo "=== Outputs ==="
    terraform output -json | jq 'del(.deploy_service_account_key, .database_url)'
    echo ""
    echo "Sensitive outputs (store securely):"
    echo "  terraform output -raw database_url"
    echo "  terraform output -raw deploy_service_account_key > /tmp/yc-sa-key.json"
    echo ""
    terraform output -raw next_steps
    echo ""
    echo "Full runbook: docs/staging-yandex-cloud.md"
    ;;
  destroy)
    read -r -p "Destroy ALL staging YC resources? Type 'destroy-staging': " confirm
    [[ "$confirm" == "destroy-staging" ]] || { echo "Aborted."; exit 1; }
    terraform destroy -input=false
    ;;
  *)
    echo "Unknown action: $ACTION (use apply, plan, or destroy)" >&2
    exit 1
    ;;
esac
