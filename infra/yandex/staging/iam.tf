resource "yandex_container_registry" "staging" {
  name = var.registry_name
}

resource "yandex_iam_service_account" "api" {
  name        = "aclearo-staging-api"
  description = "Push images, deploy serverless revisions, read Lockbox"
}

resource "yandex_iam_service_account" "deploy" {
  name        = "aclearo-staging-deploy"
  description = "GitHub Actions: registry push + serverless deploy"
}

resource "yandex_resourcemanager_folder_iam_member" "api_registry_pull" {
  folder_id = var.folder_id
  role      = "container-registry.images.puller"
  member    = "serviceAccount:${yandex_iam_service_account.api.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "api_lockbox" {
  folder_id = var.folder_id
  role      = "lockbox.payloadViewer"
  member    = "serviceAccount:${yandex_iam_service_account.api.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "deploy_registry_push" {
  folder_id = var.folder_id
  role      = "container-registry.images.pusher"
  member    = "serviceAccount:${yandex_iam_service_account.deploy.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "deploy_serverless" {
  folder_id = var.folder_id
  role      = "serverless.containers.admin"
  member    = "serviceAccount:${yandex_iam_service_account.deploy.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "deploy_lockbox" {
  folder_id = var.folder_id
  role      = "lockbox.payloadViewer"
  member    = "serviceAccount:${yandex_iam_service_account.deploy.id}"
}

resource "yandex_iam_service_account_key" "deploy" {
  service_account_id = yandex_iam_service_account.deploy.id
  description        = "GitHub Actions — store JSON as secret YC_SA_JSON"
}

locals {
  registry_image_base = "cr.yandex/${yandex_container_registry.staging.id}/aclearo-api"
}

# Placeholder image so Serverless Container can be created before the first CI build.
# Requires crane (https://github.com/google/go-containerregistry) or docker on the bootstrap host.
resource "null_resource" "push_bootstrap_image" {
  triggers = {
    registry_id = yandex_container_registry.staging.id
    tag         = var.bootstrap_image_tag
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      KEY_FILE="$${YC_SERVICE_ACCOUNT_KEY_FILE:-$HOME/.config/yandex-cloud/sa-key.json}"
      IMAGE="${local.registry_image_base}:${var.bootstrap_image_tag}"
      if command -v crane >/dev/null 2>&1; then
        crane auth login cr.yandex -u json_key -p "$(cat "$KEY_FILE")"
        crane copy "${var.bootstrap_source_image}" "$IMAGE"
      elif command -v docker >/dev/null 2>&1; then
        cat "$KEY_FILE" | docker login --username json_key --password-stdin cr.yandex
        docker pull "${var.bootstrap_source_image}"
        docker tag "${var.bootstrap_source_image}" "$IMAGE"
        docker push "$IMAGE"
      else
        echo "Error: install crane or docker to push bootstrap image to YCR" >&2
        exit 1
      fi
      echo "Pushed bootstrap image: $IMAGE"
    EOT
  }

  depends_on = [
    yandex_resourcemanager_folder_iam_member.deploy_registry_push,
  ]
}
