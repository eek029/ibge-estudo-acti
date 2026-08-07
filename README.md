# IBGE AC-TI · Estudo (PSS 02/2026)

App web de estudo para **Analista Censitário — Tecnologia da Informação**  
Processo Seletivo Simplificado IBGE nº **02/2026** (Instituto Avalia).

**Demo:** https://ibge2026.eek029.xyz  

> Prova: **30/08/2026** (tarde) · 60 questões · corte ≥ 40% e ≥ 1 ponto em cada disciplina.

## O que tem

| Recurso | Descrição |
|---------|-----------|
| **Aulas** | Português, Raciocínio Lógico e **7 blocos de TI** (PMBOK, riscos, segurança, ISO/NIST/LGPD, governança, COBIT/ITIL, gestão estratégica) |
| **Quizzes** | Banco original com gabarito e explicação; simulado misto; modo “só erros” |
| **Flashcards** | Revisão rápida |
| **Cronograma** | Dia a dia até a véspera da prova |
| **PDFs** | Editais oficiais do IBGE |
| **Sync (opcional)** | API Python para progresso multi-dispositivo (self-host) |
| **PWA** | Instalável no celular; cache do shell offline |

## Distribuição da prova

- **35** Conhecimentos Específicos (TI)
- **15** Língua Portuguesa  
- **10** Raciocínio Lógico Quantitativo  

## Rodar local

```bash
cd public
python3 -m http.server 8765
# http://127.0.0.1:8765
```

## Self-host com sync

```bash
cp server/ibge-progress.env.example server/ibge-progress.env
# edite IBGE_SYNC_TOKEN
python3 server/app.py
# aponte o reverse proxy /api -> :8791
# em public/data/config.json: syncEnabled true + token
```

## Aviso de conteúdo

- **Incluído:** código do app, aulas/quizzes originais, editais oficiais IBGE.
- **Não incluído:** apostilas de cursinhos comerciais (direitos autorais de terceiros).

## Contribuições

Issues e PRs são bem-vindos: mais questões, correções de conteúdo, melhorias de UX.

## Licença

Código: **MIT**. Editais: documentos públicos oficiais do IBGE.

## Multi-usuário

Cada pessoa entra com **usuário + senha**. Progresso fica em `server/data/progress/<id>.json`.

```bash
cd server
# configure ibge-progress.env (SESSION_SECRET obrigatório)
python3 add_user.py maria 'SenhaForte' 'Maria'
python3 app.py
```

Login em `/login.html`. Não commite `data/users.json` nem progresso real.
