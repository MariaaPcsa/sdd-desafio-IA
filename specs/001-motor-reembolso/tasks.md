# Tasks — Motor de Cálculo de Reembolso

> Cada task é pequena o bastante para virar **um commit**.
> Formato do commit: `feat(T-003): <descrição>` ou `test(T-003): <descrição>`.
> Marque `[x]` conforme conclui ao longo do caminho.

---

## Fase 1 — Fundação

- [x] **T-001** — Configurar ambiente TypeScript, scripts no `package.json` e runner de testes
  - **Atende:** Infraestrutura, plan.md Seção 1
  - **Aceite:** `npm run typecheck` e `npm test` executam sem erros.
  - **Commit:** `feat(T-001)`

- [x] **T-002** — Definir contratos de dados e interfaces TypeScript de entrada, saída, política e câmbio
  - **Atende:** spec.md Seção 4, plan.md Seção 3
  - **Aceite:** Arquivo `src/types.ts` criado e compilando sem erros.
  - **Commit:** `feat(T-002)`

- [x] **T-003** — Implementar módulo de precisão monetária e truncamento em centavos inteiros
  - **Atende:** RN-011, AMB-009, DT-001
  - **Aceite:** Testes unitários de conversão e truncamento de 3 casas passam em `tests/rules.test.ts`.
  - **Commit:** `feat(T-003)`

- [x] **T-004** — Criar módulo de configuração declarativa da política de reembolso padrão
  - **Atende:** plan.md Seção 4
  - **Aceite:** `src/policy.ts` criado com limites e multiplicadores isolados; testes de cálculo de tetos passam.
  - **Commit:** `feat(T-004)`

---

## Fase 2 — Regras de Negócio e Pipeline Central

- [x] **T-005** — Implementar validação do período de competência
  - **Atende:** RN-007, AMB-008
  - **Aceite:** Teste `test('RN-007: despesa fora do período de competência é recusada com R$ 0,00')` passa.
  - **Commit:** `feat(T-005)`

- [x] **T-006** — Implementar validação e normalização de categorias elegíveis
  - **Atende:** RN-009, AMB-010
  - **Aceite:** Teste `test('RN-009: categoria inválida é recusada; categoria em maiúsculas é normalizada')` passa.
  - **Commit:** `feat(T-006)`

- [x] **T-007** — Implementar detecção e tratamento de despesas duplicadas
  - **Atende:** RN-008, AMB-005
  - **Aceite:** Teste `test('RN-008: despesa duplicada é recusada integralmente e não consome limite')` passa.
  - **Commit:** `feat(T-007)`

- [x] **T-008** — Implementar conformidade fiscal e fronteira de nota fiscal (R$ 100,00)
  - **Atende:** RN-005, AMB-002, AMB-003
  - **Aceite:** Testes `test('RN-005: R$ 100,00 sem nota é aprovado')` e `test('RN-005: R$ 100,01 sem nota é recusado com R$ 0,00')` passam.
  - **Commit:** `feat(T-008)`

- [x] **T-009** — Implementar agregador diário e limites para Alimentação e Transporte com corte de excedente
  - **Atende:** RN-001, RN-002, RN-004, AMB-001
  - **Aceite:** Testes de teto diário de alimentação e transporte com glosa parcial e zeramento de despesa subsequente passam.
  - **Commit:** `feat(T-009)`

- [x] **T-010** — Implementar extração de multiplicador de diárias e limites de Hospedagem
  - **Atende:** RN-003, AMB-006, DT-003
  - **Aceite:** Teste `test('RN-003: hospedagem multiplica teto por diárias na descrição')` passa.
  - **Commit:** `feat(T-010)`

- [x] **T-011** — Implementar tratamento de estornos e valores negativos
  - **Atende:** RN-010, AMB-007, DT-004
  - **Aceite:** Teste `test('RN-010: estorno negativo subtrai do total e restabelece limite diário')` passa.
  - **Commit:** `feat(T-011)`

- [x] **T-012** — Implementar ampliação de limites para colaborador em viagem e consolidação de resumo
  - **Atende:** RN-006, RN-012, AMB-004, AMB-011
  - **Aceite:** Teste de ampliação de 50% para viagem e validação matemática de totais do resumo passam.
  - **Commit:** `feat(T-012)`

---

## Fase 3 — Casos de Borda

- [x] **T-013** — Implementar bateria de testes para todos os casos de borda da Seção 7 da spec
  - **Atende:** spec.md Seção 7 (Casos de Borda)
  - **Aceite:** Bateria de testes em `tests/edge_cases.test.ts` executando com 100% de aprovação.
  - **Commit:** `test(T-013)`

---

## Fase 4 — Interface CLI Inicial

