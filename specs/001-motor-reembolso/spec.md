# Spec — Motor de Cálculo de Reembolso

**Versão:** 1.0 · **Status:** aprovada · **Última alteração:** 2026-09-28

> **Regra de ouro deste arquivo:** ele descreve o QUÊ e o PORQUÊ. Nenhuma linha
> aqui cita linguagem, biblioteca, classe, função ou estrutura de pastas.
>
> **Teste de aceitação da própria spec:** uma pessoa que nunca viu o projeto
> consegue, lendo só este arquivo, verificar se o sistema está correto.

---

## 1. Problema

Atualmente, o processo de conferência e reembolso de despesas corporativas é manual: a equipe financeira analisa despesas linha por linha confrontando planilhas contra a política institucional. Esse processo é moroso, sujeito a inconsistências de interpretação e resulta em atrasos nos pagamentos ou reembolsos indevidos que oneram a empresa.

## 2. Objetivo

Processar automaticamente um lote de despesas corporativas em formato estruturado (JSON), aplicando rigorosamente as diretrizes da política de reembolsos para determinar o valor devido a cada colaborador com justificativas transparentes e auditáveis para cada lançamento.

## 3. Fora de escopo

- Não realiza leitura de imagens de recibos ou processamento OCR.
- Não realiza integração direta com bancos, ERPs ou gateways de pagamento.
- Não realiza conversão cambial (todas as despesas são tratadas em Real - BRL).
- Não gerencia autenticação, autorização ou controle de acesso de usuários.
- Não altera arquivos de entrada originais; apenas gera o relatório de resultado em arquivo de saída.

---

## 4. Entrada e saída

### 4.1 Entrada

Conforme estrutura de `exemplos/despesas-exemplo.json`.

**Campos de cabeçalho:**

| Campo | Tipo | Significado | Obrigatório |
|---|---|---|---|
| `colaborador.id` | String | Identificador único do colaborador (ex: `"c-0417"`) | Sim |
| `colaborador.nome` | String | Nome completo do colaborador | Sim |
| `colaborador.centro_custo` | String | Centro de custo de lotação | Sim |
| `colaborador.em_viagem` | Booleano | Indicador se o colaborador estava em viagem a trabalho | Não (Padrão: `false`) |
| `periodo.competencia` | String | Mês/ano de competência no formato `YYYY-MM` | Sim |
| `periodo.inicio` | String | Data de início do período (`YYYY-MM-DD`) | Sim |
| `periodo.fim` | String | Data de término do período (`YYYY-MM-DD`) | Sim |

**Itens de despesa (`despesas[]`):**

| Campo | Tipo | Significado | Obrigatório |
|---|---|---|---|
| `id` | String | Identificador do lançamento (ex: `"d-001"`) | Sim |
| `data` | String | Data da ocorrência no formato `YYYY-MM-DD` | Sim |
| `categoria` | String | Categoria da despesa (ex: `"alimentacao"`, `"transporte_urbano"`, `"hospedagem"`) | Sim |
| `descricao` | String | Descrição detalhada do gasto | Sim |
| `fornecedor` | String | Nome do estabelecimento prestador | Sim |
| `valor` | Número | Valor da despesa em reais (aceita decimais) | Sim |
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
| `total_solicitado` | Número | Soma dos valores solicitados válidos em reais (2 decimais) |
| `total_reembolsavel` | Número | Soma dos valores aprovados para reembolso (2 decimais) |
| `total_glosado` | Número | Soma dos valores não reembolsados (`total_solicitado - total_reembolsavel`) |
| `itens_processados` | Inteiro | Total de itens avaliados |
| `itens_aprovados` | Inteiro | Quantidade de itens reembolsados integralmente |
| `itens_aprovados_parcialmente` | Inteiro | Quantidade de itens com corte parcial de excedente |
| `itens_recusados` | Inteiro | Quantidade de itens rejeitados (reembolso R$ 0,00) |

**Campos de cada item em `despesas[]`:**

