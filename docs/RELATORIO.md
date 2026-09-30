# Relatório — Desafio SDD

**Aluno:** Candidato SDD  
**Repositório:** Desafio SDD — Motor de Cálculo de Reembolso Corporativo  
**Data:** 2026-09-30  

> Isto não é redação. São **evidências**. Toda afirmação vem acompanhada de arquivo, hash de commit ou trecho de sessão exportada. Um parágrafo bonito sem evidência vale menos que uma frase curta com um hash.

---

## Delegação

*O que você fez, o que o Claude fez, e por que dividiu assim.*

**A divisão:**

| Atividade | Quem | Por quê |
|---|---|---|
| **Identificar ambiguidades** | Humano + Agente | O humano identificou contradições contábeis e fiscais do mundo real; o agente auxiliou na varredura cruzada contra os casos de teste de `exemplos/despesas-exemplo.json`. |
| **Decidir as ambiguidades** | Humano | Decisões de negócio, tolerância a risco tributário e conformidade não podem ser delegadas à máquina. O humano deliberou cada uma das 11 ambiguidades iniciais (`AMB-001` a `AMB-011`) e 6 do envelope (`AMB-E01` a `AMB-E06`). |
| **Escrever a spec** | Agente (supervisionado) | O agente possui alta velocidade para redigir especificações formais em Markdown com contratos de schema JSON e tabelas de critérios de aceite, sob supervisão e direcionamento estrito do humano. |
| **Desenhar a arquitetura** | Humano | O humano definiu a arquitetura funcional em pipeline puro, a representação monetária obrigatória em centavos inteiros (`RN-011`) e a escolha técnica por Node.js 22 LTS com TypeScript nativo. |
| **Implementar** | Agente | O agente gerou o código TypeScript com tipagem estática e funções puras em velocidade ordens de grandeza superior à codificação manual. |
| **Escrever testes** | Agente + Humano | O humano definiu a matriz de casos de borda e critérios de aceite; o agente materializou os 37 testes automatizados cobrindo 100% da spec. |
| **Absorver o envelope** | Humano + Agente | O humano recebeu o Comunicado v4 do RH, deliberou as decisões `AMB-E01` a `AMB-E06` e orientou a atualização formal da spec v2.0 antes de qualquer alteração de código. O agente executou a atualização documental e a implementação sequencial das tasks `T-015` a `T-019`. |

**Onde deleguei e me arrependi:**
1. Deleguei a detecção do entrypoint da CLI (`src/cli.ts`) e o agente implementou `process.argv[1].includes('cli')`. Isso quebrou o executor nativo de testes (`tests/cli.test.ts`), pois o caminho do arquivo de teste continha a substring `'cli'`, disparando a CLI em vez de rodar o teste. O humano teve que intervir e corrigir para `resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))`.
2. Na tarefa `T-017`, o agente reaproveitou a checagem `if (justificativas.length > 0)` para barrar despesas, esquecendo que a nota informativa de conversão cambial (`RN-012`) é adicionada ao array de justificativas. Isso causou um falso positivo de recusa de despesas válidas em EUR sem nota. O humano pegou o erro na execução dos testes e exigiu a criação da flag booleana `temViolacaoImpeditiva`.

**Onde não deleguei e deveria ter delegado:**
Poderia ter delegado ao agente a geração de massas sintéticas adicionais de dados de teste (fuzzing básico com dezenas de moedas e combinações de centro de custo) logo no Dia 1, o que teria antecipado o desenho do módulo cambial antes mesmo do envelope.

**Usei subagentes / skills / MCP / hooks?**
Sim. Foi configurado o arquivo [CLAUDE.md](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/CLAUDE.md) contendo convenções rígidas de projeto (proibição de arredondamento bancário, commits atômicos por task, regras de tipagem estática do TypeScript e formatação de links markdown com paths absolutos). Essas diretrizes mantiveram o agente alinhado durante todo o ciclo de vida.

---

## Descrição

*Como você transformou requisito ambíguo em requisito verificável.*

Pegue **um** requisito ambíguo da política do RH e mostre a evolução:

### Requisito: Fronteira e Consequência da Falta de Nota Fiscal (`RN-005` / `AMB-003`)

**Texto Original do RH:**
> *"Despesas sem nota fiscal só são reembolsadas até R$ 100. Acima disso, não."*

