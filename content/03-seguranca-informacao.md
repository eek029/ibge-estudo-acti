# 3. Segurança da informação

**Edital:** princípios fundamentais “ACID” (autenticidade, confidencialidade, integridade, disponibilidade); políticas; gestão de riscos; controles de acesso; criptografia básica; segurança em redes e aplicações; gestão de incidentes; continuidade de negócios e recuperação de desastres.

> **Nota:** no edital está escrito **ACID** listando autenticidade + CIA. Em segurança o clássico é **CIA** (Confidentiality, Integrity, Availability); **autenticidade** e **não repúdio** costumam aparecer como atributos adicionais. Em prova, use a lista do edital.

---

## 3.1 Princípios (memorize com exemplos)

| Princípio | Significado | Exemplo de quebra | Controle típico |
|-----------|-------------|-------------------|-----------------|
| **Confidencialidade** | Só quem deve, acessa | Vazamento de dados | Criptografia, ACL, classificação |
| **Integridade** | Dado não alterado indevidamente | Adulteração de registro | Hash, assinatura, logs |
| **Disponibilidade** | Serviço acessível quando necessário | DDoS, falha de servidor | Redundância, backup, HA |
| **Autenticidade** | Garantia de origem/identidade | Impersonation | MFA, certificados, assinatura |

**Não repúdio:** não poder negar autoria de uma ação (assinatura digital forte).

---

## 3.2 Políticas de segurança da informação

- Documento de alto nível: o que a organização **exige**  
- Desdobra em normas, procedimentos e padrões  
- Deve ser aprovada pela alta administração, comunicada e revisada  
- Exemplos: política de senhas, uso aceitável, classificação da informação, BYOD  

**Tríade documental:** Política → Normas/Padrões → Procedimentos/Instruções  

---

## 3.3 Gestão de riscos de segurança

Ciclo comum (alinha ISO 27005 / boas práticas):

1. Identificar ativos e ameaças/vulnerabilidades  
2. Avaliar probabilidade e impacto  
3. Tratar: **mitigar, transferir, evitar, aceitar**  
4. Monitorar residual e novos riscos  

**Ameaça** × **vulnerabilidade** × **impacto** → risco  
- Ameaça: agente/evento potencial  
- Vulnerabilidade: fraqueza explorável  
- Controle: reduz probabilidade e/ou impacto  

---

## 3.4 Controles de acesso

### AAA
- **Authentication** — quem é você  
- **Authorization** — o que pode fazer  
- **Accounting/Audit** — o que fez  

### Modelos
| Modelo | Ideia |
|--------|-------|
| **DAC** | Dono do recurso decide |
| **MAC** | Rótulos/classificação (militar) |
| **RBAC** | Papéis/funções (mais comum em empresas) |
| **ABAC** | Atributos (contexto, hora, local…) |

### Princípios
- **Menor privilégio**  
- **Need to know**  
- **Segregação de funções** (SoD)  
- **MFA** (algo que sabe / tem / é)  

---

## 3.5 Criptografia básica

| Tipo | Chave | Uso típico |
|------|-------|------------|
| **Simétrica** | mesma chave | volume, velocidade (AES) |
| **Assimétrica** | par público/privado | troca de chaves, assinatura (RSA, ECC) |
| **Hash** | sem chave (função one-way) | integridade (SHA-256); não é criptografia reversível |

- **Assinatura digital:** hash + chave privada do signatário → autenticidade + integridade + não repúdio  
- **Certificado digital:** vincula chave pública a uma identidade (ICP-Brasil no Brasil)  
- **TLS/HTTPS:** canal confidencial na rede  

---

## 3.6 Segurança em redes e aplicações

### Redes (conceitos de prova)
- **Firewall** — filtra tráfego  
- **IDS/IPS** — detecta / bloqueia intrusões  
- **VPN** — túnel cifrado  
- **DMZ** — zona desmilitarizada para serviços expostos  
- Segmentação de rede  

### Aplicações
- Validação de entrada, autenticação forte, gestão de sessão  
- **OWASP Top 10** (saber que existe: injection, broken auth, XSS… — nomes gerais bastam)  
- Atualização/patch, hardening  

### Malware (noções)
Vírus, worm, trojan, ransomware, spyware, rootkit, phishing (engenharia social)

---

## 3.7 Gestão de incidentes de segurança

Fluxo típico:

1. **Preparação** (plano, time, canais)  
2. **Detecção e análise**  
3. **Contenção** (curto e longo prazo)  
4. **Erradicação**  
5. **Recuperação**  
6. **Lições aprendidas** (post-mortem)

**Incidente** ≠ evento: incidente é violação ou ameaça iminente às políticas/princípios de SI.

---

## 3.8 Continuidade de negócios e DR

| Conceito | Foco |
|----------|------|
| **BCP** (Business Continuity Plan) | Manter **negócio** operando |
| **DRP** (Disaster Recovery Plan) | Recuperar **TI**/sistemas após desastre |
| **RTO** | Tempo máximo aceitável de recuperação |
| **RPO** | Perda máxima de dados aceitável (em tempo) |
| **Backup** | Cópia para restauração (3-2-1: 3 cópias, 2 mídias, 1 offsite — conceito útil) |

Testes de plano: mesa (tabletop), simulação, teste completo.

---

## Checklist
- [ ] CIA + autenticidade com exemplo de cada  
- [ ] RBAC e menor privilégio  
- [ ] Simétrica × assimétrica × hash  
- [ ] Etapas de resposta a incidente  
- [ ] RTO × RPO × BCP × DRP  

## Erros / dúvidas
_(anote aqui)_
