resource "yandex_container_registry" "staging" {
  name = var.registry_name
}

# Runtime SA: pull images + read Lockbox + invoke (API Gateway → container).
resource "yandex_iam_service_account" "api" {
  name        = "aclearo-staging-api"
  description = "Runtime SA for Serverless Container + API Gateway invoke"
}

# Deploy SA: CI push to YCR + deploy container revisions.
resource "yandex_iam_service_account" "deploy" {
  name        = "aclearo-staging-deploy"
  description = "GitHub Actions: registry push + serverless deploy"
}

resource "yandex_iam_service_account_key" "deploy" {
  service_account_id = yandex_iam_service_account.deploy.id
  description        = "GitHub Actions — store JSON as secret YC_SA_JSON"
}

# Folder roles (requires folder `admin` on the applying principal / bootstrap SA).
resource "yandex_resourcemanager_folder_iam_member" "api_puller" {
  folder_id = var.folder_id
  role      = "container-registry.images.puller"
  member    = "serviceAccount:${yandex_iam_service_account.api.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "api_lockbox" {
  folder_id = var.folder_id
  role      = "lockbox.payloadViewer"
  member    = "serviceAccount:${yandex_iam_service_account.api.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "api_invoker" {
  folder_id = var.folder_id
  role      = "serverless.containers.invoker"
  member    = "serviceAccount:${yandex_iam_service_account.api.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "deploy_pusher" {
  folder_id = var.folder_id
  role      = "container-registry.images.pusher"
  member    = "serviceAccount:${yandex_iam_service_account.deploy.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "deploy_containers" {
  folder_id = var.folder_id
  role      = "serverless.containers.admin"
  member    = "serviceAccount:${yandex_iam_service_account.deploy.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "deploy_lockbox" {
  folder_id = var.folder_id
  role      = "lockbox.payloadViewer"
  member    = "serviceAccount:${yandex_iam_service_account.deploy.id}"
}

resource "yandex_lockbox_secret_iam_member" "api_payload" {
  secret_id = yandex_lockbox_secret.api_env.id
  role      = "lockbox.payloadViewer"
  member    = "serviceAccount:${yandex_iam_service_account.api.id}"
}

resource "yandex_lockbox_secret_iam_member" "deploy_payload" {
  secret_id = yandex_lockbox_secret.api_env.id
  role      = "lockbox.payloadViewer"
  member    = "serviceAccount:${yandex_iam_service_account.deploy.id}"
}

# Registry-scoped bindings (folder-level puller/pusher above are enough for CI;
# these keep least-privilege if folder roles are later narrowed).
resource "yandex_container_registry_iam_binding" "api_puller" {
  registry_id = yandex_container_registry.staging.id
  role        = "container-registry.images.puller"
  members     = ["serviceAccount:${yandex_iam_service_account.api.id}"]
}

resource "yandex_container_registry_iam_binding" "deploy_pusher" {
  registry_id = yandex_container_registry.staging.id
  role        = "container-registry.images.pusher"
  members     = ["serviceAccount:${yandex_iam_service_account.deploy.id}"]
}

locals {
  registry_image_base = "cr.yandex/${yandex_container_registry.staging.id}/aclearo-api"
  # Prefer dedicated api SA; override via var only for emergency bootstrap.
  runtime_service_account_id = coalesce(
    var.runtime_service_account_id != "" ? var.runtime_service_account_id : null,
    yandex_iam_service_account.api.id,
  )
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
