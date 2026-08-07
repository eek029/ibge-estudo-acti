# CHECKPOINT — IBGE AC-TI estudo

> Auto-gerado. **Sem senhas.** Handoff humano/agentes: vault `tasks/handoff-ibge-acti-2026-08-07.md`.

| Campo | Valor |
|-------|--------|
| **Quando** | 2026-08-07 13:46:51 -03 |
| **ISO** | 2026-08-07T13:46:51-03:00 |
| **Host writer** | henrique-Inspiron-15-3520 |
| **Load** | 0.06 0.16 0.30 |
| **Site /** | HTTP 302 (esperado **302** sem cookie) |
| **Login** | HTTP 200 (esperado **200**) |
| **API health** | HTTP 200 (esperado **200**) |
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
| **Argos** | Código/produto, mais questões, deploy `public/` |
| **Atlas** | Caddy, `ibge-progress`, HTTPS, não tirar auth |
| **Hephaestus** | Notebook se vivo; senão Argos |

## Pedidos inbox

- `00-Inbox/pedidos/2026-08-07-hephaestus-argos-ibge-estudo-continuidade.md`
- `00-Inbox/pedidos/2026-08-07-hephaestus-atlas-ibge-estudo-infra.md`

## Próximo passo default

Ler handoff no vault → `git pull` neste repo → ver se site 302/200 ok → executar backlog Argos/Atlas.

---
*checkpoint interval 120s · until 2026-08-07 15:42 -03*
