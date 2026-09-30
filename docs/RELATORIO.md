# Relatório Final de Engenharia e Fluência em IA (SDD)

**Projeto:** Motor de Cálculo de Reembolso Corporativo  
**Metodologia:** Spec-Driven Development (SDD) com IA  
**Data:** 2026-09-30  
**Autor:** Equipe de Engenharia / Candidato  

---

## 1. Delegação (Delegation)

A divisão de responsabilidades entre humano e agente de IA foi desenhada com base no princípio de que **decisões de negócio, integridade contábil e arquitetura cabem exclusivamente ao humano**, enquanto **estruturação documental, geração de código tipado, criação de baterias de testes e execução de rotinas cabem ao agente de IA**.

### Divisão de Papéis
- **Papel Humano (Liderança Técnica e Governança):**
  - Identificação e deliberação formal sobre as 11 ambiguidades iniciais da política v3 (`AMB-001` a `AMB-011`) e as 6 ambiguidades do Envelope Lacrado v4 (`AMB-E01` a `AMB-E06`).
  - Escolha fundamentada do stack tecnológico: Node.js 22 LTS com TypeScript em ESM nativo e executor embutido `node:test`, descartando dependências pesadas e garantindo tipagem estática rigorosa para prevenção de bugs de schema.
  - Fixação da regra inviolável de integridade monetária: aritmética estrita em centavos inteiros com truncamento a duas casas decimais (`RN-011`), proibindo aproximações por arredondamento bancário nos totalizadores.
  - Revisão sistemática de cada commit atômico e verificação dos diffs antes de aceitar cada entrega do agente.
- **Papel do Agente (Copiloto de Execução Rápida):**
  - Criação da documentação formal com contratos JSON Schema (`spec.md`), plano técnico (`plan.md`) e lista de tarefas atômicas (`tasks.md`).
  - Implementação das funções puras de cálculo (`money.ts`, `policy.ts`, `currency.ts`, `engine.ts` e `cli.ts`).
  - Escrita de 37 testes automatizados unitários e de integração, abrangendo 100% dos requisitos de negócio e casos de borda.
  - Manutenção contínua do log de decisões (`DECISIONS.md`) e das transcrições de sessões (`docs/sessions/`).

### Avaliação Crítica da Delegação
- **Onde a delegação foi altamente eficaz:** Na implementação de rotinas determinísticas e repetitivas, como os testes exaustivos de casos de borda (`tests/edge_cases.test.ts`), a criação de geradores de payload sintéticos para testes e a montagem das tabelas comparativas na documentação.
- **Onde a delegação exigiu correção humana:** Inicialmente, o agente propôs validar a execução da CLI através de uma verificação ingênua de string no caminho do arquivo (`process.argv[1].includes('cli')`). Isso causava a execução descontrolada do CLI sempre que o runner nativo executava `tests/cli.test.ts`, resultando em quebra dos testes. O humano interveio exigindo o uso canônico de `resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))`, restaurando a estabilidade da suíte.

---

## 2. Descrição (Description)

No desenvolvimento orientado por especificação, **um requisito ambíguo na documentação é uma falha de sistema antes mesmo da primeira linha de código**. 

### Exemplo Analisado: Fronteira e Consequência da Falta de Nota Fiscal (`RN-005` / `AMB-003`)

#### 1. Texto Original da Política do RH:
> *"Despesas sem nota fiscal só são reembolsadas até R$ 100. Acima disso, não."*

#### 2. O que estava ambíguo:
O comunicado do RH permitia duas interpretações diametralmente opostas:
- **Interpretação A (Recusa Integral):** A exigência de nota fiscal é um requisito legal e de conformidade tributária. Despesas acima de R$ 100,00 sem nota fiscal (ex: R$ 100,01) devem ser integralmente rejeitadas (reembolso R$ 0,00 e 100% glosadas), pois a empresa não pode contabilizar gastos sem lastro legal.
- **Interpretação B (Corte no Teto / Reembolso Parcial):** Despesas acima de R$ 100,00 sem nota fiscal deveriam ser pagas até o teto de R$ 100,00, glosando-se apenas o excedente.

#### 3. Como foi percebido:
Ao confrontar a redação com os itens `d-003` (R$ 100,00 sem nota) e `d-004` (R$ 100,01 sem nota) do arquivo `exemplos/despesas-exemplo.json`, tornou-se evidente que R$ 0,01 a mais alteraria o tratamento contábil. Uma empresa sujeita à auditoria fiscal não pode reembolsar despesas desprovidas de documento idôneo.

#### 4. Comparação Entre Versões na Spec:

*Primeira Versão (Proposta de Rascunho Inicial):*
```markdown
- Regra: Despesas sem nota fiscal serão limitadas ao teto de R$ 100,00, reembolsando-se até esse valor e glosando o excedente.
```

