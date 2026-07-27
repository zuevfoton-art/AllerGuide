# Serverless Container — image required by Yandex provider (>=0.130).
# Uses bootstrap SA (editor) at create time; switch to aclearo-staging-api after
# granting it container-registry.images.puller + lockbox.payloadViewer in console.

resource "yandex_serverless_container" "api" {
  name               = var.container_name
  description        = "Aclearo staging API (apps/api)"
  memory             = 512
  cores              = 1
  execution_timeout  = "30s"
  service_account_id = local.runtime_service_account_id

  image {
    url = "${local.registry_image_base}:${var.bootstrap_image_tag}"
  }

  connectivity {
    network_id = yandex_vpc_network.staging.id
  }

  depends_on = [null_resource.push_bootstrap_image]
}

# Lockbox secret placeholder — populate values after apply (see runbook).
# IAM on the secret: grant lockbox.payloadViewer to runtime SA in console
# (bootstrap SA with only `editor` cannot set Lockbox access bindings).
resource "yandex_lockbox_secret" "api_env" {
  name                = "aclearo-staging-api-env"
  description         = "Staging API environment (DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, …)"
  deletion_protection = true
}
