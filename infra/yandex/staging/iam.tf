resource "yandex_container_registry" "staging" {
  name = var.registry_name
}

# Dedicated SAs for later CI (roles granted manually in console — bootstrap SA
# only has `editor`, which cannot update folder IAM bindings).
resource "yandex_iam_service_account" "api" {
  name        = "aclearo-staging-api"
  description = "Runtime SA for Serverless Container (grant puller + lockbox in console)"
}

resource "yandex_iam_service_account" "deploy" {
  name        = "aclearo-staging-deploy"
  description = "GitHub Actions: registry push + serverless deploy (grant roles in console)"
}

resource "yandex_iam_service_account_key" "deploy" {
  service_account_id = yandex_iam_service_account.deploy.id
  description        = "GitHub Actions — store JSON as secret YC_SA_JSON"
}

locals {
  registry_image_base = "cr.yandex/${yandex_container_registry.staging.id}/aclearo-api"
  # editor on folder is enough for pull/invoke during bootstrap
  runtime_service_account_id = var.runtime_service_account_id
}

# Placeholder image so Serverless Container can be created before the first CI build.
resource "null_resource" "push_bootstrap_image" {
  triggers = {
    registry_id = yandex_container_registry.staging.id
    tag         = var.bootstrap_image_tag
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = "set -euo pipefail; KEY_FILE=\"$${YC_SERVICE_ACCOUNT_KEY_FILE:-$HOME/.config/yandex-cloud/sa-key.json}\"; IMAGE=\"${local.registry_image_base}:${var.bootstrap_image_tag}\"; if command -v crane >/dev/null 2>&1; then crane auth login cr.yandex -u json_key -p \"$(cat \"$KEY_FILE\")\"; crane copy \"${var.bootstrap_source_image}\" \"$IMAGE\"; elif command -v docker >/dev/null 2>&1; then cat \"$KEY_FILE\" | docker login --username json_key --password-stdin cr.yandex; docker pull \"${var.bootstrap_source_image}\"; docker tag \"${var.bootstrap_source_image}\" \"$IMAGE\"; docker push \"$IMAGE\"; else echo 'Error: install crane or docker' >&2; exit 1; fi; echo \"Pushed bootstrap image: $IMAGE\""
  }
}