*Versão Final Consolidada (`specs/001-motor-reembolso/spec.md`, RN-005 / AMB-003):*
```markdown
### RN-005 — Obrigatoriedade de Nota Fiscal
- **Regra:**
  1. Despesas com valor até R$ 100,00 (`<= 100.00`) são aceitas sem nota fiscal (`tem_nota_fiscal: false`), sujeitas apenas aos limites por categoria e centro de custo.
  2. Despesas com valor superior a R$ 100,00 (`> 100.00`) SEM nota fiscal (`tem_nota_fiscal: false`) são **recusadas integralmente** (reembolso R$ 0,00 e glosa total), recebendo o status `RECUSADO` e justificativa explícita de inconformidade fiscal.
- **Origem:** Política de Reembolso v3, Regra 5, complementada por deliberação AMB-003.
- **Aceite:** Lançamento de R$ 100,00 sem nota é aceito; lançamento de R$ 100,01 sem nota é recusado com R$ 0,00.
```

#### 5. Evolução com o Envelope Lacrado (`AMB-E04`):
No Dia 2, com a chegada de despesas em moeda estrangeira (`USD` e `EUR`), deliberou-se que a conversão cambial precede a checagem fiscal (`AMB-E04`). Assim, uma despesa de 40.00 USD (convertida para R$ 220,00 BRL) sem nota foi sumariamente recusada, ao passo que 14.50 EUR (R$ 85,26 BRL) sem nota foi processada normalmente dentro do teto diário.

---

## 3. Discernimento (Discernment)

Durante o desafio, o humano não apenas acompanhou o agente, mas auditou ativamente suas saídas, identificando falhas críticas de implementação e lógica antes que contaminassem o repositório.

### Caso Concreto 1: Falso Positivo de Recusa por Mistura de Auditoria Informativa com Violações Impeditivas
- **O que o agente propôs:** Na tarefa `T-017` (integração de câmbio ao motor de regras em `src/engine.ts`), o agente implementou a conversão cambial e registrou uma mensagem de transparência nas justificativas do item (`Conversão cambial: 14.50 EUR convertido para R$ 85.26...`). Em seguida, manteve a condição original de parada:
  ```typescript
  if (justificativas.length > 0 || !regraCategoria) {
    itensRecusados++;
    // marca como RECUSADO com R$ 0,00
  }
  ```
- **Por que estava errado:** O agente considerou que qualquer entrada no array `justificativas` representava uma infração impeditiva. Como o item internacional gerava uma nota informativa de conversão cambial (atendendo à `RN-012` — Transparência Integral), qualquer despesa convertida era automaticamente marcada como `RECUSADO`, mesmo sendo perfeitamente válida e estando dentro de todos os limites.
- **Como foi detectado:** Pela execução da suíte automatizada `npm test`, onde o teste `T-017 / RN-005 + RN-013: despesa em EUR sem nota <= R$ 100 BRL é aceita sem exigência fiscal` falhou acusando `Expected: 'APROVADO', Actual: 'RECUSADO'`.
- **O que foi feito:** O humano orientou a separação estrita entre notas informativas de auditoria e infrações que barram o reembolso, introduzindo uma flag booleana `temViolacaoImpeditiva`. As notas de conversão cambial passaram a ser registradas sem bloquear o fluxo de aprovação.
- **Evidências:** Registrado na [Sessão 04](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/docs/sessions/04-implementacao-e-testes.md) e corrigido no commit `feat(T-017)` ([82ce1ab](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA)).

### Caso Concreto 2: Divergência de Ponto Flutuante na Verificação de Totais
- **O que o agente propôs:** No teste E2E da CLI (`tests/cli.test.ts`), o agente escreveu a asserção:
  ```typescript
  assert.strictEqual(
    resultado.resumo.total_solicitado,
    resultado.resumo.total_reembolsavel + resultado.resumo.total_glosado
  );
  ```
- **Por que estava errado:** Em JavaScript/V8, a soma de ponto flutuante IEEE 754 de `306.43 + 1510.41` resulta em `1816.8400000000001`. A asserção `strictEqual(1816.84, 1816.8400000000001)` falhava, mesmo com a integridade financeira do motor preservada.
- **Como foi detectado:** Falha no primeiro teste da suíte `tests/cli.test.ts` durante a execução da tarefa `T-014`.
- **O que foi feito:** O teste foi ajustado para comparar a soma arredondada para centavos inteiros via `Math.round((reembolsavel + glosado) * 100) / 100`, alinhando a validação ao contrato monetário.
- **Evidências:** Registrado no commit `feat(T-014)` ([8e0e289](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA)).

