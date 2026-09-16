#!/bin/bash
# First-boot install: Docker Compose plugin + Caddy binary + start GlitchTip.
# Ubuntu 22.04 has docker.io/jq in apt, but not the caddy package.
set -euo pipefail
mkdir -p /var/log
exec > >(tee -a /var/log/glitchtip-setup.log) 2>&1
echo "glitchtip-setup: start $(date -u +%FT%TZ)"

systemctl enable --now docker
for _ in $(seq 1 30); do
  if docker info >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
if ! docker info >/dev/null 2>&1; then
  echo "glitchtip-setup: docker did not become ready" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  if ! apt-get install -y docker-compose-v2; then
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -fsSL https://github.com/docker/compose/releases/download/v2.35.1/docker-compose-linux-x86_64 \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  fi
fi
docker compose version

if ! command -v caddy >/dev/null 2>&1; then
  curl -fsSL https://github.com/caddyserver/caddy/releases/download/v2.10.0/caddy_2.10.0_linux_amd64.tar.gz \
    -o /tmp/caddy.tgz
  tar -xzf /tmp/caddy.tgz -C /usr/local/bin caddy
  chmod +x /usr/local/bin/caddy
  rm -f /tmp/caddy.tgz
fi
caddy version

mkdir -p /etc/caddy
cp /opt/glitchtip/Caddyfile /etc/caddy/Caddyfile

cat >/etc/systemd/system/caddy.service <<'UNIT'
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable glitchtip-bootstrap.service
systemctl enable glitchtip-bootstrap-admin.service
if ! systemctl start glitchtip-bootstrap.service; then
  echo "glitchtip-setup: first bootstrap start failed; systemd Restart=on-failure will retry" >&2
fi
if ! systemctl start glitchtip-bootstrap-admin.service; then
  echo "glitchtip-setup: admin/DSN bootstrap will retry (needs GLITCHTIP_ADMIN_PASSWORD + healthy compose)" >&2
fi
systemctl enable --now caddy.service
systemctl enable --now glitchtip-acme-retry.timer
echo "glitchtip-setup: done $(date -u +%FT%TZ)"
