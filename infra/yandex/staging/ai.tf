# Phase 0 — Yandex AI credentials for staging (GPT / Vision OCR / SpeechKit STT / Search).
# Application wiring is Phase 1+; this stack only provisions SA + folder roles.
# API key is created out-of-band (see docs/staging-yandex-ai.md) and stored in Lockbox.

resource "yandex_iam_service_account" "ai" {
  name        = "aclearo-staging-ai"
  description = "Staging AI: YandexGPT, Vision OCR, SpeechKit STT, Search API"
}

resource "yandex_resourcemanager_folder_iam_member" "ai_language_models" {
  folder_id = var.folder_id
  role      = "ai.languageModels.user"
  member    = "serviceAccount:${yandex_iam_service_account.ai.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "ai_vision" {
  folder_id = var.folder_id
  role      = "ai.vision.user"
  member    = "serviceAccount:${yandex_iam_service_account.ai.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "ai_speechkit_stt" {
  folder_id = var.folder_id
  role      = "ai.speechkit-stt.user"
  member    = "serviceAccount:${yandex_iam_service_account.ai.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "ai_search_executor" {
  folder_id = var.folder_id
  role      = "search-api.executor"
  member    = "serviceAccount:${yandex_iam_service_account.ai.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "ai_search_web" {
  folder_id = var.folder_id
  role      = "search-api.webSearch.user"
  member    = "serviceAccount:${yandex_iam_service_account.ai.id}"
}
