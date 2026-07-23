# API Gateway → Serverless Container (simpler than ALB for serverless workloads).
# Custom domain + TLS: attach yandex_cm_certificate after DNS validation.

resource "yandex_cm_certificate" "api_staging" {
  name    = "aclearo-api-staging"
  domains = compact([var.api_staging_fqdn, var.api_staging_fqdn_ru])

  managed {
    challenge_type = "DNS_CNAME"
  }
}

resource "yandex_api_gateway" "api" {
  name        = "aclearo-staging-api-gw"
  description = "Public HTTPS entrypoint for staging API"

  spec = <<-OPENAPI
    openapi: 3.0.0
    info:
      title: aclearo-staging-api
      version: 1.0.0
    paths:
      /{proxy+}:
        parameters:
          - name: proxy
            in: path
            required: false
            schema:
              type: string
        x-yc-apigateway-any-method:
          x-yc-apigateway-integration:
            type: serverless_containers
            container_id: ${yandex_serverless_container.api.id}
            service_account_id: ${yandex_iam_service_account.api.id}
      /:
        x-yc-apigateway-any-method:
          x-yc-apigateway-integration:
            type: serverless_containers
            container_id: ${yandex_serverless_container.api.id}
            service_account_id: ${yandex_iam_service_account.api.id}
  OPENAPI
}

# Attach after Certificate Manager status = ISSUED (see runbook §4.2):
# yc api-gateway add-domain <gateway-id> --domain api.staging.aclearo.com --certificate-id <cert-id>
