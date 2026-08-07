# 5. Governança de TI · Serviços · SLA · Catálogo · Mudanças

**Edital (4.1):** alinhamento estratégico de TI; gestão de serviços; SLA; catálogo de serviços; gestão de incidentes, problemas e mudanças; melhoria contínua de processos.

---

## 5.1 Governança × Gestão

| | Governança | Gestão |
|--|------------|--------|
| Foco | **Direcionar e avaliar** (o que deve ser feito / se está certo) | **Planejar, construir, executar, monitorar** |
| Pergunta | Estamos fazendo as coisas certas? | Estamos fazendo as coisas direito? |
| Atores | Alta administração, comitês | Gerentes, equipes operacionais |

**Alinhamento estratégico:** TI suporta objetivos de negócio (não “TI por TI”).  
Ferramentas: comitê de TI, portfólio, indicadores, COBIT (ver arquivo 06).

---

## 5.2 Gestão de serviços de TI (visão ITIL)

- **Serviço:** meio de entregar valor ao cliente facilitando resultados, sem que o cliente assuma todos os custos/riscos.  
- **Valor** = utilidade (fit for purpose) + garantia (fit for use: segurança, continuidade, capacidade, disponibilidade).  

---

## 5.3 Catálogo de serviços

- Lista **visível ao cliente/usuário** dos serviços disponíveis  
- Diferente do **portfólio** (que inclui pipeline + catálogo + retired)  
- Contém: descrição, para quem é, como solicitar, níveis esperados, dono do serviço  

---

## 5.4 SLA, OLA, UC

| Acordo | Entre quem | Ideia |
|--------|------------|-------|
| **SLA** (Service Level Agreement) | Provedor ↔ **cliente** | Níveis de serviço acordados (ex.: 99,5% disponibilidade) |
| **OLA** (Operational Level Agreement) | Times **internos** | Suporta o SLA |
| **UC** (Underpinning Contract) | Provedor ↔ **fornecedor externo** | Contrato que sustenta o SLA |

**Métricas comuns:** disponibilidade, tempo de resposta, tempo de resolução, taxa de reabertura.

---

## 5.5 Incidentes × Problemas × Mudanças

### Incidente
- Interrupção não planejada ou redução de qualidade de um serviço  
- Objetivo: **restaurar o serviço o mais rápido possível** (não necessariamente achar a causa raiz)  
- Prioridade ≈ impacto × urgência  

### Problema
- Causa (ainda não identificada ou conhecida) de um ou mais incidentes  
- Objetivo: **causa raiz** e solução definitiva / workaround  
- **Known error:** problema com causa documentada e workaround  

### Mudança (Change)
- Adição, modificação ou remoção que pode afetar serviços  
- Tipos clássicos: **padrão** (pré-aprovada), **normal**, **emergencial**  
- CAB (Change Advisory Board) assessora mudanças de maior risco  
- Objetivo: maximizar benefício com risco controlado  

### Fluxo mental de prova
```
Incidente → restaura serviço
Problema  → evita recorrência (causa raiz)
Mudança   → implementa alteração com controle
```

---

## 5.6 Melhoria contínua

- Ciclo **PDCA** (Plan-Do-Check-Act)  
- No ITIL 4: **Continual Improvement** (modelo de 7 passos / improvement model)  
- Métricas → gap → plano → implementar → avaliar  
- Não é projeto único: **cultura** e processo permanente  

---

## 5.7 Indicadores úteis

| Indicador | Uso |
|-----------|-----|
| Disponibilidade (%) | Uptime do serviço |
| MTTR | Tempo médio de reparo/restauração |
| MTTA | Tempo médio até atendimento |
| Backlog de incidentes | Fila |
| % mudanças com falha | Qualidade de change |

---

## Checklist
- [ ] Governança × gestão  
- [ ] SLA × OLA × UC  
- [ ] Catálogo × portfólio  
- [ ] Incidente × problema × known error × mudança  
- [ ] Tipos de mudança e CAB  
- [ ] Melhoria contínua / PDCA  

## Erros / dúvidas
_(anote aqui)_