| Campo | Tipo | Significado |
|---|---|---|
| `id` | String | Identificador original da despesa |
| `data` | String | Data da despesa (`YYYY-MM-DD`) |
| `categoria` | String | Categoria informada (normalizada para minúsculas) |
| `valor_solicitado` | Número | Valor original truncado em 2 casas decimais |
| `valor_reembolsado` | Número | Valor efetivamente aprovado para reembolso |
| `valor_glosado` | Número | Diferença entre o solicitado e o reembolsado |
| `status` | String | `"APROVADO"`, `"APROVADO_PARCIAL"` ou `"RECUSADO"` |
| `justificativas` | Array[String] | Lista de todos os motivos e regras que incidiram sobre o item |

#### Exemplo de Saída:

```json
{
  "colaborador": {
    "id": "c-0417",
    "nome": "Marina Volpi",
    "centro_custo": "CC-ENG-PLATAFORMA",
    "em_viagem": false
  },
  "periodo": {
    "competencia": "2026-07",
    "inicio": "2026-07-01",
    "fim": "2026-07-31"
  },
  "resumo": {
    "total_solicitado": 1944.93,
    "total_reembolsavel": 1056.23,
    "total_glosado": 888.70,
    "itens_processados": 14,
    "itens_aprovados": 6,
    "itens_aprovados_parcialmente": 1,
    "itens_recusados": 7
  },
  "despesas": [
    {
      "id": "d-001",
      "data": "2026-07-03",
      "categoria": "alimentacao",
      "valor_solicitado": 72.50,
      "valor_reembolsado": 60.00,
      "valor_glosado": 12.50,
      "status": "APROVADO_PARCIAL",
      "justificativas": [
        "Limite diário da categoria alimentação atingido (teto: R$ 60,00). Valor excedente de R$ 12,50 glosado."
      ]
    },
    {
      "id": "d-002",
      "data": "2026-07-03",
      "categoria": "alimentacao",
      "valor_solicitado": 38.00,
      "valor_reembolsado": 0.00,
      "valor_glosado": 38.00,
      "status": "RECUSADO",
      "justificativas": [
        "Limite diário da categoria alimentação já esgotado para a data 2026-07-03."
      ]
    }
  ]
}
```

---

## 5. Regras de Negócio

### RN-001 — Limite Diário de Alimentação
- **Regra:** O teto de despesas reembolsáveis para a categoria `alimentacao` é de R$ 60,00 por dia civil. O limite é consumido por data de ocorrência na ordem de aparição no arquivo de entrada. Despesas subsequentes no mesmo dia que encontrarem o saldo diário zerado terão reembolso de R$ 0,00.
- **Origem:** Política do RH, item 1.
- **Aceite:** No dia 2026-07-03, com `d-001` (R$ 72,50) e `d-002` (R$ 38,00), `d-001` reembolsa R$ 60,00 e `d-002` reembolsa R$ 0,00.

### RN-002 — Limite Diário de Transporte Urbano
- **Regra:** O teto de despesas reembolsáveis para a categoria `transporte_urbano` é de R$ 80,00 por dia civil, acumulado por data na ordem de processamento.
- **Origem:** Política do RH, item 2.
- **Aceite:** Uma despesa de transporte de R$ 100,00 com nota fiscal em dia sem outras despesas reembolsa R$ 80,00 e glosa R$ 20,00.

### RN-003 — Limite por Diária de Hospedagem
- **Regra:** O teto para despesas de `hospedagem` é de R$ 250,00 por diária. O sistema analisa a descrição da despesa buscando menção explícita a multiplicador de diárias (padrões como `"X diarias"`, `"X diárias"`, `"X noites"`). O teto da despesa é `quantidade_diarias * R$ 250,00`. Caso nenhum número de diárias seja identificado, considera-se 1 diária (teto de R$ 250,00).
- **Origem:** Política do RH, item 3.
- **Aceite:** Despesa com descrição `"Hotel Rio - 2 diarias"` de R$ 480,00 tem teto de R$ 500,00 (2 * 250) e é reembolsada integralmente em R$ 480,00.

### RN-004 — Reembolso Parcial de Excedente de Limite
- **Regra:** Despesas que ultrapassam o limite aplicável da categoria têm o valor até o limite aprovado e o excedente glosado, recebendo status `APROVADO_PARCIAL`.
- **Origem:** Política do RH, item 4.
- **Aceite:** Despesa elegível de alimentação de R$ 72,50 com limite de R$ 60,00 gera reembolso de R$ 60,00, glosa de R$ 12,50 e status `APROVADO_PARCIAL`.