**Versão 1 (minha primeira escrita de rascunho):**
> ```markdown
> - Regra: Despesas sem nota fiscal serão limitadas ao teto de R$ 100,00, reembolsando-se até esse valor e glosando o excedente.
> ```

**Versão final consolidada (`specs/001-motor-reembolso/spec.md`, RN-005 / AMB-003):**
> ```markdown
> ### RN-005 — Obrigatoriedade de Nota Fiscal
> - **Regra:**
>   1. Despesas com valor até R$ 100,00 (`<= 100.00`) são aceitas sem nota fiscal (`tem_nota_fiscal: false`), sujeitas apenas aos limites por categoria e centro de custo.
>   2. Despesas com valor superior a R$ 100,00 (`> 100.00`) SEM nota fiscal (`tem_nota_fiscal: false`) são **recusadas integralmente** (reembolso R$ 0,00 e glosa total), recebendo o status `RECUSADO` e justificativa explícita de inconformidade fiscal.
> - **Origem:** Política de Reembolso v3, Regra 5, complementada por deliberação AMB-003.
> - **Aceite:** Lançamento de R$ 100,00 sem nota é aceito; lançamento de R$ 100,01 sem nota é recusado com R$ 0,00.
> ```

**O que estava ambíguo:**
A redação "só são reembolsadas até R$ 100" permitia duas interpretações irreconciliáveis:
- *Interpretação A (Recusa Integral):* Requisito de idoneidade fiscal. Gasto acima de R$ 100,00 sem nota não pode ser reembolsado pela empresa por risco fiscal/tributário; logo, o reembolso é R$ 0,00 (glosa de 100%).
- *Interpretação B (Corte no Teto):* Reembolsa R$ 100,00 e glosa a diferença.

**Como percebi:**
Ao auditar o arquivo [exemplos/despesas-exemplo.json](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/exemplos/despesas-exemplo.json), notei dois itens cirurgicamente posicionados:
- `d-003`: `100.00` sem nota.
- `d-004`: `100.01` sem nota.
A diferença de 1 centavo provava que o autor do desafio desenhou o caso exatamente para testar se o desenvolvedor enxergaria a fronteira estrita de conformidade contábil. Reembolsar R$ 100,00 de uma nota inexistente de R$ 100,01 criaria passivo tributário para a empresa. Decidiu-se pela recusa integral.

**Commit da mudança:**
- Especificação inicial e testes: `b34b39b` (`feat(T-008): implementa conformidade fiscal e fronteira de nota fiscal (RN-005)`).
- Evolução pós-envelope (avaliação pós-câmbio em BRL, `AMB-E04`): `82ce1ab` (`feat(T-017): integra validacao fiscal em BRL para despesas internacionais`).

---

## Discernimento

*Onde o Claude errou e você pegou.*

> **Sem um caso concreto e verificável, esta seção vale zero.** Não existe projeto de dois dias em que o modelo acertou tudo. A ausência do caso não prova que o modelo foi perfeito — prova que ninguém estava conferindo.

### Caso 1: Falso Positivo de Recusa por Mensagem Informativa de Câmbio

**O que ele propôs:**
Na implementação da tarefa `T-017` em `src/engine.ts`, o agente implementou a conversão de moedas estrangeiras para BRL e adicionou uma justificativa de auditoria transparente:
```typescript
justificativas.push(`Conversão cambial: ${item.valor.toFixed(2)} ${conversao.moedaOrigem} convertido para R$ ${conversao.valorBrl.toFixed(2)}...`);
```
E manteve o bloco condicional de recusa:
```typescript
if (justificativas.length > 0 || !regraCategoria) {
  itensRecusados++;
  // marca despesa como RECUSADO com R$ 0,00
  continue;
}
```

**Por que estava errado:**
O agente assumiu que qualquer elemento dentro do array `justificativas` configurava uma infração impeditiva. Como a despesa internacional gerava a justificativa de transparência de câmbio (atendendo à `RN-012`), **todas as despesas em moeda estrangeira eram sumariamente recusadas com R$ 0,00**, mesmo quando perfeitamente regulares e dentro dos limites.

