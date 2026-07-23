resource "yandex_vpc_network" "staging" {
  name        = var.network_name
  description = "Aclearo staging VPC (private Postgres, serverless API, GH runner)"
}

resource "yandex_vpc_subnet" "staging" {
  name           = "${var.network_name}-subnet-a"
  zone           = var.zone
  network_id     = yandex_vpc_network.staging.id
  v4_cidr_blocks = [var.subnet_cidr]
}

resource "yandex_vpc_security_group" "staging" {
  name        = "${var.network_name}-sg"
  description = "Staging: Postgres internal, runner egress, API ingress from ALB"
  network_id  = yandex_vpc_network.staging.id

  # Managed PostgreSQL — only from VPC workloads
  ingress {
    description    = "PostgreSQL from VPC"
    protocol       = "TCP"
    port           = 6432
    v4_cidr_blocks = [var.subnet_cidr]
  }

  # GitHub runner — SSH from your office IP (tighten in production)
  dynamic "ingress" {
    for_each = var.runner_ssh_public_key != "" ? [1] : []
    content {
      description    = "SSH to migration runner (restrict source in tfvars / SG later)"
      protocol       = "TCP"
      port           = 22
      v4_cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    description    = "Egress to internet (runner updates, OpenAI proxy, GH)"
    protocol       = "ANY"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}
