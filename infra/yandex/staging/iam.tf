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
