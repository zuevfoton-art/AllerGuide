terraform {
  required_version = ">= 1.5.0"

  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "~> 0.130"
    }
  }

  # Uncomment after creating an Object Storage bucket for remote state:
  # backend "s3" {
  #   endpoints = { s3 = "https://storage.yandexcloud.net" }
  #   bucket    = "aclearo-tfstate"
  #   key       = "staging/terraform.tfstate"
  #   region    = "ru-central1"
  #   skip_region_validation      = true
  #   skip_credentials_validation = true
  #   skip_requesting_account_id  = true
  #   skip_s3_checksum            = true
  # }
}

provider "yandex" {
  folder_id = var.folder_id
  zone      = var.zone
}
