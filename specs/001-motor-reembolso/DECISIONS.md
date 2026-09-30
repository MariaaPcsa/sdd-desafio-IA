# Log de Decisões e Mudanças de Spec

> Uma entrada **toda vez** que a spec mudar. Este arquivo é a prova de que a spec
> foi tratada como artefato vivo e não como cerimônia de abertura.
>
> Ordem cronológica inversa: a mais recente primeiro.

---

## D-001 — Absorção do Envelope Lacrado: Política v4, Câmbio Internacional e Fila de Aprovação · 2026-09-30

**Gatilho:** Recebimento do envelope lacrado do Dia 2 com o Comunicado do RH instituindo a Política de Reembolso v4.

**O que mudou na spec:**
- **Escopo ampliado (Seção 3):** Conversão cambial passou a fazer parte do escopo do sistema.
- **Entrada (Seção 4.1):** Campo opcional `despesas[].moeda` (padrão `"BRL"`).
- **Saída (Seção 4.2):** Novo status `PENDENTE_APROVACAO` e novo contador `itens_pendentes_aprovacao` no objeto `resumo`.
- **Regras de Negócio:**
  - `RN-001`, `RN-002`, `RN-003`: Tetos agora variam por centro de custo (`colaborador.centro_custo`), admitindo limite zero (`hospedagem` em `CC-ENG-PLATAFORMA`) e novas categorias (`representacao` em `CC-COMERCIAL`).
  - `RN-005`: Limite de R$ 100 para exigência de nota fiscal é verificado após a conversão para BRL.
  - `RN-013` (Nova): Conversão cambial de moedas estrangeiras usando cotação da data ou do último dia útil imediatamente anterior (PTAX); recusa integral de moedas sem cotação cadastrada (ex: GBP).
  - `RN-014` (Nova): Leitura dinâmica de limites por centro de custo com fallback aditivo para a política padrão.
  - `RN-015` (Nova): Classificação como `PENDENTE_APROVACAO` de itens cujo reembolso calculado exceda R$ 500,00.
- **Ambiguidades (Seção 6):** Registro de `AMB-E01` a `AMB-E06` resolvendo datas de fim de semana, moedas não cotadas, herança de centros de custo e opções de CLI.

**Por quê:**
Adequação imediata às novas diretrizes corporativas da Política v4 retroativa à competência vigente, permitindo operações internacionais e governança financeira para gastos vultosos.

**O que isso invalidou:**
- Invalidou a premissa de limites fixos no código e lista estática de 3 categorias.
- Invalidou a suposição de que toda despesa é lançada em BRL.
- Invalidou a aprovação automática incondicional de despesas com valor superior a R$ 500,00.

**Tasks afetadas:**
- Fase 1 a Fase 4 permanecem como alicerce do motor.
- Criadas as tasks `T-015`, `T-016`, `T-017`, `T-018`, `T-019` na Fase 5 (Envelope) do `tasks.md`.

**Custo:**
- Arquivos de documentação tocados: `spec.md`, `DECISIONS.md`, `plan.md`, `tasks.md`, `CLAUDE.md`.
- Tempo estimado de especificação e planejamento da mudança: ~30 minutos.