### RN-005 — Obrigatoriedade de Nota Fiscal para Valores Acima de R$ 100,00
- **Regra:** Toda despesa com valor original estritamente superior a R$ 100,00 (`valor > 100.00`) exige `tem_nota_fiscal: true`. Se `tem_nota_fiscal` for `false`, a despesa é **recusada integralmente** (reembolso R$ 0,00 e status `RECUSADO`) por inconformidade fiscal, não havendo reembolso parcial. Despesas com valor igual ou inferior a R$ 100,00 (`valor <= 100.00`) não exigem nota fiscal.
- **Origem:** Política do RH, item 5.
- **Aceite:** Despesa de R$ 100,00 com `tem_nota_fiscal: false` é elegível a reembolso. Despesa de R$ 100,01 com `tem_nota_fiscal: false` é recusada com valor reembolsado R$ 0,00.

### RN-006 — Ampliação de Limites para Colaborador em Viagem
- **Regra:** Caso o colaborador esteja em viagem a trabalho (`colaborador.em_viagem == true`), todos os limites diários e de diária da política são acrescidos de 50%. Novos tetos: Alimentação: R$ 90,00/dia; Transporte Urbano: R$ 120,00/dia; Hospedagem: R$ 375,00/diária. Se o campo for omitido ou `false`, aplicam-se os limites padrão de 100%.
- **Origem:** Política do RH, item 6.
- **Aceite:** Para colaborador com `em_viagem: true`, uma despesa de alimentação de R$ 75,00 é reembolsada integralmente em R$ 75,00 (pois 75 <= 90).

### RN-007 — Validação do Período de Competência
- **Regra:** Toda despesa deve possuir data dentro do intervalo de competência do lote (`periodo.inicio <= despesa.data <= periodo.fim`). Despesas com datas fora desse intervalo são **recusadas integralmente** (reembolso R$ 0,00) com justificativa de despesa fora de competência e não afetam os limites diários.
- **Origem:** Política do RH, item 7.
- **Aceite:** Despesa datada de 2026-04-15 em lote de competência 2026-07 (01/07 a 31/07) é recusada com R$ 0,00.

### RN-008 — Tratamento de Duplicatas
- **Regra:** Uma despesa é caracterizada como duplicata quando possuir a mesma data, mesma categoria (normalizada), mesmo fornecedor, mesma descrição e mesmo valor de uma despesa processada anteriormente no mesmo lote. A primeira ocorrência é processada normalmente; a segunda e posteriores ocorrências são **recusadas integralmente** (reembolso R$ 0,00) com motivo de duplicidade, não consumindo limites.
- **Origem:** Política do RH, item 8.
- **Aceite:** `d-006` e `d-007` idênticas (mesma data, fornecedor, valor R$ 54,90). `d-006` é processada; `d-007` é recusada por duplicidade.

### RN-009 — Categorias Elegíveis e Normalização
- **Regra:** O campo categoria é padronizado para caracteres minúsculos antes da análise. As únicas categorias cobertas pela política são: `alimentacao`, `transporte_urbano` e `hospedagem`. Despesas com categorias diferentes dessas (ex: `coworking`) são **recusadas integralmente** (reembolso R$ 0,00) com justificativa de categoria não permitida.
- **Origem:** Política do RH, item 9.
- **Aceite:** Categoria `"ALIMENTACAO"` é convertida para `"alimentacao"` e processada. Categoria `"coworking"` é recusada com R$ 0,00.

### RN-010 — Tratamento de Estornos e Valores Negativos
- **Regra:** Despesas com valores negativos representam estornos/cancelamentos de transações. O valor negativo é abatido do total geral reembolsável e estorna o consumo do teto diário da respectiva categoria e data.
- **Origem:** Política do RH (omissa nos dados de exemplo).
- **Aceite:** `d-009` com valor R$ -45,00 em transporte no dia 2026-07-11 reduz o montante reembolsável em R$ 45,00 e restabelece R$ 45,00 de limite de transporte naquela data.