**Como eu detectei:**
Ao rodar a suíte automatizada `npm test`, o teste `tests/foreign_currency.test.ts` quebrou imediatamente acusando:
```
# Subtest: T-017 / RN-005 + RN-013: despesa em EUR sem nota <= R$ 100 BRL é aceita sem exigência fiscal
not ok 21 - T-017 / RN-005 + RN-013: despesa em EUR sem nota <= R$ 100 BRL é aceita sem exigência fiscal
  error: Expected values to be strictly equal:
  + 'RECUSADO'
  - 'APROVADO'
```

**O que eu fiz:**
Interrompi a entrega do agente, analisei o fluxo lógico e orientei a separação estrita entre notas informativas de auditoria e violações que impedem o reembolso. Introduziu-se uma variável explícita `let temViolacaoImpeditiva = false;`, acionada unicamente por regras impeditivas (competência, duplicata, falta de nota fiscal acima de R$ 100 ou categoria inválida).

**Onde está a evidência:**
- Registrado em [docs/sessions/04-implementacao-e-testes.md](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/docs/sessions/04-implementacao-e-testes.md), Seção 3.
- Commit de correção: `82ce1ab` (`feat(T-017)`).

---

### Caso 2: Falha de Precisão de Ponto Flutuante na Verificação da CLI

**O que ele propôs:**
No teste E2E `tests/cli.test.ts`, o agente escreveu:
```typescript
assert.strictEqual(
  resultado.resumo.total_solicitado,
  resultado.resumo.total_reembolsavel + resultado.resumo.total_glosado
);
```

**Por que estava errado:**
O JavaScript utiliza aritmética IEEE 754 de ponto flutuante. A soma `306.43 + 1510.41` resultou em `1816.8400000000001`, fazendo a asserção `strictEqual(1816.84, 1816.8400000000001)` quebrar o teste, mesmo com todos os cálculos de negócio corretos.

**Como eu detectei:**
Executando `npm test` logo após a criação da tarefa `T-014`:
```
AssertionError: Expected 1816.8400000000001 to strictly equal 1816.84
```

**O que eu fiz:**
Exigi a padronização de validação monetária através de arredondamento em centavos inteiros:
```typescript
const somaCalculada = Math.round((resultado.resumo.total_reembolsavel + resultado.resumo.total_glosado) * 100) / 100;
assert.strictEqual(resultado.resumo.total_solicitado, somaCalculada);
```

**Onde está a evidência:**
- Commit `8e0e289` (`feat(T-014)`).

---

**Padrão que eu notei:**
O agente tende a tratar arrays de saída (como logs e justificativas) como flags de controle de fluxo implícitas. Quando o sistema exige enriquecimento auditável contínuo (transparência de taxas PTAX, motivos de aprovação e motivos de glosa coexistindo), essa premissa simplista causa falsos positivos ou falsos negativos de recusa. O humano deve sempre exigir flags booleanas explícitas de violação de regra.

---

## Diligência

*O que você verificou antes de aceitar.*

**Meu procedimento de verificação:**
1. **Tipagem Estática:** Execução de `npm run typecheck` (`tsc --noEmit`) para garantir que nenhum contrato de interface fosse violado em tempo de execução.
2. **Execução de Testes Automatizados:** Execução de `npm test` antes e depois de cada commit, confirmando que os 37 testes passaram sem regressão.
3. **Auditoria Visual de Diff (`git diff`):** Leitura de todas as linhas adicionadas e removidas para garantir que nenhuma refatoração indevida ocorresse de forma oculta.
4. **Verificação dos Totalizadores:** Conferência manual da equação contábil universal `total_solicitado == total_reembolsavel + total_glosado` para todos os cenários.

**Li o diff inteiro em que porcentagem das entregas?**
Em **100%** das entregas. Essa disciplina evitou que um acidente durante a tarefa `T-018` (onde o agente havia deletado temporariamente as variáveis de controle `despesasProcessadasSet` e `consumoDiarioMap` ao substituir um bloco de código) fosse commitado no repositório.

**O que aceitei sem verificar direito, e o que me custou:**
No início da tarefa `T-014`, aceitei a implementação da CLI sem rodá-la através do runner de testes completo. Quando rodei `npm test`, o processo travou porque o entrypoint era executado durante a importação do teste. Custou cerca de 15 minutos de depuração até identificar que `process.argv[1].includes('cli')` era acionado indevidamente pela presença do nome da pasta de testes.

