#!/usr/bin/env bash
# Bootstrap Aclearo staging on Yandex Cloud (VPC, private Postgres, API GW, GH runner).
#
# Prerequisites:
#   - yc CLI authenticated (service-account-key or yc init)
#   - terraform >= 1.5
#   - crane OR docker (to push bootstrap image into YCR)
#   - folder_id in infra/yandex/staging/terraform.tfvars
#
# Usage:
#   cp infra/yandex/staging/terraform.tfvars.example infra/yandex/staging/terraform.tfvars
#   # edit terraform.tfvars — set folder_id, pg_password, runner_ssh_public_key
#   ./scripts/yc-staging-bootstrap.sh
#   ./scripts/yc-staging-bootstrap.sh plan
#   ./scripts/yc-staging-bootstrap.sh destroy
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
need_cmd jq

if ! command -v crane >/dev/null 2>&1 && ! command -v docker >/dev/null 2>&1; then
  echo "Error: install crane (recommended) or docker to push the bootstrap image to YCR." >&2
  echo "  go install github.com/google/go-containerregistry/cmd/crane@latest" >&2
  exit 1
fi

if ! yc config list >/dev/null 2>&1; then
  echo "Error: yc CLI is not configured. Run: yc init" >&2
  exit 1
fi

if [[ ! -f "$TF_DIR/terraform.tfvars" ]]; then
  echo "Missing $TF_DIR/terraform.tfvars"
  echo "Copy terraform.tfvars.example and set folder_id, pg_password, runner_ssh_public_key."
  exit 1
fi

# Export auth for Terraform provider + local-exec image push
export YC_FOLDER_ID="${YC_FOLDER_ID:-$(yc config get folder-id)}"
export YC_CLOUD_ID="${YC_CLOUD_ID:-$(yc config get cloud-id 2>/dev/null || true)}"
export YC_TOKEN="${YC_TOKEN:-$(yc iam create-token)}"
if [[ -z "${YC_SERVICE_ACCOUNT_KEY_FILE:-}" ]]; then
  if [[ -f "$HOME/.config/yandex-cloud/sa-key.json" ]]; then
    export YC_SERVICE_ACCOUNT_KEY_FILE="$HOME/.config/yandex-cloud/sa-key.json"
  fi
fi

cd "$TF_DIR"

echo "=== Aclearo staging — Yandex Cloud bootstrap ($ACTION) ==="
echo "folder_id=$YC_FOLDER_ID"
terraform init -input=false

case "$ACTION" in
  plan)
    terraform plan -input=false
    ;;
  apply)
    terraform apply -input=false -auto-approve
    echo ""
    echo "=== Outputs ==="
    terraform output -json | jq 'del(.deploy_service_account_key, .database_url)'
    echo ""
    echo "Sensitive outputs (store securely):"
    echo "  terraform output -raw database_url"
    echo "  terraform output -raw deploy_service_account_key > /tmp/yc-deploy-sa-key.json"
    echo ""
    terraform output -raw next_steps
    echo ""
    echo "Full runbook: docs/staging-yandex-cloud.md"
    ;;
  destroy)
    read -r -p "Destroy ALL staging YC resources? Type 'destroy-staging': " confirm
    [[ "$confirm" == "destroy-staging" ]] || { echo "Aborted."; exit 1; }
    terraform destroy -input=false -auto-approve
    ;;
  *)
    echo "Unknown action: $ACTION (use apply, plan, or destroy)" >&2
    exit 1
    ;;
esac
