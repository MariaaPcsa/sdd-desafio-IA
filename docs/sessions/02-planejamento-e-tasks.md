# Sessão 02 — Planejamento Técnico e Quebra de Tarefas (Tasks)

**Data:** 2026-09-28
**Participantes:** Usuário e Antigravity
**Objetivo:** Definir a stack definitiva, desenhar a arquitetura em camadas e fatiar a implementação em tarefas atômicas e rastreáveis (`tasks.md`).

---

## 1. Escolha Técnica da Stack

O assistente apresentou as opções viáveis existentes no ambiente do usuário (Python 3.11 vs Node.js 22 + TypeScript).
- **Decisão do Usuário:** Adotar **Node.js 22 + TypeScript**.
- **Aritmética Monetária:** Modelagem estrita em números inteiros de centavos (`src/money.ts`), prevenindo bugs de ponto flutuante do JavaScript e garantindo o truncamento exigido pela RN-011.
- **Runner de Testes:** Runner nativo do Node 22 (`node:test` e `node:assert/strict`) executado via `tsx`, sem dependências pesadas e de execução ultrarrápida.
- **CLI:** `node:util.parseArgs` nativo.

---

## 2. Elaboração do Plano Técnico (`plan.md`)

Foi formalizado o documento `specs/001-motor-reembolso/plan.md` contendo:
1. Comparativo de stack com justificativas e alternativas descartadas.
2. Arquitetura em camadas com separação clara entre I/O (`cli.ts`) e o núcleo de regras puro (`engine.ts`, `policy.ts`, `money.ts`).
3. Modelagem de dados tipada para entrada e saída.
4. Isolamento declarativo da política de reembolso em `policy.ts` para permitir absorção rápida da mudança de requisitos do Dia 2.
5. Quatro decisões técnicas fundamentadas (DT-001 a DT-004).
6. Estratégia e matriz de testes cobrindo todas as RNs e casos de borda.
7. Mapeamento de riscos e mitigações.

---

## 3. Fatiamento em Tarefas (`tasks.md`)

Foi elaborado o arquivo `specs/001-motor-reembolso/tasks.md` organizando a execução em 14 tarefas atômicas distribuídas em 4 fases, com a Fase 5 reservada para a mudança de requisito do Dia 2:
- **Fase 1 — Fundação:** T-001 (Setup TS e scripts), T-002 (Tipos), T-003 (Money e truncamento), T-004 (Configuração de política).
- **Fase 2 — Regras de Negócio e Pipeline:** T-005 (Competência RN-007), T-006 (Categorias RN-009), T-007 (Duplicatas RN-008), T-008 (Nota fiscal RN-005), T-009 (Limites diários RN-001/002/004), T-010 (Diárias de hospedagem RN-003), T-011 (Estornos RN-010), T-012 (Viagem RN-006 e Resumo RN-012).
- **Fase 3 — Casos de Borda:** T-013 (Bateria de testes de borda).
- **Fase 4 — Saída e CLI:** T-014 (Comando CLI e teste E2E com arquivo de exemplo).
- **Fase 5 — Envelope:** Reservada para o Dia 2.

Cada task possui requisito associado e critério de aceite verificável ("o teste X passa"), alimentando a matriz de rastreabilidade.

---

## 4. Atualização de Convenções (`CLAUDE.md`)

O arquivo `CLAUDE.md` foi atualizado para documentar formalmente a stack Node 22/TS, as convenções de commit por task (`feat(T-00X):`, `test(T-00X):`) e comandos de execução e teste.

---

## 5. Próximo Passo

Submissão do planejamento e das tasks para revisão final e aprovação do usuário para início da implementação guiada pelas tasks (Fase 1 - T-001).
