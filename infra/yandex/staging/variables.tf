variable "folder_id" {
  description = "Yandex Cloud folder ID"
  type        = string
}

variable "zone" {
  description = "Default availability zone"
  type        = string
  default     = "ru-central1-a"
}

variable "network_name" {
  description = "VPC network name"
  type        = string
  default     = "aclearo-staging"
}

variable "subnet_cidr" {
  description = "Private subnet CIDR for staging workloads"
  type        = string
  default     = "10.128.0.0/24"
}

variable "pg_cluster_name" {
  description = "Managed PostgreSQL cluster name"
  type        = string
  default     = "aclearo-staging-pg"
}

variable "pg_user" {
  description = "PostgreSQL application user"
  type        = string
  default     = "aclearo"
}

variable "pg_password" {
  description = "PostgreSQL password (sensitive — pass via TF_VAR_pg_password or tfvars)"
  type        = string
  sensitive   = true
}

variable "pg_database" {
  description = "PostgreSQL database name"
  type        = string
  default     = "aclearo_staging"
}

variable "registry_name" {
  description = "Container Registry name"
  type        = string
  default     = "aclearo-staging-registry"
}

variable "container_name" {
  description = "Serverless Container name for the API"
  type        = string
  default     = "aclearo-staging-api"
}

variable "runner_name" {
  description = "Compute VM name for the GitHub Actions VPC runner (DB migrations)"
  type        = string
  default     = "aclearo-staging-gh-runner"
}

variable "runner_ssh_public_key" {
  description = "SSH public key for the migration runner VM (optional)"
  type        = string
  default     = ""
}

variable "runner_cores" {
  description = "vCPU count for the GitHub runner VM"
  type        = number
  default     = 2
}

variable "runner_memory_gb" {
  description = "RAM (GB) for the GitHub runner VM"
  type        = number
  default     = 4
}

variable "runner_disk_gb" {
  description = "Boot disk size (GB) for the GitHub runner VM"
  type        = number
  default     = 30
}

variable "api_staging_fqdn" {
  description = "Public FQDN for staging API (Certificate Manager + ALB)"
  type        = string
  default     = "api.staging.aclearo.com"
}

variable "api_staging_fqdn_ru" {
  description = "Optional RU mirror FQDN"
  type        = string
  default     = "api.staging.aclearo.ru"
}

variable "bootstrap_image_tag" {
  description = "YCR tag for the placeholder image used at first container create"
  type        = string
  default     = "bootstrap"
}

variable "bootstrap_source_image" {
  description = "Public image copied into YCR as a placeholder (replaced by CI with apps/api)"
  type        = string
  default     = "node:20-alpine"
}
