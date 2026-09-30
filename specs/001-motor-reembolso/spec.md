# Spec — Motor de Cálculo de Reembolso

**Versão:** 2.0 · **Status:** aprovada · **Última alteração:** 2026-09-30

> **Regra de ouro deste arquivo:** ele descreve o QUÊ e o PORQUÊ. Nenhuma linha
> aqui cita linguagem, biblioteca, classe, função ou estrutura de pastas.
>
> **Teste de aceitação da própria spec:** uma pessoa que nunca viu o projeto
> consegue, lendo só este arquivo, verificar se o sistema está correto.

---

## 1. Problema

Atualmente, o processo de conferência e reembolso de despesas corporativas é manual: a equipe financeira analisa despesas linha por linha confrontando planilhas contra a política institucional. Esse processo é moroso, sujeito a inconsistências de interpretação e resulta em atrasos nos pagamentos ou reembolsos indevidos que oneram a empresa. Além disso, com a política v4, os limites variam por centro de custo e passam a existir despesas internacionais com conversão de câmbio por data e fluxo de aprovação para valores elevados.

## 2. Objetivo

Processar automaticamente um lote de despesas corporativas em formato estruturado (JSON), aplicando dinamicamente a tabela de limites vigente por centro de custo, realizando conversão cambial por data quando aplicável, identificando itens para fila de aprovação manual e justificando cada decisão de forma transparente e auditável.

## 3. Fora de escopo

- Não realiza leitura de imagens de recibos ou processamento OCR.
- Não realiza integração direta com bancos, ERPs ou gateways de pagamento.
- Não busca taxas de câmbio em tempo real na internet (utiliza estritamente o arquivo oficial de câmbio fornecido).
- Não gerencia autenticação, autorização ou controle de acesso de usuários.
- Não altera arquivos de entrada originais; apenas gera o relatório de resultado em arquivo de saída.

---

## 4. Entrada e saída

### 4.1 Entrada

Conforme estrutura de `exemplos/despesas-exemplo.json` e `exemplos/envelope/despesas-envelope.json`.

**Campos de cabeçalho:**

| Campo | Tipo | Significado | Obrigatório |
|---|---|---|---|
| `colaborador.id` | String | Identificador único do colaborador (ex: `"c-0417"`) | Sim |
| `colaborador.nome` | String | Nome completo do colaborador | Sim |
| `colaborador.centro_custo` | String | Centro de custo de lotação (ex: `"CC-COMERCIAL"`, `"CC-ENG-PLATAFORMA"`) | Sim |
| `colaborador.em_viagem` | Booleano | Indicador se o colaborador estava em viagem a trabalho | Não (Padrão: `false`) |
| `periodo.competencia` | String | Mês/ano de competência no formato `YYYY-MM` | Sim |
| `periodo.inicio` | String | Data de início do período (`YYYY-MM-DD`) | Sim |
| `periodo.fim` | String | Data de término do período (`YYYY-MM-DD`) | Sim |

**Itens de despesa (`despesas[]`):**

| Campo | Tipo | Significado | Obrigatório |
|---|---|---|---|
| `id` | String | Identificador do lançamento (ex: `"d-001"`, `"e-001"`) | Sim |
| `data` | String | Data da ocorrência no formato `YYYY-MM-DD` | Sim |
| `categoria` | String | Categoria da despesa (ex: `"alimentacao"`, `"transporte_urbano"`, `"hospedagem"`, `"representacao"`) | Sim |
| `descricao` | String | Descrição detalhada do gasto | Sim |
| `fornecedor` | String | Nome do estabelecimento prestador | Sim |
| `valor` | Número | Valor da despesa na moeda informada | Sim |
| `moeda` | String | Código ISO 4217 da moeda (`"BRL"`, `"USD"`, `"EUR"`). Quando ausente, assume `"BRL"`. | Não (Padrão: `"BRL"`) |
| `tem_nota_fiscal` | Booleano | Indica se há comprovação fiscal anexada | Sim |

---

### 4.2 Saída

Arquivo JSON estruturado contendo o resumo consolidado do lote e o detalhamento item a item com status e justificativas.

**Estrutura de topo:**

| Campo | Tipo | Significado |
|---|---|---|
| `colaborador` | Objeto | Dados do colaborador processado |
| `periodo` | Objeto | Período de competência avaliado |
| `resumo` | Objeto | Totalizadores consolidados do processamento |
| `despesas` | Array | Lista de despesas avaliadas com valores calculados |