- [ ] **T-014** — Implementar comando CLI com I/O de arquivos e teste E2E do arquivo de referência v3
  - **Atende:** Interface CLI, Critérios de Aceite da spec
  - **Aceite:** `npm start -- calcular --input exemplos/despesas-exemplo.json --output ...` gera arquivo JSON idêntico ao contrato da spec e teste E2E passa.
  - **Commit:**

---

## Fase 5 — Envelope (Política v4, Centros de Custo, Câmbio e Aprovação Manual)

- [ ] **T-015** — Implementar carregamento e resolução dinâmica de limites por Centro de Custo (`RN-014`)
  - **Atende:** RN-014, AMB-E03, DT-002
  - **Aceite:** Testes de resolução de limites para `CC-COMERCIAL`, `CC-ENG-PLATAFORMA` (hospedagem 0) e centro desconhecido com fallback padrão passam.
  - **Commit:**

- [ ] **T-016** — Implementar módulo de conversão cambial por data com PTAX do dia útil anterior (`RN-013`)
  - **Atende:** RN-013, AMB-E01, AMB-E02, DT-001
  - **Aceite:** Testes de conversão em dia útil, conversão em sábado usando sexta-feira e recusa integral de moeda não cotada (GBP) passam.
  - **Commit:**

- [ ] **T-017** — Integrar validação fiscal em BRL para despesas internacionais (`RN-005` + `RN-013`)
  - **Atende:** RN-005, RN-013, AMB-E04
  - **Aceite:** Testes de USD sem nota > R$ 100 BRL recusado e EUR sem nota <= R$ 100 BRL aprovado passam.
  - **Commit:**

- [ ] **T-018** — Implementar classificação da fila de aprovação manual para valores > R$ 500 (`RN-015`)
  - **Atende:** RN-015, AMB-E06, DT-003
  - **Aceite:** Teste unitário garante que item com reembolso > R$ 500 recebe status `PENDENTE_APROVACAO` e incrementa contador no resumo.
  - **Commit:**

- [ ] **T-019** — Atualizar CLI com flags opcionais `--politica` e `--cambio` e testes E2E dos cenários do envelope
  - **Atende:** AMB-E05, Critérios de Aceite v2.0
  - **Aceite:** Testes E2E contra `despesas-envelope.json`, `despesas-envelope-cc-desconhecido.json` e `despesas-exemplo.json` passam com 100% de sucesso.
  - **Commit:**

---

## Matriz de Cobertura e Rastreabilidade Atualizada

| Regra da Spec | Task Associada | Nome do Teste Automatizado |
|---|---|---|
| **RN-001** (Alimentação) | T-009, T-015 | `RN-001: limite diário de alimentação com corte parcial e esgotamento subsequente` |
| **RN-002** (Transporte) | T-009, T-015 | `RN-002: limite diário de transporte urbano de R$ 80` |
| **RN-003** (Hospedagem) | T-010, T-015 | `RN-003: hospedagem calcula teto multiplicando diárias da descrição` |
| **RN-004** (Reembolso parcial) | T-009 | `RN-004: despesa excedente recebe status APROVADO_PARCIAL e glosa saldo` |
| **RN-005** (Nota Fiscal) | T-008, T-017 | `RN-005: R$ 100,00 sem nota é aprovado; R$ 100,01 sem nota é recusado integralmente` |
| **RN-006** (Em Viagem) | T-012 | `RN-006: colaborador em viagem tem todos os limites acrescidos de 50%` |
| **RN-007** (Competência) | T-005 | `RN-007: despesa fora do período de competência é recusada com R$ 0,00` |
| **RN-008** (Duplicatas) | T-007 | `RN-008: despesa duplicada é recusada e não consome limites` |
| **RN-009** (Categorias) | T-006, T-015 | `RN-009: categoria inválida é recusada; categoria em maiúsculas é normalizada` |
| **RN-010** (Estornos) | T-011 | `RN-010: estorno negativo subtrai do total e restabelece limite diário` |
| **RN-011** (Truncamento) | T-003 | `RN-011: valor com três casas decimais é truncado em duas casas` |
| **RN-012** (Justificativas) | T-012 | `RN-012: despesa com múltiplas violações reporta todas as justificativas` |
| **RN-013** (Câmbio) | T-016 | `RN-013: converte moeda estrangeira por data com PTAX útil anterior e recusa moeda sem cotação` |
| **RN-014** (Centros de Custo) | T-015 | `RN-014: aplica limites do centro de custo com fallback padrao e veda limite zero` |
| **RN-015** (Fila de Aprovação) | T-018 | `RN-015: despesa com reembolso > R$ 500 recebe status PENDENTE_APROVACAO` |