---

## 4. Diligência (Diligence)

O processo de aceitação das entregas do agente de IA seguiu uma disciplina rigorosa de engenharia:

1. **Compilação e Verificação Estática de Tipos:** A cada tarefa concluída, executou-se `npm run typecheck` (`tsc --noEmit`). Isso impediu que interfaces incompatíveis ou propriedades nulas/indefinidas passassem despercebidas.
2. **Execução Automatizada de Testes Sem Mocks Ilusórios:** Todas as regras de negócio foram testadas contra cenários concretos. A suíte conta com 37 testes automatizados cobrindo:
   - Resolução de limites e fallback aditivo por centro de custo (`tests/cost_center.test.ts`).
   - Conversão cambial por PTAX de dia útil anterior e moedas sem cotação (`tests/currency.test.ts`).
   - Regras fiscais combinadas com moedas estrangeiras (`tests/foreign_currency.test.ts`).
   - Fila de aprovação manual para valores acima de R$ 500,00 (`tests/manual_approval.test.ts`).
   - Bateria de casos de borda e estornos negativos (`tests/edge_cases.test.ts`).
   - Testes de integração ponta a ponta via CLI com arquivos reais (`tests/cli.test.ts`).
3. **Leitura Criteriosa de Diffs:** Nenhum commit foi realizado às cegas. Quando o agente propôs reescrever blocos inteiros de código em `src/engine.ts`, o humano inspecionou o diff linha a linha, identificando a perda temporária de variáveis de estado (`despesasProcessadasSet` e `consumoDiarioMap`) e revertendo imediatamente a exclusão.
4. **Conferência da Rastreabilidade Bidirecional:** Foi verificado que cada commit continha o identificador da task correspondente (`feat(T-00X)`), que cada task constava na `spec.md`, e que os critérios de aceite estavam 100% satisfeitos.

---

## 5. O Envelope Lacrado (Sealed Envelope)

O recebimento da **Política de Reembolso v4** no Dia 2 representou o teste de estresse definitivo da abordagem SDD:

### Impacto e Arquivos Modificados
- **Arquivos Tocados na Absorção:**
  - *Documentação (antes do código):* `specs/001-motor-reembolso/spec.md` (evolução para v2.0), `specs/001-motor-reembolso/DECISIONS.md` (registro formal D-001), `specs/001-motor-reembolso/plan.md`, `specs/001-motor-reembolso/tasks.md` (adição de T-015 a T-019), `docs/sessions/03-envelope-lacrado-e-spec-v2.md`.
  - *Código Fonte e Testes:* `src/currency.ts` (módulo novo), `src/policy.ts` (resolução dinâmica), `src/engine.ts` (pipeline v4 e aprovação manual), `src/cli.ts` (flags externas), `tests/cost_center.test.ts`, `tests/currency.test.ts`, `tests/foreign_currency.test.ts`, `tests/manual_approval.test.ts`, `tests/cli.test.ts`.
- **Tempo Gasto:** Aproximadamente **1 hora e 30 minutos** para absorção total, desde a leitura inicial do comunicado do RH até a aprovação de 100% dos testes ponta a ponta com os arquivos do envelope.

### O que facilitou e o que atrapalhou
- **O que facilitou:**
  - O motor ter sido concebido como uma função pura orientada a pipelines (`processarLote`).
  - A representação monetária prévia em centavos inteiros (`toCents`/`fromCents`), que tornou a multiplicação cambial e o truncamento de 2 casas extremamente precisos e seguros.
  - A separação declarativa da política institucional em `policy.ts`, que permitiu plugar tabelas externas (`politica-v4.json`) sem refatorar as regras centrais do motor.
- **O que atrapalhou:**
  - Na versão inicial v1.0, assumiu-se implicitamente que toda despesa era informada em `BRL`. A introdução do campo `moeda` exigiu posicionar a etapa de conversão cambial logo no início do laço de processamento de despesas, antes de qualquer conferência de limite ou nota fiscal.
- **O que teríamos feito diferente sabendo da mudança com antecedência:**
  - Teríamos desenhado a interface `DespesaEntrada` com o campo opcional `moeda?: string` desde o primeiro rascunho de dados.
  - Teríamos previsto injeção de dependência explícita da política e da tabela de câmbio na assinatura do motor desde a `Fase 1`.

---

## 6. Conclusão

O projeto demonstra de ponta a ponta o valor do **Spec-Driven Development**. Ter investido esforço inicial minucioso em decifrar a redação ambígua do RH, registrar deliberações e estipular contratos estritos não atrasou o desenvolvimento — pelo contrário: permitiu absorver uma mudança drástica de negócio em menos de 90 minutos, com zero regressões e 37 testes automatizados passando com louvor.