**Campos de `resumo`:**

| Campo | Tipo | Significado |
|---|---|---|
| `total_solicitado` | Número | Soma dos valores solicitados convertidos em BRL (2 decimais) |
| `total_reembolsavel` | Número | Soma dos valores aprovados ou pendentes de reembolso em BRL (2 decimais) |
| `total_glosado` | Número | Soma dos valores não reembolsados (`total_solicitado - total_reembolsavel`) |
| `itens_processados` | Inteiro | Total de itens avaliados |
| `itens_aprovados` | Inteiro | Quantidade de itens reembolsados integralmente |
| `itens_aprovados_parcialmente` | Inteiro | Quantidade de itens com corte parcial de excedente |
| `itens_pendentes_aprovacao` | Inteiro | Quantidade de itens cujo valor reembolsável > R$ 500,00 |
| `itens_recusados` | Inteiro | Quantidade de itens rejeitados (reembolso R$ 0,00) |

**Campos de cada item em `despesas[]`:**

| Campo | Tipo | Significado |
|---|---|---|
| `id` | String | Identificador original da despesa |
| `data` | String | Data da despesa (`YYYY-MM-DD`) |
| `categoria` | String | Categoria informada (normalizada para minúsculas) |
| `valor_solicitado` | Número | Valor solicitado convertido em BRL (truncado em 2 casas decimais) |
| `valor_reembolsado` | Número | Valor aprovado ou pré-aprovado para reembolso em BRL |
| `valor_glosado` | Número | Diferença entre o solicitado e o reembolsado em BRL |
| `status` | String | `"APROVADO"`, `"APROVADO_PARCIAL"`, `"PENDENTE_APROVACAO"` ou `"RECUSADO"` |
| `justificativas` | Array[String] | Lista de todos os motivos, regras e detalhes de conversão que incidiram sobre o item |

---

## 5. Regras de Negócio

### RN-001 — Limite Diário de Alimentação
- **Regra:** O teto de despesas reembolsáveis para a categoria `alimentacao` é determinado pela política do centro de custo do colaborador (ou bloco padrão se omitido). O limite é consumido por data de ocorrência na ordem de aparição no arquivo de entrada. Despesas subsequentes no mesmo dia que encontrarem o saldo diário zerado terão reembolso de R$ 0,00.
- **Origem:** Política do RH, item 1 e Política v4.
- **Aceite:** Para colaborador de `CC-COMERCIAL` (limite R$ 90,00/dia), duas despesas de R$ 50,00 no mesmo dia resultam em R$ 50,00 para a primeira e R$ 40,00 para a segunda (glosa de R$ 10,00).

### RN-002 — Limite Diário de Transporte Urbano
- **Regra:** O teto de despesas reembolsáveis para a categoria `transporte_urbano` é definido pela tabela do centro de custo do colaborador por dia civil, acumulado por data na ordem de processamento.
- **Origem:** Política do RH, item 2 e Política v4.
- **Aceite:** Para `CC-COMERCIAL` (teto R$ 150,00/dia), corrida de R$ 120,00 é aprovada integralmente.

### RN-003 — Limite por Diária de Hospedagem
- **Regra:** O teto para despesas de `hospedagem` é definido pela diária do centro de custo. O sistema analisa a descrição da despesa buscando menção explícita a multiplicador de diárias (padrões como `"X diarias"`, `"X diárias"`, `"X noites"`). O teto da despesa é `quantidade_diarias * limite_diaria`. Caso nenhum número de diárias seja identificado, considera-se 1 diária. Caso o centro de custo vede hospedagem (`limite: 0.00` como em `CC-ENG-PLATAFORMA`), a despesa é recusada integralmente.
- **Origem:** Política do RH, item 3 e Política v4.
- **Aceite:** Em `CC-COMERCIAL` (diária R$ 400,00), `"Hotel Londres - 3 noites"` com valor R$ 1.200,00 tem teto de R$ 1.200,00 (3 * 400) e é reembolsada integralmente.

