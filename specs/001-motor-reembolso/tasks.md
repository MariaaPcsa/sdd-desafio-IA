# Tasks — Motor de Cálculo de Reembolso

> Cada task é pequena o bastante para virar **um commit**.
> Formato do commit: `feat(T-003): <descrição>` ou `test(T-003): <descrição>`.
> Marque `[x]` conforme conclui ao longo do caminho.

---

## Fase 1 — Fundação

- [ ] **T-001** — Configurar ambiente TypeScript, scripts no `package.json` e runner de testes
  - **Atende:** Infraestrutura, plan.md Seção 1
  - **Aceite:** `npm run typecheck` e `npm test` executam sem erros.
  - **Commit:**

- [ ] **T-002** — Definir contratos de dados e interfaces TypeScript de entrada e saída
  - **Atende:** spec.md Seção 4 (Entrada e Saída), plan.md Seção 3
  - **Aceite:** Arquivo `src/types.ts` criado e compilando sem erros.
  - **Commit:**

- [ ] **T-003** — Implementar módulo de precisão monetária e truncamento em centavos inteiros
  - **Atende:** RN-011, AMB-009, DT-001
  - **Aceite:** Testes unitários de conversão e truncamento de 3 casas passam em `tests/rules.test.ts`.
  - **Commit:**

- [ ] **T-004** — Criar módulo de configuração declarativa da política de reembolso
  - **Atende:** plan.md Seção 4
  - **Aceite:** `src/policy.ts` criado com limites e multiplicadores isolados; testes de cálculo de tetos passam.
  - **Commit:**

---

## Fase 2 — Regras de Negócio e Pipeline do Motor

- [ ] **T-005** — Implementar validação do período de competência
  - **Atende:** RN-007, AMB-008
  - **Aceite:** Teste `test('RN-007: despesa fora do período de competência é recusada com R$ 0,00')` passa.
  - **Commit:**

- [ ] **T-006** — Implementar validação e normalização de categorias elegíveis
  - **Atende:** RN-009, AMB-010
  - **Aceite:** Teste `test('RN-009: categoria inválida é recusada; categoria em maiúsculas é normalizada')` passa.
  - **Commit:**

- [ ] **T-007** — Implementar detecção e tratamento de despesas duplicadas
  - **Atende:** RN-008, AMB-005
  - **Aceite:** Teste `test('RN-008: despesa duplicada é recusada integralmente e não consome limite')` passa.
  - **Commit:**

- [ ] **T-008** — Implementar conformidade fiscal e fronteira de nota fiscal (R$ 100,00)
  - **Atende:** RN-005, AMB-002, AMB-003
  - **Aceite:** Testes `test('RN-005: R$ 100,00 sem nota é aprovado')` e `test('RN-005: R$ 100,01 sem nota é recusado com R$ 0,00')` passam.
  - **Commit:**

- [ ] **T-009** — Implementar agregador diário e limites para Alimentação e Transporte com corte de excedente
  - **Atende:** RN-001, RN-002, RN-004, AMB-001
  - **Aceite:** Testes de teto diário de alimentação (R$ 60) e transporte (R$ 80) com glosa parcial e zeramento de despesa subsequente passam.
  - **Commit:**

- [ ] **T-010** — Implementar extração de multiplicador de diárias e limites de Hospedagem
  - **Atende:** RN-003, AMB-006, DT-003
  - **Aceite:** Teste `test('RN-003: hospedagem multiplica teto por diárias na descrição')` passa.
  - **Commit:**

- [ ] **T-011** — Implementar tratamento de estornos e valores negativos
  - **Atende:** RN-010, AMB-007, DT-004
  - **Aceite:** Teste `test('RN-010: estorno negativo subtrai do total e restabelece limite diário')` passa.
  - **Commit:**

- [ ] **T-012** — Implementar ampliação de limites para colaborador em viagem e consolidação de resumo
  - **Atende:** RN-006, RN-012, AMB-004, AMB-011
  - **Aceite:** Teste de ampliação de 50% para viagem e validação matemática de totais do resumo passam.
  - **Commit:**

---

## Fase 3 — Casos de Borda

- [ ] **T-013** — Implementar bateria de testes para todos os casos de borda da Seção 7 da spec
  - **Atende:** spec.md Seção 7 (Casos de Borda)
  - **Aceite:** Bateria de testes em `tests/edge_cases.test.ts` executando com 100% de aprovação.
  - **Commit:**

---

## Fase 4 — Interface CLI e Validação Ponta a Ponta

- [ ] **T-014** — Implementar comando CLI com I/O de arquivos e teste E2E do arquivo de referência
  - **Atende:** Interface CLI, Critérios de Aceite da spec
  - **Aceite:** `npm start -- calcular --input exemplos/despesas-exemplo.json --output ...` gera arquivo JSON idêntico ao contrato da spec e teste E2E passa.
  - **Commit:**

---

## Fase 5 — Envelope (Reservada para o Dia 2)

*(Novas tasks serão adicionadas aqui a partir do recebimento da mudança de requisito às 10h do Dia 2, mantendo a numeração sequencial T-015, T-016...)*

---

## Matriz de Cobertura e Rastreabilidade

| Regra da Spec | Task Associada | Nome do Teste Automatizado |
|---|---|---|
| **RN-001** (Alimentação) | T-009 | `RN-001: limite diário de alimentação com corte parcial e esgotamento subsequente` |
| **RN-002** (Transporte) | T-009 | `RN-002: limite diário de transporte urbano de R$ 80` |
| **RN-003** (Hospedagem) | T-010 | `RN-003: hospedagem calcula teto multiplicando diárias da descrição` |
| **RN-004** (Reembolso parcial) | T-009 | `RN-004: despesa excedente recebe status APROVADO_PARCIAL e glosa saldo` |
| **RN-005** (Nota Fiscal) | T-008 | `RN-005: R$ 100,00 sem nota é aprovado; R$ 100,01 sem nota é recusado integralmente` |
| **RN-006** (Em Viagem) | T-012 | `RN-006: colaborador em viagem tem todos os limites acrescidos de 50%` |
| **RN-007** (Competência) | T-005 | `RN-007: despesa fora do período de competência é recusada com R$ 0,00` |
| **RN-008** (Duplicatas) | T-007 | `RN-008: despesa duplicada é recusada e não consome limites` |
| **RN-009** (Categorias) | T-006 | `RN-009: categoria inválida é recusada; categoria em maiúsculas é normalizada` |
| **RN-010** (Estornos) | T-011 | `RN-010: estorno negativo subtrai do total e restabelece limite diário` |
| **RN-011** (Truncamento) | T-003 | `RN-011: valor com três casas decimais é truncado em duas casas` |
| **RN-012** (Justificativas) | T-012 | `RN-012: despesa com múltiplas violações reporta todas as justificativas` |
