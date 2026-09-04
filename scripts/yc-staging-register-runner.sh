#!/usr/bin/env bash
# Ensure the GitHub Actions VPC runner is up and (optionally) registered.
#
# The migrate job in .github/workflows/deploy-staging.yml requires a self-hosted
# runner with label yc-staging-vpc inside network aclearo-staging (private PG).
#
# Usage:
#   ./scripts/yc-staging-register-runner.sh status
#   ./scripts/yc-staging-register-runner.sh start
#   ./scripts/yc-staging-register-runner.sh install
#   GH_RUNNER_REGISTRATION_TOKEN=... ./scripts/yc-staging-register-runner.sh register
#   ./scripts/yc-staging-register-runner.sh register   # uses gh api if the caller is a repo admin
#   ./scripts/yc-staging-register-runner.sh stop
#
# Env:
#   YC_RUNNER_INSTANCE   default aclearo-staging-yc-runner
#   YC_RUNNER_SSH_USER   default yc-user
#   YC_RUNNER_SSH_KEY    default ~/.ssh/aclearo-staging-runner (or YC_RUNNER_SSH_KEY)
#   GH_REPO              default zuevfoton-art/AllerGuide
#   GH_RUNNER_NAME       default aclearo-staging-yc
#   GH_RUNNER_LABELS     default yc-staging-vpc,linux,x64
#   GH_RUNNER_VERSION    default 2.337.0
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACTION="${1:-status}"

INSTANCE="${YC_RUNNER_INSTANCE:-aclearo-staging-yc-runner}"
SSH_USER="${YC_RUNNER_SSH_USER:-yc-user}"
SSH_KEY="${YC_RUNNER_SSH_KEY:-$HOME/.ssh/aclearo-staging-runner}"
GH_REPO="${GH_REPO:-zuevfoton-art/AllerGuide}"
RUNNER_NAME="${GH_RUNNER_NAME:-aclearo-staging-yc}"
RUNNER_LABELS="${GH_RUNNER_LABELS:-yc-staging-vpc,linux,x64}"
RUNNER_VERSION="${GH_RUNNER_VERSION:-2.337.0}"
PNPM_VERSION="${PNPM_VERSION:-10.34.4}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: $1 is required. See docs/staging-yandex-cloud.md §5." >&2
    exit 2
  fi
}

yc_bin() {
  if command -v yc >/dev/null 2>&1; then
    command -v yc
    return
  fi
  if [[ -x "$HOME/yandex-cloud/bin/yc" ]]; then
    echo "$HOME/yandex-cloud/bin/yc"
    return
  fi
  echo "Error: yc CLI not found." >&2
  exit 2
}

YC="$(yc_bin)"

instance_json() {
  "$YC" compute instance get --name "$INSTANCE" --format json
}

instance_status() {
  instance_json | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))"
}

instance_nat_ip() {
  instance_json | python3 -c "
import json,sys
i=json.load(sys.stdin)
ni=(i.get('network_interfaces') or [{}])[0]
print(((ni.get('primary_v4_address') or {}).get('one_to_one_nat') or {}).get('address') or '')
"
}

instance_priv_ip() {
  instance_json | python3 -c "
import json,sys
i=json.load(sys.stdin)
ni=(i.get('network_interfaces') or [{}])[0]
print((ni.get('primary_v4_address') or {}).get('address') or '')
"
}

ensure_running() {
  local status
  status="$(instance_status)"
  if [[ "$status" != "RUNNING" ]]; then
    echo "Starting $INSTANCE (was $status)..."
    "$YC" compute instance start --name "$INSTANCE"
  fi
  local ip
  ip="$(instance_nat_ip)"
  if [[ -z "$ip" ]]; then
    echo "Attaching one-to-one NAT..."
    "$YC" compute instance add-one-to-one-nat --name "$INSTANCE" --network-interface-index 0
    ip="$(instance_nat_ip)"
  fi
  if [[ -z "$ip" ]]; then
    echo "Error: instance has no public NAT IP." >&2
    exit 1
  fi
  echo "NAT $ip"
}

ssh_runner() {
  local ip
  ip="$(instance_nat_ip)"
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Error: SSH key not found: $SSH_KEY" >&2
    echo "Set YC_RUNNER_SSH_KEY to the private key that matches yc-user authorized_keys." >&2
    exit 2
  fi
  ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile="${YC_RUNNER_KNOWN_HOSTS:-$HOME/.ssh/known_hosts}" \
    -o ConnectTimeout=15 \
    -o BatchMode=yes \
    "${SSH_USER}@${ip}" "$@"
}

