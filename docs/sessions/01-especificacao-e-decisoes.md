# Sessão 01 — Entendimento, Desambiguação e Elaboração da Spec

**Data:** 2026-09-28
**Participantes:** Usuário (Product Owner / Líder Técnico) e Antigravity (AI Coding Assistant)
**Objetivo:** Compreender os requisitos do Desafio SDD, mapear todas as ambiguidades da Política de Reembolso do RH (v3), deliberar sobre cada decisão de negócio e formalizar a `spec.md`.

---

## 1. Contexto e Regras Operacionais

- Definição explícita de que nesta etapa inicial **nenhum código ou funcionalidade seria implementado**.
- O projeto foi originalmente estruturado com referências ao Claude Code e foi adaptado ao fluxo de trabalho do **Google Antigravity**, preservando integralmente os critérios da rubrica de avaliação (incluindo a manutenção de `CLAUDE.md`, rastreabilidade de commits e exportação de sessões em `docs/sessions/`).
- O usuário atua como responsável soberano pelas decisões de negócio, não cabendo ao assistente assumir preferências sem consulta prévia.

---

## 2. Análise do Desafio e Mapeamento de Ambiguidades

O assistente inspecionou os arquivos `DESAFIO.md`, `RUBRICA.md`, `FAQ.md` e `exemplos/despesas-exemplo.json`, identificando 11 ambiguidades críticas distribuídas entre unidades de aplicação, fronteiras e dados ausentes:

1. **AMB-001 (Unidade de aplicação do limite diário):** Como aplicar limites de R$ 60 (alimentação) e R$ 80 (transporte) em dias com múltiplas despesas?
2. **AMB-002 (Fronteira fiscal de R$ 100,00):** Se R$ 100,00 exatos exige nota fiscal ou apenas estritamente maior que R$ 100 (> 100).
3. **AMB-003 (Consequência da falta de nota fiscal):** Se despesa acima de R$ 100 sem nota fiscal é recusada integralmente ou reembolsada parcialmente até o teto da categoria.
4. **AMB-004 (Identificação de viagem):** Como saber se o colaborador está em viagem, dado que o JSON de exemplo original não continha o campo.
5. **AMB-005 (Tratamento de duplicatas):** Critério de detecção de duplicata e tratamento (recusa da segunda ocorrência).
6. **AMB-006 (Contagem de diárias de hospedagem):** Como aplicar o teto de R$ 250 por diária para lançamentos únicos com múltiplas diárias no texto (ex: "Hotel Rio - 2 diarias").
7. **AMB-007 (Valores negativos / estornos):** Como processar despesas negativas (ex: corrida cancelada).
8. **AMB-008 (Período de competência):** Tratamento de despesas com datas fora do período de início e fim da competência.
9. **AMB-009 (Precisão decimal excessiva):** Tratamento de valores com 3 casas decimais (ex: 33.333).
10. **AMB-010 (Normalização de categorias):** Tratamento de maiúsculas/minúsculas em categorias (ex: "ALIMENTACAO").
11. **AMB-011 (Cumprimento e transparência de justificativas):** Se o sistema deve parar no primeiro erro ou reportar todas as violações na saída.

---

## 3. Deliberação e Decisões do Usuário

O usuário deliberou sobre cada ponto:
- **AMB-001:** Agregação diária por data e categoria. O saldo é consumido pela ordem de processamento no lote.
- **AMB-002:** Fronteira estrita (`valor > 100.00`). R$ 100,00 exatos não exige nota fiscal; R$ 100,01 exige nota fiscal.
- **AMB-003:** Recusa integral (R$ 0,00) em caso de despesa > R$ 100 sem nota fiscal (inconformidade fiscal impede reembolso).
- **AMB-004:** O schema aceitará o campo `colaborador.em_viagem` (booleano). Quando ausente, assume `false` por padrão. Quando `true`, amplia limites em +50%.
- **AMB-005:** Duplicata = mesma data + mesma categoria + mesmo fornecedor + mesma descrição + mesmo valor. A 1ª é processada; a 2ª é recusada com R$ 0,00 e não consome limites.
- **AMB-006:** O sistema extrai a quantidade de diárias da descrição via expressões regulares (ex: "2 diarias"). O teto é `diarias * 250`. Se não encontrar indicador, assume 1 diária.
- **AMB-007:** Estorno/valor negativo abate do total a reembolsar e restabelece o limite da categoria na data.
- **AMB-008:** Despesas fora da competência têm recusa integral imediata (R$ 0,00) e não afetam limites.
- **AMB-009:** Truncamento estrito em 2 casas decimais na entrada (ex: 33.333 -> 33.33).
- **AMB-010:** Normalização para minúsculas (*lowercase*) antes da avaliação. Categorias não permitidas são recusadas com R$ 0,00.
- **AMB-011:** O sistema relata **todas as justificativas e violações aplicáveis** em uma lista por item na saída.

---

## 4. Entregáveis Realizados nesta Sessão

1. Cópia estruturada dos templates para a raiz do repositório (`specs/`, `docs/`, `CLAUDE.md`), mantendo `template/` intacto. Commit `chore: estrutura inicial a partir do template` registrado.
2. Redação completa e formal de `specs/001-motor-reembolso/spec.md`, estruturada com:
   - Problema e Objetivo
   - Escopo Negativo estrito
   - Dicionário de dados da entrada e contrato formal do JSON de saída
   - Regras de negócio desambiguadas (RN-001 a RN-012)
   - Registro de ambiguidades (AMB-001 a AMB-011)
   - Tabela de casos de borda
   - Ordem formal de aplicação das regras (Pipeline)
   - Critérios de aceite verificáveis
   - Questões abertas documentadas

---

## 5. Próximos Passos

1. Revisão e validação da `spec.md` pelo usuário.
2. Elaboração do plano técnico de arquitetura e estratégia em `specs/001-motor-reembolso/plan.md`.
3. Elaboração do plano de tarefas executáveis e rastreáveis em `specs/001-motor-reembolso/tasks.md`.