### RN-004 — Reembolso Parcial de Excedente de Limite
- **Regra:** Despesas que ultrapassam o limite aplicável da categoria têm o valor até o limite aprovado e o excedente glosado, recebendo status `APROVADO_PARCIAL` (ou `PENDENTE_APROVACAO` se o valor reembolsado exceder R$ 500,00).
- **Origem:** Política do RH, item 4.
- **Aceite:** Despesa elegível com teto de R$ 300,00 e valor solicitado de R$ 340,00 gera reembolso de R$ 300,00 e glosa de R$ 40,00.

### RN-005 — Obrigatoriedade de Nota Fiscal para Valores Acima de R$ 100,00 BRL
- **Regra:** Toda despesa cujo valor em BRL (após conversão cambial, se aplicável) for estritamente superior a R$ 100,00 (`valor_brl > 100.00`) exige `tem_nota_fiscal: true`. Se `tem_nota_fiscal` for `false`, a despesa é **recusada integralmente** (reembolso R$ 0,00 e status `RECUSADO`) por inconformidade fiscal, não havendo reembolso parcial. Despesas com valor em BRL igual ou inferior a R$ 100,00 (`valor_brl <= 100.00`) não exigem nota fiscal.
- **Origem:** Política do RH, item 5 e Política v4.
- **Aceite:** Despesa de `40.00 USD` convertida para R$ 220,00 sem nota fiscal é recusada integralmente com R$ 0,00. Despesa de `14.50 EUR` convertida para R$ 85,26 sem nota fiscal é aceita normalmente.

### RN-006 — Ampliação de Limites para Colaborador em Viagem
- **Regra:** Caso o colaborador esteja em viagem a trabalho (`colaborador.em_viagem == true`), todos os limites diários e de diária da política vigente para o seu centro de custo são acrescidos de 50%. Se o campo for omitido ou `false`, aplicam-se os limites padrão de 100%.
- **Origem:** Política do RH, item 6 e Política v4.
- **Aceite:** Para colaborador em viagem no `CC-COMERCIAL`, o teto diário de alimentação passa de R$ 90,00 para R$ 135,00.

### RN-007 — Validação do Período de Competência
- **Regra:** Toda despesa deve possuir data dentro do intervalo de competência do lote (`periodo.inicio <= despesa.data <= periodo.fim`). Despesas com datas fora desse intervalo são **recusadas integralmente** (reembolso R$ 0,00) com justificativa de despesa fora de competência e não afetam os limites diários.
- **Origem:** Política do RH, item 7.
- **Aceite:** Despesa datada de 2026-04-15 em lote de competência 2026-07 é recusada com R$ 0,00.

### RN-008 — Tratamento de Duplicatas
- **Regra:** Uma despesa é caracterizada como duplicata quando possuir a mesma data, mesma categoria (normalizada), mesmo fornecedor, mesma descrição e mesmo valor de uma despesa processada anteriormente no mesmo lote. A primeira ocorrência é processada normalmente; a segunda e posteriores ocorrências são **recusadas integralmente** (reembolso R$ 0,00) com motivo de duplicidade, não consumindo limites.
- **Origem:** Política do RH, item 8.
- **Aceite:** `d-006` e `d-007` idênticas: a 1ª é processada; a 2ª é recusada por duplicidade.

### RN-009 — Categorias Elegíveis e Normalização
- **Regra:** O campo categoria é padronizado para caracteres minúsculos antes da análise. As categorias elegíveis são as definidas para o centro de custo do colaborador (com fallback para as categorias da política padrão). Categorias não cobertas (ex: `coworking`, ou `representacao` para colaboradores fora do Comercial) são **recusadas integralmente** (reembolso R$ 0,00) com justificativa de categoria não permitida.
- **Origem:** Política do RH, item 9 e Política v4.
- **Aceite:** Categoria `"coworking"` em `e-009` é recusada com R$ 0,00. Categoria `"representacao"` em `CC-COMERCIAL` é aceita com teto de R$ 300,00.

### RN-010 — Tratamento de Estornos e Valores Negativos
- **Regra:** Despesas com valores negativos representam estornos/cancelamentos de transações. O valor negativo é abatido do total geral reembolsável e estorna o consumo do teto diário da respectiva categoria e data.
- **Origem:** Política do RH.
- **Aceite:** Despesa de R$ -45,00 em transporte reduz o montante reembolsável em R$ 45,00 e restabelece R$ 45,00 de limite daquela categoria na data.

