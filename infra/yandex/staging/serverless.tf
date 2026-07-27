# Serverless Container — image required by Yandex provider (>=0.130).
# Bootstrap pushes a placeholder tag to YCR; CI replaces it with the real API image.
# VPC connectivity (network_id only) reaches private Managed PostgreSQL.

resource "yandex_serverless_container" "api" {
  name               = var.container_name
  description        = "Aclearo staging API (apps/api)"
  memory             = 512
  cores              = 1
  execution_timeout  = "30s"
  service_account_id = yandex_iam_service_account.api.id

  image {
    url = "${local.registry_image_base}:${var.bootstrap_image_tag}"
  }

  connectivity {
    network_id = yandex_vpc_network.staging.id
  }

  depends_on = [
    yandex_resourcemanager_folder_iam_member.api_registry_pull,
    null_resource.push_bootstrap_image,
  ]
}

# Lockbox secret placeholder — populate values after apply (see runbook).
resource "yandex_lockbox_secret" "api_env" {
  name                = "aclearo-staging-api-env"
  description         = "Staging API environment (DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, …)"
  deletion_protection = true
}

resource "yandex_lockbox_secret_iam_binding" "api_env_reader" {
  secret_id = yandex_lockbox_secret.api_env.id
  role      = "lockbox.payloadViewer"

  members = [
    "serviceAccount:${yandex_iam_service_account.api.id}",
    "serviceAccount:${yandex_iam_service_account.deploy.id}",
  ]
}
