# Sessão 03 — Absorção do Envelope Lacrado e Evolução para a Spec v2.0

**Data:** 2026-09-30
**Participantes:** Usuário e Antigravity
**Objetivo:** Absorver a mudança de requisitos do Dia 2 (Política de Reembolso v4), identificar novas ambiguidades, deliberar decisões de negócio e atualizar formalmente toda a cadeia de documentação antes de qualquer linha de código.

---

## 1. O Envelope Lacrado: Política v4

O usuário apresentou o Comunicado do RH contendo a Política de Reembolso v4 com vigência imediata:
1. **Limites variáveis por Centro de Custo:** Fornecidos externamente em `politica-v4.json`, incluindo categorias novas (`representacao` em `CC-COMERCIAL`) e vedações explícitas (`hospedagem: 0.00` em `CC-ENG-PLATAFORMA`). Centros de custo desconhecidos utilizam a política padrão.
2. **Despesas Internacionais:** Entrada admite campo `moeda` (ISO 4217, padrão `"BRL"`). Conversão cambial por data usando `cambio.json`. Limites aplicados sempre em BRL após conversão.
3. **Fila de Aprovação Manual (Item C):** Itens com valor reembolsável superior a R$ 500,00 entram em estado pendente de aprovação do gestor (`PENDENTE_APROVACAO`).

Os quatro arquivos anexos foram salvos em `exemplos/envelope/` e commitados (`5c031ee`).

---

## 2. Identificação de Novas Ambiguidades e Deliberações

O assistente mapeou 6 novas ambiguidades decorrentes do comunicado, deliberadas pelo usuário:

- **AMB-E01 (Câmbio em fins de semana / feriados):** O item `e-004` (30.00 EUR) ocorreu em 2026-07-18 (sábado), data sem cotação publicada.
  - *Decisão:* Adotar a taxa do **último dia útil imediatamente anterior** (sexta-feira, 2026-07-17: EUR = 5.96), alinhado à prática oficial PTAX do Banco Central.
- **AMB-E02 (Moeda sem cotação na tabela):** O item `e-006` foi lançado em GBP (Londres), inexistente em `cambio.json`.
  - *Decisão:* **Recusa integral (R$ 0,00)** com status `RECUSADO` e justificativa explícita de ausência de cotação oficial, preservando a segurança financeira da empresa sem inventar taxas arbitrárias.
- **AMB-E03 (Herança e fallback de centros de custo):**
  - *Decisão:* Adoção da **Opção B (Fallback Aditivo)**. Centro de custo desconhecido usa integralmente o bloco `padrao`. Centro de custo cadastrado usa seus limites e herda categorias do `padrao` quando omitidas, salvo quando explicitamente proibidas com limite zero (`CC-ENG-PLATAFORMA`).
- **AMB-E04 (Nota fiscal em moeda estrangeira):**
  - *Decisão:* A obrigatoriedade de nota fiscal para valores > R$ 100 é avaliada **após a conversão para BRL**, aplicando-se o acréscimo de 50% nos limites quando em viagem.
- **AMB-E05 (Interface da CLI):**
  - *Decisão:* CLI aceitará flags opcionais `--politica` e `--cambio` apontando por padrão para os arquivos em `exemplos/envelope/`, mantendo compatibilidade regressiva com a invocação básica.
- **AMB-E06 (Item C — Fila de aprovação manual):**
  - *Decisão:* Incluir no escopo a regra RN-015 com status `PENDENTE_APROVACAO` para lançamentos com reembolso calculado superior a R$ 500,00.

---

## 3. Atualização Documental Realizada

1. **`specs/001-motor-reembolso/spec.md` (Versão 2.0):**
   - Inclusão das regras RN-013 (Câmbio), RN-014 (Centros de Custo) e RN-015 (Fila de aprovação > R$ 500).
   - Inclusão de `AMB-E01` a `AMB-E06`.
   - Atualização do pipeline de processamento e critérios de aceite.
2. **`specs/001-motor-reembolso/DECISIONS.md`:**
   - Registro formal da decisão `D-001` documentando o gatilho, alterações de spec, invalidações, tasks criadas e custo de mudança.
3. **`specs/001-motor-reembolso/plan.md` (Versão 2.0):**
   - Desenho do módulo cambial com busca de dia útil anterior e carregador de política externa por centro de custo.
4. **`specs/001-motor-reembolso/tasks.md`:**
   - Adição das tarefas `T-015` a `T-019` na Fase 5 (Envelope) e atualização da matriz de rastreabilidade.

---

## 4. Próximo Passo

Iniciar a implementação em código seguindo estritamente as tasks sequenciais com commits atômicos rastreáveis (`T-001` em diante).