### RN-011 — Precisão Numérica e Truncamento
- **Regra:** Valores monetários na entrada ou resultantes de conversão cambial que apresentarem mais de 2 casas decimais são **truncados** em duas casas decimais no momento da leitura/conversão (sem arredondamento para cima). Todas as operações monetárias subsequentes operam estritamente em centavos inteiros com duas casas decimais.
- **Origem:** Fronteira numérica.
- **Aceite:** Valor de entrada `33.333` é truncado e processado como `33.33`.

### RN-012 — Transparência Integral de Justificativas
- **Regra:** Toda despesa avaliada deve listar na saída **todos os motivos, regras e detalhes de conversão cambial** que a afetaram, inclusive se houver múltiplas violações concorrentes, viabilizando feedback compreensível e auditável.
- **Origem:** Princípio de transparência auditável do processo.
- **Aceite:** Uma despesa internacional sem nota fiscal conterá a taxa de conversão utilizada e a notificação de recusa por ausência de documento fiscal.

### RN-013 — Conversão de Câmbio de Despesas Internacionais (Política v4)
- **Regra:** Despesas com moeda diferente de `"BRL"` são convertidas para BRL utilizando a cotação oficial da data da despesa presente na tabela de câmbio (`cambio.json`). Caso a despesa ocorra em data sem cotação publicada (finais de semana ou feriados bancários), utiliza-se a taxa do **último dia útil imediatamente anterior** (convenção PTAX). Caso a moeda informada não possua cotação cadastrada na tabela (ex: `"GBP"`), a despesa é **recusada integralmente** (reembolso R$ 0,00 e status `RECUSADO`) por ausência de cotação oficial. O valor convertido em BRL é truncado em 2 casas decimais.
- **Origem:** Política v4, Item B.
- **Aceite:** Despesa de `30.00 EUR` em 2026-07-18 (sábado) utiliza a cotação de 2026-07-17 (EUR = 5.96), resultando em R$ 178,80. Despesa em `GBP` sem cotação é recusada com R$ 0,00.

### RN-014 — Limites Dinâmicos por Centro de Custo e Fallback Aditivo (Política v4)
- **Regra:** Os limites de cada categoria são carregados dinamicamente a partir do centro de custo do colaborador (`colaborador.centro_custo`):
  1. Se o centro de custo não estiver cadastrado na tabela de centros de custo, aplicam-se integralmente os limites e categorias da política `"padrao"`.
  2. Se o centro de custo estiver cadastrado na tabela, aplicam-se seus limites específicos. Se uma categoria do padrão for omitida no centro de custo cadastrado, herda-se o limite do bloco `"padrao"` (fallback aditivo).
  3. Se uma categoria estiver explicitamente configurada com `limite: 0.00` ou `"nao reembolsavel"` (como `hospedagem` em `CC-ENG-PLATAFORMA`), a despesa é **recusada integralmente** (reembolso R$ 0,00).
- **Origem:** Política v4, Item A.
- **Aceite:** Colaborador de `CC-ENG-PLATAFORMA` que lançar hospedagem tem reembolso de R$ 0,00. Colaborador de `CC-COMERCIAL` tem teto de alimentação de R$ 90,00 e teto de representação de R$ 300,00.

### RN-015 — Fila de Aprovação Manual para Valores Elevados (Política v4, Item C)
- **Regra:** Todo item cujo valor reembolsável calculado ultrapassar R$ 500,00 (`valor_reembolsado > 500.00`) não recebe aprovação automática direta, recebendo o status **`PENDENTE_APROVACAO`**. O valor reembolsável permanece computado no resumo, e uma justificativa explicita que o item foi encaminhado para a fila de aprovação manual do gestor.
- **Origem:** Política v4, Item C.
- **Aceite:** Despesa `e-007` de hospedagem em Londres com valor reembolsável de R$ 1.200,00 recebe status `PENDENTE_APROVACAO` e justificativa correspondente.

---

## 6. Ambiguidades Identificadas e Decisões

### AMB-001 a AMB-011 (Registradas na Versão 1.0)
*(Mantidas e ativas conforme especificadas na v1.0: agregação diária na ordem de aparição, R$ 100 exatos sem nota permitido, estornos reabrindo limites, duplicatas recusadas na 2ª ocorrência, extração de diárias de hospedagem por texto).*

