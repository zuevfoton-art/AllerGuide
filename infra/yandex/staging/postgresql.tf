# Managed PostgreSQL — private IP only (no assign_public_ip).
# Accessible from Serverless Container and the VPC GitHub runner via the same subnet.

resource "yandex_mdb_postgresql_cluster" "staging" {
  name        = var.pg_cluster_name
  environment = "PRESTABLE"
  network_id  = yandex_vpc_network.staging.id
  security_group_ids = [yandex_vpc_security_group.staging.id]

  config {
    version = 15
    resources {
      resource_preset_id = "s2.micro"
      disk_type_id       = "network-ssd"
      disk_size          = 20
    }

    access {
      # Allow connections from Serverless Containers
      serverless = true
    }

    postgresql_config = {
      max_connections = "100"
    }
  }

  host {
    zone             = var.zone
    subnet_id        = yandex_vpc_subnet.staging.id
    assign_public_ip = false
  }

  user {
    name     = var.pg_user
    password = var.pg_password
  }

  database {
    name  = var.pg_database
    owner = var.pg_user
  }

  deletion_protection = true
}

locals {
  pg_host = yandex_mdb_postgresql_cluster.staging.host[0].fqdn
  pg_url  = "postgresql://${var.pg_user}:${var.pg_password}@${local.pg_host}:6432/${var.pg_database}?sslmode=require"
}