### RN-011 — Precisão Numérica e Truncamento
- **Regra:** Valores monetários na entrada que apresentarem mais de 2 casas decimais são **truncados** em duas casas decimais no momento da leitura (sem arredondamento para cima). Todas as operações monetárias subsequentes operam estritamente com duas casas decimais.
- **Origem:** Fronteira numérica (exemplo `d-011`).
- **Aceite:** Valor de entrada `33.333` é truncado e processado como `33.33`.

### RN-012 — Transparência Integral de Justificativas
- **Regra:** Toda despesa avaliada deve listar na saída **todos os motivos e regras** que a afetaram, inclusive se houver múltiplas violações concorrentes, viabilizando feedback compreensível sem necessidade de retrabalho ou dúvidas do colaborador.
- **Origem:** Princípio de transparência auditável do processo.
- **Aceite:** Um item fora da competência e acima de R$ 100 sem nota fiscal terá ambos os motivos explicitados no campo `justificativas`.

---

## 6. Ambiguidades Identificadas e Decisões

### AMB-001 — Unidade de Aplicação do Limite Diário de Alimentação e Transporte
- **Texto original do RH:** "1. Alimentação tem limite de R$ 60 por dia." / "2. Transporte urbano tem limite de R$ 80 por dia."
- **O que não está claro:** O limite é por despesa ou sobre a soma diária? Havendo múltiplos itens no mesmo dia que juntos ultrapassam o teto, como o saldo é alocado?
- **Decisão:** Limite aplicado sobre o somatório diário da categoria por data civil. O saldo diário é consumido pela ordem em que os lançamentos aparecem no arquivo.
- **Justificativa:** Reflete o conceito de teto diário corporativo, evitando que múltiplos lançamentos fracionados burlem o limite da política.
- **Regra afetada:** RN-001, RN-002, RN-004.

### AMB-002 — Fronteira da Exigência de Nota Fiscal (R$ 100,00)
- **Texto original do RH:** "5. Nota fiscal é obrigatória acima de R$ 100."
- **O que não está claro:** Despesa de exatamente R$ 100,00 exige nota fiscal ou a obrigatoriedade é estritamente maior que R$ 100,00 (> 100)?
- **Decisão:** Fronteira estrita (`valor > 100.00`). R$ 100,00 exatos não requer nota fiscal; R$ 100,01 requer nota fiscal.
- **Justificativa:** Interpretação literal do termo "acima de", comum em políticas de conformidade financeira corporativa.
- **Regra afetada:** RN-005.

### AMB-003 — Efeito da Falta de Nota Fiscal Obrigatória
- **Texto original do RH:** "4. Despesas acima do limite são reembolsadas parcialmente." vs "5. Nota fiscal é obrigatória acima de R$ 100."
- **O que não está claro:** Se um item acima de R$ 100 não tiver nota fiscal, ele é recusado integralmente ou recebe reembolso parcial até R$ 100 ou até o teto da categoria?
- **Decisão:** Recusa integral (R$ 0,00 reembolsado).
- **Justificativa:** Ausência de comprovação fiscal exigida por lei e compliance invalida o desembolso da empresa por inteiro.
- **Regra afetada:** RN-005.

### AMB-004 — Identificação do Colaborador "Em Viagem"
- **Texto original do RH:** "6. Colaborador em viagem tem limites ampliados em 50%."
- **O que não está claro:** O arquivo de entrada padrão não trazia o campo de viagem. Como o sistema identifica essa condição?
- **Decisão:** Adotada a existência do campo `colaborador.em_viagem` (booleano). Quando o campo estiver ausente, assume-se `false` por padrão.
- **Justificativa:** Desacopla a informação cadastral da tentativa de adivinhar status de viagem via heurísticas frágeis de nomes de hotéis.
- **Regra afetada:** RN-006.

### AMB-005 — Critério de Duplicatas e Tratamento
- **Texto original do RH:** "8. Duplicatas devem ser tratadas."
- **O que não está claro:** O que define uma duplicata e como ela é tratada (recusa uma, recusa ambas ou envia para conferência)?
- **Decisão:** Duplicata é definida pela coincidência de data, categoria, fornecedor, descrição e valor. A primeira ocorrência é mantida e processada; a segunda é recusada integralmente com motivo "Despesa duplicada".
- **Justificativa:** Permite que o colaborador receba o pagamento legítimo da primeira despesa sem ser prejudicado por erro de duplicidade de envio.
- **Regra afetada:** RN-008.