### AMB-E01 — Câmbio em Dias Não Úteis (Fins de Semana e Feriados)
- **Texto original do RH:** "A conversão usa a taxa da data da despesa, não a taxa de hoje. As taxas estão em cambio.json." Observação no arquivo: "Cotacoes publicadas apenas em dias uteis bancarios."
- **O que não está claro:** Em despesas de fins de semana (ex: sábado 2026-07-18 em `e-004`), não há taxa publicada no arquivo. Qual cotação utilizar?
- **Decisão:** Utilizar a taxa do **último dia útil imediatamente anterior** (sexta-feira, 2026-07-17: EUR = 5.96).
- **Justificativa:** É a prática padrão regulamentada pelo Banco Central do Brasil (PTAX) e utilizada pelo setor contábil corporativo.
- **Regra afetada:** RN-013.

### AMB-E02 — Moeda Estrangeira sem Cotação Oficial
- **Texto original do RH:** "Colaboradores em viagem internacional lançam despesas em moeda estrangeira... As taxas estão em cambio.json."
- **O que não está claro:** O arquivo `cambio.json` só contém taxas para USD e EUR. O item `e-006` é em GBP (Londres). Como proceder sem cotação?
- **Decisão:** **Recusa integral (R$ 0,00)** do item com status `RECUSADO` e justificativa de ausência de taxa cambial disponível.
- **Justificativa:** O sistema não pode inventar taxas arbitrárias sem respaldo da tabela oficial fornecida pelo financeiro.
- **Regra afetada:** RN-013.

### AMB-E03 — Herança e Fallback de Centros de Custo
- **Texto original do RH:** "Alguns centros de custo não têm entrada na tabela. Nesse caso, aplica-se a política padrão."
- **O que não está claro:** Se um centro de custo não existe (ex: `CC-SUPORTE-N2`), herda a política padrão? E se o centro de custo existe mas não menciona uma categoria do padrão (ex: `CC-ADM` sem hospedagem)?
- **Decisão:** Centro de custo desconhecido usa 100% a política padrão (categorias fora do padrão, como representação, são recusadas). Centros de custo cadastrados utilizam seus limites específicos e herdam do padrão categorias omitidas, exceto quando expressamente configurado com limite zero (`CC-ENG-PLATAFORMA`).
- **Justificativa:** Garante previsibilidade e continuidade operacional sem desamparar colaboradores de novos departamentos.
- **Regra afetada:** RN-014.

### AMB-E04 — Avaliação da Nota Fiscal em Despesas Internacionais
- **Texto original do RH:** "Os limites da política são sempre em BRL. Uma despesa em EUR é convertida antes de ser comparada ao limite."
- **O que não está claro:** A exigência de nota fiscal (> R$ 100) aplica-se antes ou depois da conversão para BRL?
- **Decisão:** A exigência fiscal de R$ 100 é avaliada **após a conversão para BRL**.
- **Justificativa:** Manter a consistência de que todas as fronteiras de conformidade financeira da empresa operam na moeda base nacional (BRL).
- **Regra afetada:** RN-005, RN-013.

### AMB-E05 — Leitura Externa da Política e Câmbio pela CLI
- **Texto original do RH:** "O motor precisa ler a política de fora, não de dentro do código. A tabela vigente está em politica-v4.json. As taxas estão em cambio.json."
- **O que não está claro:** Como receber esses arquivos sem quebrar a assinatura da CLI definida no início do desafio (`<cmd> calcular --input ... --output ...`)?
- **Decisão:** A CLI aceita opções configuráveis com valores padrão (`--politica` default `exemplos/envelope/politica-v4.json` e `--cambio` default `exemplos/envelope/cambio.json`).
- **Justificativa:** Permite total flexibilidade para rodar com arquivos externos mantendo compatibilidade regressiva completa.
- **Regra afetada:** Interface CLI.

### AMB-E06 — Fila de Aprovação Manual para Valores Elevados
- **Texto original do RH:** "C. (Opcional) Fila de aprovação manual. Itens cujo valor reembolsável passe de R$ 500 não são mais aprovados automaticamente. Eles entram em estado de pendência..."
- **O que não está claro:** Como representar esse estado no schema de saída sem invalidar os totalizadores financeiros?
- **Decisão:** Introdução do status `PENDENTE_APROVACAO`. O valor reembolsável é apurado normalmente e incluído no montante reembolsável total, com sinalização explícita no item e no resumo.
- **Justificativa:** Atendimento integral à necessidade de controle de alçada executiva para despesas de maior vulto.
- **Regra afetada:** RN-015.