wait_ssh() {
  local i
  for i in $(seq 1 24); do
    if ssh_runner 'echo ok' >/dev/null 2>&1; then
      return 0
    fi
    sleep 5
  done
  echo "Error: SSH to $SSH_USER@$(instance_nat_ip) failed." >&2
  exit 1
}

install_runtime() {
  ssh_runner 'bash -s' <<EOF
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq curl git jq ca-certificates
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
if ! command -v pnpm >/dev/null 2>&1 || ! pnpm -v 2>/dev/null | grep -qx '${PNPM_VERSION}'; then
  sudo rm -f /usr/bin/pnpm /usr/bin/pnpx
  sudo npm install -g pnpm@${PNPM_VERSION}
fi
sudo mkdir -p /opt/actions-runner /etc/aclearo
printf '%s\n' yc-staging-vpc linux x64 | sudo tee /etc/aclearo/runner-labels >/dev/null
sudo chown ${SSH_USER}:${SSH_USER} /opt/actions-runner
cd /opt/actions-runner
if [[ ! -f ./config.sh ]]; then
  curl -fsSL -o /tmp/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \\
    https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
  tar xzf /tmp/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
  rm -f /tmp/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
fi
node -v
pnpm -v
./bin/Runner.Listener --version
EOF
}

registration_token() {
  if [[ -n "${GH_RUNNER_REGISTRATION_TOKEN:-}" ]]; then
    printf '%s' "$GH_RUNNER_REGISTRATION_TOKEN"
    return
  fi
  if ! command -v gh >/dev/null 2>&1; then
    echo "Error: set GH_RUNNER_REGISTRATION_TOKEN or install gh (repo admin)." >&2
    exit 2
  fi
  gh api -X POST "repos/${GH_REPO}/actions/runners/registration-token" --jq .token
}

register_runner() {
  local token
  token="$(registration_token)"
  if [[ -z "$token" ]]; then
    echo "Error: empty registration token (need repo admin: Actions: administration)." >&2
    exit 2
  fi
  ssh_runner "bash -s" <<EOF
set -euo pipefail
cd /opt/actions-runner
if [[ -f .runner ]]; then
  echo "Runner already configured (.runner present). Remove it first to re-register."
  cat .runner
  exit 0
fi
./config.sh --unattended --replace \\
  --url "https://github.com/${GH_REPO}" \\
  --token "${token}" \\
  --name "${RUNNER_NAME}" \\
  --labels "${RUNNER_LABELS}" \\
  --work _work
sudo ./svc.sh install "${SSH_USER}"
sudo ./svc.sh start
sudo ./svc.sh status || true
EOF
}

print_status() {
  local status ip priv
  status="$(instance_status)"
  ip="$(instance_nat_ip)"
  priv="$(instance_priv_ip)"
  echo "instance=${INSTANCE}"
  echo "status=${status}"
  echo "private_ip=${priv}"
  echo "nat_ip=${ip}"
  echo "ssh=${SSH_USER}@${ip:-?}"
  echo "labels=${RUNNER_LABELS}"
  if [[ "$status" == "RUNNING" && -n "$ip" && -f "$SSH_KEY" ]]; then
    if ssh_runner 'echo SSH_OK; test -f /opt/actions-runner/config.sh && echo RUNNER_BIN=yes || echo RUNNER_BIN=no; test -f /opt/actions-runner/.runner && echo REGISTERED=yes || echo REGISTERED=no; node -v 2>/dev/null; pnpm -v 2>/dev/null' 2>/dev/null; then
      :
    else
      echo "ssh=failed"
    fi
  fi
}

case "$ACTION" in
  status)
    print_status
    ;;
  start)
    ensure_running
    wait_ssh
    print_status
    ;;
  install)
    ensure_running
    wait_ssh
    install_runtime
    print_status
    ;;
  register)
    # Fail fast if the caller cannot mint a registration token (repo admin).
    registration_token >/dev/null
    ensure_running
    wait_ssh
    install_runtime
    register_runner
    print_status
    ;;
  stop)
    echo "Stopping $INSTANCE..."
    "$YC" compute instance stop --name "$INSTANCE"
    ;;
  *)
    echo "Unknown action: $ACTION (status|start|install|register|stop)" >&2
    exit 2
    ;;
esac