### AMB-006 — Quantidade de Diárias de Hospedagem
- **Texto original do RH:** "3. Hospedagem tem limite de R$ 250 por diária."
- **O que não está claro:** A entrada traz lançamentos únicos com valores altos e textos como "Hotel Rio - 2 diarias". Como calcular o teto sem campo numérico de diárias?
- **Decisão:** O sistema extrai o multiplicador de diárias da descrição por expressões regulares (ex: `"X diarias"`, `"X diárias"`, `"X noites"`). O teto passa a ser `diarias * 250`. Se não houver indicador, assume 1 diária.
- **Justificativa:** Garante aderência à realidade dos lançamentos em que notas de hotel cobrem múltiplas noites sob uma única cobrança.
- **Regra afetada:** RN-003.

### AMB-007 — Tratamento de Valores Negativos (Estornos)
- **Texto original do RH:** A política é completamente omissa sobre valores negativos.
- **O que não está claro:** Como valores negativos de estorno de corrida ou compras afetam os tetos diários e o total a pagar?
- **Decisão:** O valor negativo é abatido do montante total a reembolsar e estorna proporcionalmente o consumo do limite diário daquela categoria na respectiva data.
- **Justificativa:** Mantém a exatidão financeira entre a despesa líquida real do colaborador e o saldo devido pela empresa.
- **Regra afetada:** RN-010.

### AMB-008 — Validação e Alcance da Competência
- **Texto original do RH:** "7. Despesas devem ser lançadas dentro do período de competência."
- **O que não está claro:** Despesas com atraso de meses anteriores podem ser toleradas ou são sumariamente rejeitadas?
- **Decisão:** Rejeição integral (R$ 0,00) de qualquer despesa cuja data seja anterior a `periodo.inicio` ou posterior a `periodo.fim`.
- **Justificativa:** Fechamento contábil e fiscal corporativo exige estrita competência mensal para dedução tributária.
- **Regra afetada:** RN-007.

### AMB-009 — Tratamento de Casas Decimais Excessivas
- **Texto original do RH:** Omissa quanto à precisão decimal (ex: valor `33.333`).
- **O que não está claro:** Arredondar para cima, arredondar para o par mais próximo ou truncar?
- **Decisão:** Truncamento estrito em 2 casas decimais na ingestão do dado.
- **Justificativa:** Evita inflar valores a pagar por dízimas ou inconsistências de sistemas de ponto de venda.
- **Regra afetada:** RN-011.

### AMB-010 — Padronização de Caixa de Texto em Categorias
- **Texto original do RH:** Omissa quanto à sensibilidade de maiúsculas/minúsculas.
- **O que não está claro:** `"ALIMENTACAO"` em maiúsculas deve ser recusada por não casar com `"alimentacao"`?
- **Decisão:** Normalização prévia para minúsculas antes da validação.
- **Justificativa:** Evita recusas indevidas por variação estilística de digitação ou divergência entre sistemas emissores.
- **Regra afetada:** RN-009.

### AMB-011 — Concorrência de Violações e Relato de Motivos
- **Texto original do RH:** Omissa sobre ordem de precedência de erros.
- **O que não está claro:** Se um item violar a competência e não tiver nota fiscal, qual justificativa é emitida?
- **Decisão:** Todos os motivos de recusa e apontamentos são avaliados e retornados cumulativamente na lista `justificativas`.
- **Justificativa:** Oferece clareza total ao colaborador em uma única iteração, dispensando idas e vindas de suporte.
- **Regra afetada:** RN-012.

---

## 7. Casos de Borda

