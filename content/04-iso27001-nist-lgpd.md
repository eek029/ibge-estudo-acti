# 4. ISO/IEC 27001 · NIST · LGPD

**Edital:** boas práticas ISO/IEC 27001 e diretrizes NIST; legislação brasileira pertinente, especialmente LGPD.

---

## 4.1 ISO/IEC 27001 — Sistema de Gestão de Segurança da Informação (SGSI)

### Ideia central
Norma **certificável** que define requisitos para estabelecer, implementar, manter e melhorar continuamente um **SGSI**.

### Ciclo PDCA (contexto clássico de prova)
| Fase | O que faz no SGSI |
|------|-------------------|
| **Plan** | Escopo, política, avaliação de riscos, tratamento, objetivos |
| **Do** | Implementar controles e operar |
| **Check** | Monitorar, medir, auditoria interna, análise crítica |
| **Act** | Melhoria contínua, ações corretivas |

### Conceitos-chave
- **SGSI** — framework de gestão, não só “firewall”  
- **Controles** — anexos/listas de controles (histórico: Annex A; versões recentes reorganizam controles)  
- **ISO 27002** — **guia** de boas práticas/controles (não é a norma de certificação em si)  
- Análise de riscos como núcleo do sistema  
- Comprometimento da **alta direção**  

### O que decorar
- 27001 = requisitos do **sistema de gestão** (certificável)  
- 27002 = **código de prática** / implementação de controles  
- Foco em melhoria contínua e gestão de risco, não em produto específico  

---

## 4.2 NIST (diretrizes)

NIST = National Institute of Standards and Technology (EUA). Em concursos, o mais cobrado:

### NIST Cybersecurity Framework (CSF) — 5 funções
| Função | Ideia |
|--------|-------|
| **Identify** | Ativos, riscos, contexto de negócio |
| **Protect** | Controles preventivos |
| **Detect** | Anomalias e eventos |
| **Respond** | Resposta a incidentes |
| **Recover** | Restauração e lições aprendidas |

Há também publicações conhecidas (ex.: SP 800-53 — catálogo de controles; SP 800-61 — incidentes). Para esta prova, **CSF em 5 funções** é o núcleo.

---

## 4.3 LGPD — Lei nº 13.709/2018

### Conceitos base
| Termo | Definição curta |
|-------|-----------------|
| **Dado pessoal** | Identifica ou torna identificável pessoa natural |
| **Dado sensível** | Raça, religião, saúde, vida sexual, biometria, filiação política/sindical etc. |
| **Titular** | Pessoa a quem o dado se refere |
| **Controlador** | Quem toma as decisões sobre o tratamento |
| **Operador** | Quem trata em nome do controlador |
| **Encarregado (DPO)** | Canal com titulares e ANPD |
| **ANPD** | Autoridade Nacional de Proteção de Dados |
| **Tratamento** | Toda operação: coleta, uso, acesso, compartilhamento, eliminação… |

### Bases legais (exemplos frequentes)
Consentimento · legítimo interesse · execução de contrato · obrigação legal · políticas públicas · proteção da vida · tutela da saúde · proteção do crédito · exercício regular de direitos…

### Princípios (art. 6º) — saber a ideia
Finalidade · adequação · necessidade · livre acesso · qualidade dos dados · transparência · segurança · prevenção · não discriminação · responsabilização e prestação de contas  

### Direitos do titular (ideia)
Confirmação de tratamento, acesso, correção, anonimização/bloqueio/eliminação, portabilidade, informação sobre compartilhamentos, revogação de consentimento, oposição etc.

### Segurança e incidentes
- Medidas técnicas e administrativas de segurança  
- Comunicação de incidente à ANPD e ao titular quando houver risco/dano relevante (prazos e critérios na regulamentação — conceito: **comunicar quando necessário**)  

### Sanções administrativas (ordem de grandeza)
Advertência, multa (simples/diária), publicização, bloqueio/eliminação de dados, suspensão parcial do funcionamento do banco, proibição parcial/total do exercício de atividades de tratamento…  

### Relação com o cargo
Governança de TI no IBGE lida com dados censitários e administrativos → **sigilo estatístico + LGPD + segurança** caminham juntos.

---

## 4.4 Quadro comparativo rápido

| Instrumento | Natureza | Uso na prova |
|-------------|----------|--------------|
| ISO 27001 | Norma de SGSI certificável | PDCA, risco, alta direção |
| ISO 27002 | Boas práticas de controles | “como” implementar |
| NIST CSF | Framework voluntário (5 funções) | Identify→Recover |
| LGPD | Lei brasileira | titular, bases, princípios, ANPD |

---

## Checklist
- [ ] 27001 × 27002  
- [ ] PDCA no SGSI  
- [ ] 5 funções NIST CSF  
- [ ] Controlador × operador × encarregado × titular  
- [ ] Dado pessoal × sensível  
- [ ] 3+ princípios e 3+ direitos do titular  

## Erros / dúvidas
_(anote aqui)_
