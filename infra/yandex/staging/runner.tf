# GitHub Actions self-hosted runner in VPC — required for db:migrate against private Postgres.
# Register the runner once (see docs/staging-yandex-cloud.md § GitHub runner).

data "yandex_compute_image" "ubuntu" {
  family = "ubuntu-2204-lts"
}

locals {
  runner_cloud_init = var.runner_ssh_public_key != "" ? templatefile("${path.module}/templates/runner-cloud-init.yaml.tftpl", {
    ssh_public_key = var.runner_ssh_public_key
  }) : null
}

resource "yandex_compute_instance" "gh_runner" {
  name        = var.runner_name
  platform_id = "standard-v3"
  zone        = var.zone

  resources {
    cores  = var.runner_cores
    memory = var.runner_memory_gb
  }

  boot_disk {
    initialize_params {
      image_id = data.yandex_compute_image.ubuntu.id
      size     = var.runner_disk_gb
      type     = "network-ssd"
    }
  }

  network_interface {
    subnet_id          = yandex_vpc_subnet.staging.id
    nat                = true
    security_group_ids = [yandex_vpc_security_group.staging.id]
  }

  metadata = merge(
    {
      "user-data" = local.runner_cloud_init != null ? local.runner_cloud_init : "#!/bin/bash\napt-get update && apt-get install -y curl git"
    },
    var.runner_ssh_public_key != "" ? { "ssh-keys" = "ubuntu:${var.runner_ssh_public_key}" } : {}
  )

  labels = {
    role    = "github-runner"
    project = "aclearo-staging"
  }
}