| Caso | Entrada | Comportamento Esperado | Regra |
|---|---|---|---|
| Múltiplas despesas de alimentação no dia | 2 despesas no mesmo dia de R$ 40 cada (sem viagem) | 1ª reembolsa R$ 40; 2ª reembolsa R$ 20 (atinge teto de R$ 60) e glosa R$ 20 | RN-001 |
| Despesa no limite exato de nota fiscal | Valor R$ 100,00, sem nota fiscal | Aprovada para análise de limite normal; não é recusada por falta de nota | RN-005 |
| Despesa R$ 0,01 acima do limite de nota fiscal | Valor R$ 100,01, sem nota fiscal | Recusada integralmente (reembolso R$ 0,00) | RN-005 |
| Categoria inválida/desconhecida | Categoria `"coworking"` | Recusada integralmente (reembolso R$ 0,00) | RN-009 |
| Despesa idêntica em data igual | 2 despesas de R$ 54,90 no Bistro Central no mesmo dia | 1ª processada; 2ª recusada com status `RECUSADO` por duplicidade | RN-008 |
| Despesa fora da competência | Data 2026-04-15 em competência de 2026-07 | Recusada integralmente (reembolso R$ 0,00) | RN-007 |
| Despesa com 3 casas decimais | Valor `33.333` | Truncado para `33.33` antes do cálculo | RN-011 |
| Estorno de despesa | Valor `-45.00` | Subtrai R$ 45 do total e restabelece limite diário da data | RN-010 |
| Hospedagem com múltiplas diárias | Valor R$ 480,00, descrição `"Hotel Rio - 2 diarias"` | Teto calculado: R$ 500. Reembolsa integralmente R$ 480 | RN-003 |
| Despesa em fim de semana / plantão | Alimentação em sábado de plantão dentro da competência | Avaliada sob as regras e limites diários normais de alimentação | RN-001 |
| Colaborador em viagem com alimentação | `em_viagem: true`, valor R$ 85,00 em alimentação | Reembolsado integralmente (teto ampliado de R$ 90) | RN-006 |

---

## 8. Ordem de Aplicação das Regras (Pipeline de Processamento)

Para cada despesa da lista, o pipeline segue rigorosamente a seguinte sequência:

```
[Normalização e Truncamento]
   ↓ (converte categoria para minúsculo, trunca valor em 2 decimais)
[Validação de Competência (RN-007)]
   ↓ (se fora da competência, marca recusa; não consome limites)
[Validação de Categoria (RN-009)]
   ↓ (se categoria inválida, marca recusa; não consome limites)
[Verificação de Duplicidade (RN-008)]
   ↓ (se coincidir com item anterior válido, marca recusa; não consome limites)
[Validação Fiscal (RN-005)]
   ↓ (se valor > 100 e tem_nota_fiscal for false, marca recusa; não consome limites)
[Aplicação de Limites e Tetos (RN-001, RN-002, RN-003, RN-004, RN-006, RN-010)]
   ↓ (se for estorno, abate; se for despesa positiva, abate do saldo disponível da categoria no dia)
[Consolidação de Justificativas e Totais (RN-012)]
```

---

## 9. Critérios de Aceite

O sistema está completo e pronto quando:

- [ ] Lê arquivo JSON via linha de comando `--input <caminho>` e gera JSON em `--output <caminho>`.
- [ ] Processa com exatidão o arquivo de teste `exemplos/despesas-exemplo.json` gerando os valores totais e detalhados esperados.
- [ ] Glosa excedentes de limites diários e diárias conforme as regras RN-001 a RN-004.
- [ ] Recusa com R$ 0,00 qualquer despesa > R$ 100 sem nota fiscal (RN-005).
- [ ] Aplica acréscimo de 50% em todos os limites quando `colaborador.em_viagem == true` (RN-006).
- [ ] Recusa itens fora da competência (RN-007) e duplicatas (RN-008).
- [ ] Trunca valores monetários na entrada em 2 casas decimais (RN-011).
- [ ] Todos os testes unitários e de integração cobrindo cada RN e caso de borda executam e passam com 100% de sucesso.

---

## 10. O que Fica em Aberto

1. **Descrição de hospedagem sem padrão identificável:** Se o colaborador lançar uma hospedagem de 5 dias com valor alto e descrição vaga como `"Estadia em conferência"`, o sistema assumirá 1 diária (R$ 250,00) e glosará o restante. Decisão provisória: manter esse comportamento para resguardar a empresa e documentar na justificativa a necessidade de especificar o número de diárias.
2. **Estorno de categoria não lançada anteriormente:** Se houver um estorno sem despesa prévia correspondente no mesmo arquivo, o sistema abate do total geral e mantém o limite diário da data intacto.
