output "folder_id" {
  value = var.folder_id
}

output "network_id" {
  value = yandex_vpc_network.staging.id
}

output "subnet_id" {
  value = yandex_vpc_subnet.staging.id
}

output "postgresql_fqdn" {
  description = "Private PostgreSQL FQDN (VPC only, no public IP)"
  value       = local.pg_host
}

output "database_url" {
  description = "Connection string for apps/api (store in Lockbox + GitHub Secrets on VPC runner)"
  value       = local.pg_url
  sensitive   = true
}

output "container_registry_id" {
  value = yandex_container_registry.staging.id
}

output "container_registry_url" {
  value = "cr.yandex/${yandex_container_registry.staging.id}"
}

output "registry_image_base" {
  value = local.registry_image_base
}

output "serverless_container_id" {
  value = yandex_serverless_container.api.id
}

output "serverless_container_name" {
  value = yandex_serverless_container.api.name
}

output "api_service_account_id" {
  value = yandex_iam_service_account.api.id
}

output "deploy_service_account_id" {
  value = yandex_iam_service_account.deploy.id
}

output "deploy_service_account_key" {
  description = "Save as GitHub secret YC_SA_JSON (full authorized-key JSON)"
  value       = yandex_iam_service_account_key.deploy.private_key
  sensitive   = true
}

output "lockbox_secret_id" {
  value = yandex_lockbox_secret.api_env.id
}

output "ai_service_account_id" {
  description = "SA for YandexGPT / Vision / SpeechKit / Search (Phase 0+)"
  value       = yandex_iam_service_account.ai.id
}

output "api_gateway_default_domain" {
  description = "Default *.apigw.yandexcloud.net domain — CNAME api.staging.aclearo.com here after cert ISSUED"
  value       = yandex_api_gateway.api.domain
}

output "api_gateway_id" {
  value = yandex_api_gateway.api.id
}

output "certificate_id" {
  value = yandex_cm_certificate.api_staging.id
}

output "certificate_dns_challenges" {
  description = "Add these CNAME records in Yandex Cloud DNS (aclearo.com zone) to issue TLS cert"
  value       = yandex_cm_certificate.api_staging.challenges
}

output "github_runner_public_ip" {
  description = "NAT IP of the VPC runner VM (SSH + outbound for GH registration)"
  value       = yandex_compute_instance.gh_runner.network_interface[0].nat_ip_address
}

output "github_runner_private_ip" {
  value = yandex_compute_instance.gh_runner.network_interface[0].ip_address
}

output "next_steps" {
  value = <<-EOT
    1. Add certificate DNS challenges (output certificate_dns_challenges) in Yandex Cloud DNS.
    2. After cert ISSUED: yc serverless api-gateway add-domain --id <gw> --domain ${var.api_staging_fqdn} --certificate-id <cert-id>
    3. CNAME ${var.api_staging_fqdn} → API Gateway domain
    4. Populate Lockbox ${yandex_lockbox_secret.api_env.name} with DATABASE_URL, JWT_SECRET, …
    5. IAM for ${yandex_iam_service_account.api.name} / ${yandex_iam_service_account.deploy.name} is managed in iam.tf (folder admin required on apply principal).
    6. Register GitHub self-hosted runner on VM ${yandex_compute_instance.gh_runner.name} (label: yc-staging-vpc).
    7. Store GitHub Secrets: YC_SA_JSON (= terraform output deploy_service_account_key), YC_REGISTRY_ID, YC_CONTAINER_ID, STAGING_*, EXPO_TOKEN.
    8. Push branch staging → Deploy staging (Yandex Cloud) (.github/workflows/deploy-staging.yml)
  EOT
}