**Testes: quem escreveu, e como você sabe que eles testam a coisa certa?**
O agente gerou os scripts de teste em TypeScript, mas a matriz de cenários foi derivada diretamente das 11 regras da `spec.md` e dos casos de borda da Seção 7. Para garantir que os testes não eram tautológicos (testes que passam sempre porque o mesmo modelo gerou o código e o teste), praticou-se **teste de mutação mental**: alteramos temporariamente valores de limites (ex: mudando o teto de R$ 80 para R$ 79) e verificamos que o teste quebrava imediatamente acusando a divergência.

---

## O envelope

*A mudança de requisito do Dia 2.*

**Quantos arquivos toquei na mão:** `12` arquivos.  
**Quanto tempo levou:** Aproximadamente `1 hora e 30 minutos` (45 min para análise das ambiguidades e atualização da spec v2.0; 45 min para implementação e testes).  
**Diff de absorção:** `12 files changed, 1318 insertions(+), 252 deletions(-)` (`git diff 19cde6c HEAD --stat`).  

**Absorveu de graça:**
- A representação monetária prévia em centavos inteiros (`toCents`/`fromCents` e truncamento de 2 casas decimais da `RN-011`). Quando a conversão cambial por PTAX foi introduzida, a multiplicação `valorOriginal * taxa` não sofreu problemas de dízimas ou inconsistências centesimais.
- A arquitetura funcional do motor baseada em uma função pura (`processarLote`), permitindo injetar tabelas externas de limites e taxas sem alterar o esqueleto da aplicação.

**Resistiu:**
- A hipótese original de que a moeda sempre seria BRL e de que os limites institucionais eram constantes globais imutáveis. Foi necessário estender o modelo de entrada para suportar `moeda?: string`, incluir o módulo `src/currency.ts` e implementar a resolução dinâmica de regras com fallback aditivo por centro de custo (`RN-014`).

**Ordem em que fiz:**
1. Recebimento do envelope e download dos arquivos para [exemplos/envelope/](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/exemplos/envelope/) (commit `5c031ee`).
2. Análise e deliberação das ambiguidades `AMB-E01` a `AMB-E06` na [Sessão 03](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/docs/sessions/03-envelope-lacrado-e-spec-v2.md).
3. Atualização da `spec.md` para a versão 2.0 (commit `69f5376`).
4. Registro formal da decisão de negócio `D-001` em [DECISIONS.md](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/specs/001-motor-reembolso/DECISIONS.md) (commit `35f8b2c`).
5. Atualização do [plan.md](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/specs/001-motor-reembolso/plan.md) e [tasks.md](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/specs/001-motor-reembolso/tasks.md) para incluir a Fase 5 (commits `b85f1f5` e `f7b4ce2`).
6. Implementação sequencial guiada pelas tasks `T-015` a `T-019`, com commits atômicos individuais.

**Se eu tivesse escrito a spec original sabendo desta mudança:**
Teria especificado a entrada de despesas com o campo opcional `moeda?: string` (padrão `"BRL"`) desde a v1.0 e desenhado a tabela de limites configurada por centro de custo desde o primeiro dia.

**O que a spec me poupou, em concreto:**
Poupou reescrever o motor do zero. Ter uma especificação clara de como a agregação diária, estornos e notas fiscais operavam permitiu que a nova camada de centro de custo e câmbio fosse adicionada apenas como um pré-processador de limites e valores, preservando 100% da lógica matemática já validada.

---

## Fechamento

**Para qual tamanho de projeto isto valeu a pena?**
Para qualquer projeto em que **regras de negócio sejam complexas, envolvam dinheiro, auditoria legal ou múltiplos departamentos**. Em sistemas financeiros, contábeis ou de faturamento, a abordagem SDD economiza semanas de retrabalho.

**Para qual não valeria?**
Para protótipos descartáveis de validação de interface ("throwaway prototypes") ou scripts utilitários rápidos com menos de 100 linhas.

**O que eu faria diferente:**
Teria implementado testes de mutação automatizados no pipeline de CI desde a `Fase 1`, automatizando a validação de que cada asserção de teste é estritamente necessária e sensível a falhas.

**A coisa mais desconfortável que aprendi sobre como eu trabalho com IA:**
A facilidade com que o agente gera explicações plausíveis e convincentes para código incorreto. Quando questionado sobre um erro sutil, o agente frequentemente concorda com entusiasmo e propõe uma nova solução que introduz um erro diferente no mesmo lugar. **A única defesa real é ter uma spec inequívoca e testes determinísticos independentes.**
