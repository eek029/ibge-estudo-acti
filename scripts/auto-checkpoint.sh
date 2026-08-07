#!/usr/bin/env bash
# Checkpoint a cada 2 min no repo público ibge-estudo-acti (sem segredos).
# Uso: ./auto-checkpoint.sh [duração_segundos=14400]
set -euo pipefail

INTERVAL="${CHECKPOINT_INTERVAL:-120}"
DURATION="${1:-14400}"
REPO="${CHECKPOINT_REPO:-$HOME/projetos/ibge-estudo-public}"
PRIVATE="${CHECKPOINT_PRIVATE:-$HOME/projetos/ibge-estudo}"
VAULT_HANDOFF="${HOME}/Documentos/SecondBrain/tasks/handoff-ibge-acti-2026-08-07.md"
LOG="${PRIVATE}/scripts/auto-checkpoint.log"
END=$(( $(date +%s) + DURATION ))

mkdir -p "$(dirname "$LOG")"
cd "$REPO"

note() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" | tee -a "$LOG"; }

write_checkpoint() {
  local now ts host load
  now="$(date '+%Y-%m-%d %H:%M:%S %Z')"
  ts="$(date -Iseconds)"
  host="$(hostname 2>/dev/null || echo notebook)"
  load="$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null || echo n/a)"

  # probe site (no secrets): expect 302 without cookie
  local site_code="n/a" login_code="n/a" api_code="n/a"
  site_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://ibge2026.eek029.xyz/ 2>/dev/null || echo err)"
  login_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://ibge2026.eek029.xyz/login.html 2>/dev/null || echo err)"
  api_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://ibge2026.eek029.xyz/api/health 2>/dev/null || echo err)"

  cat > "$REPO/CHECKPOINT.md" << EOF
# CHECKPOINT — IBGE AC-TI estudo

> Auto-gerado. **Sem senhas.** Handoff humano/agentes: vault \`tasks/handoff-ibge-acti-2026-08-07.md\`.

| Campo | Valor |
|-------|--------|
| **Quando** | ${now} |
| **ISO** | ${ts} |
| **Host writer** | ${host} |
| **Load** | ${load} |
| **Site /** | HTTP ${site_code} (esperado **302** sem cookie) |
| **Login** | HTTP ${login_code} (esperado **200**) |
| **API health** | HTTP ${api_code} (esperado **200**) |
| **Prova** | 2026-08-30 (tarde) |
| **Repo** | https://github.com/eek029/ibge-estudo-acti |
| **URL** | https://ibge2026.eek029.xyz |

## Estado do produto

- App: aulas + quizzes + flashcards + cronograma + PWA
- Auth: login + forward_auth (PDFs protegidos)
- Progresso: API merge multi-dispositivo (cookie)
- GitHub: sem PDFs de cursinho comercial

## Quem continua

| Agente | Foco |
|--------|------|
| **Argos** | Código/produto, mais questões, deploy \`public/\` |
| **Atlas** | Caddy, \`ibge-progress\`, HTTPS, não tirar auth |
| **Hephaestus** | Notebook se vivo; senão Argos |

## Pedidos inbox

- \`00-Inbox/pedidos/2026-08-07-hephaestus-argos-ibge-estudo-continuidade.md\`
- \`00-Inbox/pedidos/2026-08-07-hephaestus-atlas-ibge-estudo-infra.md\`

## Próximo passo default

Ler handoff no vault → \`git pull\` neste repo → ver se site 302/200 ok → executar backlog Argos/Atlas.

---
*checkpoint interval ${INTERVAL}s · until $(date -d "@${END}" '+%Y-%m-%d %H:%M %Z' 2>/dev/null || echo end)*
EOF

  # mirror to private tree if present
  if [[ -d "$PRIVATE/public" ]]; then
    cp "$REPO/CHECKPOINT.md" "$PRIVATE/CHECKPOINT.md" 2>/dev/null || true
  fi
}

note "START interval=${INTERVAL}s duration=${DURATION}s repo=$REPO"

while (( $(date +%s) < END )); do
  write_checkpoint
  git add CHECKPOINT.md
  if git diff --cached --quiet; then
    note "no content change (still commit timestamp?)"
    # force update when only timestamp changed — always different file
    :
  fi
  if git commit -m "checkpoint: $(date -u '+%Y-%m-%dT%H:%MZ') site=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://ibge2026.eek029.xyz/ 2>/dev/null || echo x)" 2>>"$LOG"; then
    if git push origin main 2>>"$LOG"; then
      note "pushed checkpoint"
    else
      note "WARN push failed"
    fi
  else
    # empty commit if nothing staged change detection failed
    if git status --porcelain CHECKPOINT.md | grep -q .; then
      git add CHECKPOINT.md
      git commit -m "checkpoint: $(date -u '+%Y-%m-%dT%H:%MZ')" 2>>"$LOG" || note "commit skipped"
      git push origin main 2>>"$LOG" || note "WARN push failed"
    else
      note "unchanged after write (unexpected)"
    fi
  fi
  sleep "$INTERVAL"
done

note "END"
