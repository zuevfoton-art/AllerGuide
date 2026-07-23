# Serverless Container shell — revisions are deployed by CI (deploy-staging-yandex.yml).
# VPC connectivity is required to reach private Managed PostgreSQL.

resource "yandex_serverless_container" "api" {
  name               = var.container_name
  description        = "Aclearo staging API (apps/api)"
  memory             = 512
  execution_timeout  = "30s"
  service_account_id = yandex_iam_service_account.api.id

  connectivity {
    network_id = yandex_vpc_network.staging.id
    subnet_ids = [yandex_vpc_subnet.staging.id]
  }
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