---

## 7. Casos de Borda

| Caso | Entrada | Comportamento Esperado | Regra |
|---|---|---|---|
| Despesa internacional em fim de semana | `30.00 EUR` em 2026-07-18 (sábado) | Converte usando taxa de 2026-07-17 (5.96) = R$ 178,80 | RN-013 |
| Despesa em moeda não cotada | `55.00 GBP` em 2026-07-21 | Recusada integralmente (R$ 0,00) por ausência de cotação | RN-013 |
| Despesa em USD sem nota > R$ 100 BRL | `40.00 USD` em 2026-07-20 (taxa 5.50 = R$ 220,00) | Recusada integralmente (R$ 0,00) por falta de nota fiscal | RN-005, RN-013 |
| Despesa em EUR sem nota <= R$ 100 BRL | `14.50 EUR` em 2026-07-15 (taxa 5.88 = R$ 85,26) | Aprovada para análise de limite normal; nota fiscal não exigida | RN-005, RN-013 |
| Hospedagem em CC-ENG-PLATAFORMA | Hospedagem com nota fiscal em colaborador de CC-ENG-PLATAFORMA | Recusada integralmente (R$ 0,00), limite 0.00 não reembolsável | RN-014 |
| Representação em CC-COMERCIAL | `representacao` com nota, R$ 340,00 | Teto de R$ 300,00: reembolsa R$ 300,00 e glosa R$ 40,00 | RN-004, RN-014 |
| Representação em CC Desconhecido | `representacao` em colaborador de `CC-SUPORTE-N2` | Recusada integralmente (R$ 0,00) por categoria fora do padrão | RN-009, RN-014 |
| Valor reembolsável superior a R$ 500 | Hospedagem aprovada de R$ 1.200,00 | Reembolso R$ 1.200,00 com status `PENDENTE_APROVACAO` | RN-015 |
| Categoria não permitida | `coworking` em `CC-COMERCIAL` | Recusada integralmente (R$ 0,00) | RN-009, RN-014 |

---

## 8. Ordem de Aplicação das Regras (Pipeline de Processamento v2.0)

Para cada despesa da lista, o pipeline segue rigorosamente a sequência:

```
[Normalização e Truncamento de Entrada]
   ↓
[Conversão Cambial (RN-013)]
   ↓ (se moeda != BRL, busca cotação no dia útil; se não existir cotação, marca recusa)
[Validação de Competência (RN-007)]
   ↓ (se fora da competência, marca recusa; não consome limites)
[Validação de Categoria e Centro de Custo (RN-009, RN-014)]
   ↓ (verifica se categoria é permitida no CC ou no padrão; checa limite 0.00)
[Verificação de Duplicidade (RN-008)]
   ↓ (se coincidir com item anterior, marca recusa; não consome limites)
[Validação Fiscal em BRL (RN-005)]
   ↓ (se valor_brl > 100 e tem_nota_fiscal for false, marca recusa; não consome limites)
[Aplicação de Limites por Centro de Custo e Viagem (RN-001..004, RN-006, RN-010)]
   ↓ (aplica tetos diários do CC com acréscimo de 50% se em_viagem for true; rebate estornos)
[Classificação de Fila de Aprovação (RN-015)]
   ↓ (se valor_reembolsado > 500.00, define status como PENDENTE_APROVACAO)
[Consolidação de Justificativas e Totais do Resumo (RN-012)]
```

---

## 9. Critérios de Aceite v2.0

O sistema está completo e pronto quando:

- [ ] Lê arquivo JSON de despesas, arquivo externo de política (`politica-v4.json`) e arquivo de câmbio (`cambio.json`).
- [ ] Processa com exatidão tanto os arquivos v3 (`despesas-exemplo.json`) quanto os novos cenários da v4 (`despesas-envelope.json` e `despesas-envelope-cc-desconhecido.json`).
- [ ] Converte moedas estrangeiras aplicando taxa da data ou do último dia útil anterior, recusando moedas não cotadas.
- [ ] Aplica os limites e restrições específicos por centro de custo com fallback para a política padrão.
- [ ] Atribui status `PENDENTE_APROVACAO` para lançamentos cujo reembolso exceda R$ 500,00.
- [ ] Todos os testes unitários, testes de casos de borda e testes de integração executam com 100% de sucesso.
