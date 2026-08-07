#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rsync -az --delete "$ROOT/public/" vps:/home/ubuntu/projetos/ibge-estudo/public/
echo "Deploy OK → /home/ubuntu/projetos/ibge-estudo/public"
echo "Lembre de recarregar o Caddy se mudou o Caddyfile: ssh vps 'sudo systemctl reload caddy'"
