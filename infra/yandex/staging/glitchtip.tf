# Self-hosted GlitchTip for staging crash ingest.
# Compose Postgres lives on this VM — never the app Managed Postgres cluster.
# Owner: terraform apply + DNS A + Lockbox payload + EAS DSN (docs/staging-glitchtip.md).

resource "yandex_iam_service_account" "glitchtip" {
  name        = "aclearo-staging-glitchtip"
  description = "GlitchTip VM: read aclearo-staging-glitchtip Lockbox only"
}

resource "yandex_lockbox_secret" "glitchtip" {
  name                = "aclearo-staging-glitchtip"
  description         = "GlitchTip VM env (SECRET_KEY, POSTGRES_PASSWORD). Not the API secret."
  deletion_protection = true
}

resource "yandex_lockbox_secret_iam_member" "glitchtip_payload" {
  secret_id = yandex_lockbox_secret.glitchtip.id
  role      = "lockbox.payloadViewer"
  member    = "serviceAccount:${yandex_iam_service_account.glitchtip.id}"
}

resource "yandex_vpc_security_group" "glitchtip" {
  name        = "${var.network_name}-glitchtip-sg"
  description = "GlitchTip VM: HTTP-01 + HTTPS ingest. SSH only from glitchtip_ssh_cidrs."
  network_id  = yandex_vpc_network.staging.id

  ingress {
    description    = "Let's Encrypt HTTP-01"
    protocol       = "TCP"
    port           = 80
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description    = "HTTPS ingest + GlitchTip UI"
    protocol       = "TCP"
    port           = 443
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  dynamic "ingress" {
    for_each = length(var.glitchtip_ssh_cidrs) > 0 ? [1] : []
    content {
      description    = "SSH from admin CIDRs"
      protocol       = "TCP"
      port           = 22
      v4_cidr_blocks = var.glitchtip_ssh_cidrs
    }
  }

  egress {
    description    = "Images, Lockbox, Let's Encrypt"
    protocol       = "ANY"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}

locals {
  glitchtip_caddyfile = templatefile("${path.module}/templates/glitchtip-caddyfile.tftpl", {
    fqdn    = var.glitchtip_fqdn
    fqdn_ru = var.glitchtip_fqdn_ru
    email   = "support@aclearo.com"
  })
  glitchtip_bootstrap_sh = templatefile("${path.module}/templates/glitchtip-bootstrap.sh.tftpl", {
    lockbox_secret_id = yandex_lockbox_secret.glitchtip.id
    fqdn              = var.glitchtip_fqdn
  })
  glitchtip_cloud_init = templatefile("${path.module}/templates/glitchtip-cloud-init.yaml.tftpl", {
    compose_b64    = base64encode(file("${path.module}/glitchtip/docker-compose.yml"))
    bootstrap_b64  = base64encode(local.glitchtip_bootstrap_sh)
    caddyfile_b64  = base64encode(local.glitchtip_caddyfile)
    setup_b64      = base64encode(file("${path.module}/templates/glitchtip-setup.sh"))
    ssh_public_key = var.glitchtip_ssh_public_key
  })
}

resource "yandex_compute_instance" "glitchtip" {
  name               = var.glitchtip_name
  hostname           = "glitchtip"
  platform_id        = "standard-v3"
  zone               = var.zone
  service_account_id = yandex_iam_service_account.glitchtip.id

  resources {
    cores  = var.glitchtip_cores
    memory = var.glitchtip_memory_gb
  }

  boot_disk {
    initialize_params {
      image_id = data.yandex_compute_image.ubuntu.id
      size     = var.glitchtip_disk_gb
      type     = "network-ssd"
    }
  }

  network_interface {
    subnet_id          = yandex_vpc_subnet.staging.id
    nat                = true
    security_group_ids = [yandex_vpc_security_group.glitchtip.id]
  }

  metadata = merge(
    {
      "user-data" = local.glitchtip_cloud_init
    },
    var.glitchtip_ssh_public_key != "" ? { "ssh-keys" = "ubuntu:${var.glitchtip_ssh_public_key}" } : {}
  )

  labels = {
    role    = "glitchtip"
    project = "aclearo-staging"
  }

  lifecycle {
    ignore_changes = [boot_disk[0].initialize_params[0].image_id]
    precondition {
      condition     = length(var.glitchtip_ssh_cidrs) == 0 || var.glitchtip_ssh_public_key != ""
      error_message = "Set glitchtip_ssh_public_key when glitchtip_ssh_cidrs is non-empty."
    }
  }

  depends_on = [yandex_lockbox_secret_iam_member.glitchtip_payload]
}
