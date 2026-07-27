# Serverless Container — image required by Yandex provider (>=0.130).
# Runtime SA = aclearo-staging-api (IAM in iam.tf). CI replaces the image; TF
# must not roll it back to the bootstrap tag.

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

  depends_on = [
    null_resource.push_bootstrap_image,
    yandex_resourcemanager_folder_iam_member.api_puller,
    yandex_lockbox_secret_iam_member.api_payload,
  ]

  lifecycle {
    ignore_changes = [image]
  }
}

# Lockbox secret placeholder — populate values after apply (see runbook).
# Payload bindings: yandex_lockbox_secret_iam_member in iam.tf.
resource "yandex_lockbox_secret" "api_env" {
  name                = "aclearo-staging-api-env"
  description         = "Staging API environment (DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, …)"
  deletion_protection = true
}
