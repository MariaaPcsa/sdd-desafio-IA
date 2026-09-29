# Plano Técnico — Motor de Cálculo de Reembolso

**Versão:** 1.0 · **Baseado na spec:** 1.0 · **Data:** 2026-09-28

> **Regra deste arquivo:** Aqui mora o COMO. Este arquivo descreve linguagem,
> bibliotecas, arquitetura e decisões de engenharia. Ele **não** introduz regra
> de negócio nova — toda regra pertence estritamente à `spec.md`.

---

## 1. Stack

| Escolha | O quê | Por quê | O que descartei e por quê |
|---|---|---|---|
| **Linguagem / Runtime** | Node.js 22.14.0 + TypeScript | Tipagem estática rigorosa para garantir contratos de dados sem bugs de schema em tempo de execução; ecossistema moderno com ESM nativo. Execução via `tsx` sem compilação intermediária lenta. | Python 3.11: descartado por preferência do usuário em padronizar com stack Node.js/TypeScript. JavaScript puro: descartado pela falta de garantias estáticas de tipos nos schemas complexos de entrada/saída. |
| **Testes** | `node:test` + `node:assert/strict` (Nativo do Node 22) | Nativo do Node 22, execução instantânea, zero dependências externas vulneráveis, suporte a subtestes (`describe`/`it`) e relatórios de execução detalhados. | Jest: descartado por complexidade de configuração ESM/TypeScript e overhead de inicialização. Vitest: viável, porém o runner nativo do Node 22 atende 100% com menor acoplamento. |
| **Parsing e CLI** | `node:util` (`parseArgs`) + `node:fs/promises` | Nativo do Node 22, compatível com a especificação POSIX e o comando requerido (`<cmd> calcular --input <file> --output <file>`). | Commander / Yargs: descartados para manter a aplicação leve, sem dependências transitivas desnecessárias. |
| **Aritmética Monetária** | Módulo de Centavos Inteiros (`src/money.ts`) | Elimina por completo os erros de imprecisão binária de ponto flutuante do padrão IEEE 754 (ex: `0.1 + 0.2 !== 0.3`). Todas as somas, limites e truncamento operam em números inteiros (centavos). | Ponto flutuante nativo (`number`): descartado por gerar dízimas espúrias e erros de centavos em balanços financeiros. Bibliotecas externas pesadas: descartadas em favor de uma modelagem determinística simples e transparente em centavos. |

---

## 2. Arquitetura

### 2.1 Visão Geral e Fluxo de Dados

A arquitetura adota a separação estrita entre **Adaptadores de I/O** e o **Núcleo de Domínio Puro**:

```
[Linha de Comando (CLI)]
        ↓ lê caminho de entrada e saída
[I/O Adapter: cli.ts]
        ↓ lê arquivo do disco e desserializa JSON
[Validador de Entrada e Conversor de Centavos: money.ts]
        ↓ Lote tipado em memória com valores em centavos
[Motor de Regras de Negócio: engine.ts] ← [Configuração da Política: policy.ts]
        ↓ Executa pipeline puro de regras (RN-001 a RN-012)
[Consolidador de Resumo e Justificativas]
        ↓ Converte centavos para BRL com 2 casas decimais
[I/O Adapter: cli.ts]
        ↓ Serializa JSON formatado e grava no arquivo de destino
[Arquivo de Saída resultado.json]
```

### 2.2 Fronteiras e Isolamento

- **Núcleo Puro (`engine.ts`, `policy.ts`, `money.ts`):** Não possui conhecimento sobre terminal, linha de comando, arquivos em disco ou chamadas assíncronas de I/O. Recebe estruturas de dados em memória e devolve estruturas de dados. É 100% determinístico e testável de forma isolada em microssegundos.
- **Configuração da Política (`policy.ts`):** Todos os valores numéricos (tetos de alimentação, transporte, hospedagem, limite de nota fiscal, percentuais de viagem) ficam isolados em uma estrutura de configuração declarativa. O motor consome essa configuração através de parâmetros, o que garante que uma alteração futura na política (como a do Dia 2) seja absorvida alterando pouquíssimas linhas sem alterar a mecânica do motor.
- **Adaptador de Interface (`cli.ts`):** Responsável único por ler `process.argv`, validar a presença das flags `--input` e `--output`, capturar exceções de arquivo não encontrado ou JSON malformado e imprimir mensagens amigáveis no `stderr` com os respectivos códigos de saída (`exit code`).

---

## 3. Modelo de Dados

### 3.1 Tipos de Entrada (`src/types.ts`)

```typescript
export interface ColaboradorEntrada {
  id: string;
  nome: string;
  centro_custo: string;
  em_viagem?: boolean;
}

export interface PeriodoEntrada {
  competencia: string; // "YYYY-MM"
  inicio: string;      // "YYYY-MM-DD"
  fim: string;         // "YYYY-MM-DD"
}

export interface DespesaEntrada {
  id: string;
  data: string;        // "YYYY-MM-DD"
  categoria: string;
  descricao: string;
  fornecedor: string;
  valor: number;
  tem_nota_fiscal: boolean;
}

export interface LoteEntrada {
  colaborador: ColaboradorEntrada;
  periodo: PeriodoEntrada;
  despesas: DespesaEntrada[];
}
```

### 3.2 Tipos de Saída (`src/types.ts`)

```typescript
export type StatusDespesa = 'APROVADO' | 'APROVADO_PARCIAL' | 'RECUSADO';

export interface DespesaSaida {
  id: string;
  data: string;
  categoria: string;
  valor_solicitado: number;
  valor_reembolsado: number;
  valor_glosado: number;
  status: StatusDespesa;
  justificativas: string[];
}

export interface ResumoSaida {
  total_solicitado: number;
  total_reembolsavel: number;
  total_glosado: number;
  itens_processados: number;
  itens_aprovados: number;
  itens_aprovados_parcialmente: number;
  itens_recusados: number;
}

export interface LoteSaida {
  colaborador: ColaboradorEntrada;
  periodo: PeriodoEntrada;
  resumo: ResumoSaida;
  despesas: DespesaSaida[];
}
```

---

## 4. Como a Política é Representada

A política vive em `src/policy.ts` em formato declarativo:

```typescript
export interface PoliticaReembolso {
  categoriasValidas: string[];
  limitesDiariosCentavos: {
    alimentacao: number;
    transporte_urbano: number;
    hospedagem: number;
  };
  limiteNotaFiscalCentavos: number;
  acrescimoViagemPercentual: number;
}

export const POLITICA_PADRAO_RH: PoliticaReembolso = {
  categoriasValidas: ['alimentacao', 'transporte_urbano', 'hospedagem'],
  limitesDiariosCentavos: {
    alimentacao: 6000,       // R$ 60,00
    transporte_urbano: 8000, // R$ 80,00
    hospedagem: 25000,       // R$ 250,00 por diária
  },
  limiteNotaFiscalCentavos: 10000,    // R$ 100,00 (fronteira estrita > 100)
  acrescimoViagemPercentual: 50,      // +50%
};
```

O motor calcula dinamicamente os limites ativos daquele processamento:
- Se `colaborador.em_viagem === true`:
  - Alimentação: `6000 * 1.5 = 9000` (R$ 90,00)
  - Transporte: `8000 * 1.5 = 12000` (R$ 120,00)
  - Hospedagem: `25000 * 1.5 = 37500` (R$ 375,00)
- Se `colaborador.em_viagem !== true`: utiliza os valores base de `POLITICA_PADRAO_RH`.

---

## 5. Decisões Técnicas

### DT-001 — Aritmética de Centavos Inteiros com Truncamento na Leitura
- **Contexto:** Números fracionários em JavaScript sofrem de arredondamentos imprevisíveis (ex: `100.01` em float pode se comportar como `100.010000000000005`). A regra RN-011 exige truncamento em 2 casas decimais.
- **Decisão:** Na leitura de cada valor, multiplicar por 100 aplicando truncamento direto via manipulação de string ou `Math.trunc(val * 100)`. Todos os cálculos internos são executados como inteiros (`number` em centavos). Na montagem final do JSON de saída, divide-se por 100 formatando com 2 casas.
- **Alternativa descartada:** Uso de `float` padrão ou bibliotecas de BigNumber externas.
- **Consequência:** Garante precisão financeira total e exatidão sem dependências externas.

### DT-002 — Motor de Regras com Pipeline Funcional em Memória
- **Contexto:** Cada despesa deve passar por um conjunto ordenado de checagens (competência, categoria, duplicata, nota fiscal, limite de teto e estorno).
- **Decisão:** O motor implementa uma função pura `processarLote(lote: LoteEntrada, politica?: PoliticaReembolso): LoteSaida`. O processamento itera sobre as despesas acumulando um estado diário (`Map<data_categoria, saldoConsumidoCentavos>`) e um conjunto de assinaturas de duplicatas (`Set<hash_despesa>`).
- **Alternativa descartada:** Padrões com banco de dados em memória ou regras imperativas dispersas com efeitos colaterais.
- **Consequência:** Permite testes unitários ultrarrápidos e simplifica a rastreabilidade direta de cada regra RN-00X.

### DT-003 — Extração de Diárias via Regex Estruturada
- **Contexto:** A política define teto por diária para hospedagem (R$ 250,00), mas a entrada agrupa estadias em um único item informando o período apenas no campo de texto livre `descricao` (ex: `"Hotel Rio - 2 diarias"`, `"Airbnb 3 noites"`).
- **Decisão:** Criar uma função utilitária `extrairQuantidadeDiarias(descricao: string): number` que procura padrões como `/(\d+)\s*(?:di[aá]rias?|noites?)/i`. Se encontrar um número `N`, o teto daquela despesa é `N * limiteDiaria`. Se não encontrar, retorna `1`.
- **Alternativa descartada:** Assumir fixamente 1 diária para qualquer lançamento (o que glosaria indevidamente hospedagens de múltiplos dias aprovadas pelo RH).
- **Consequência:** Resolve a ambiguidade AMB-006 com consistência e transparência.

### DT-004 — Tratamento de Estornos com Atualização de Saldo
- **Contexto:** A despesa `d-009` traz um valor negativo (`-45.00`) correspondente a cancelamento de corrida.
- **Decisão:** Um item negativo reduz o valor total acumulado do reembolso do colaborador e subtrai do consumo diário acumulado daquela categoria na data correspondente, reabrindo o teto diário.
- **Alternativa descartada:** Rejeitar itens negativos como entrada inválida.
- **Consequência:** Fidelidade ao fluxo financeiro real e atendimento integral ao exemplo fornecido pelo desafio.

---

## 6. Estratégia de Testes

### 6.1 Níveis de Teste

1. **Testes Unitários de Regras de Negócio (`tests/rules.test.ts`):** 
   - Exercitam isoladamente cada função e regra do motor sem tocar em arquivos.
   - Nomenclatura rastreável: cada teste referencia explicitamente o ID da regra da spec (`RN-001` a `RN-012`).
2. **Testes de Casos de Borda (`tests/edge_cases.test.ts`):**
   - Cobrem cada linha da tabela de casos de borda da Seção 7 da `spec.md`.
3. **Testes de Integração e CLI (`tests/cli.test.ts`):**
   - Invoca a CLI real com o arquivo `exemplos/despesas-exemplo.json` gerando arquivo temporário de saída e validando a integridade estrutural e numérica do JSON final.

### 6.2 Matriz de Rastreabilidade Requisito → Teste

| Requisito na Spec | Nome do Teste Automatizado |
|---|---|
| **RN-001** | `test('RN-001: limite diário de alimentação com corte parcial e esgotamento subsequente')` |
| **RN-002** | `test('RN-002: limite diário de transporte urbano de R$ 80')` |
| **RN-003** | `test('RN-003: hospedagem calcula teto multiplicando diárias da descrição')` |
| **RN-004** | `test('RN-004: despesa excedente recebe status APROVADO_PARCIAL e glosa saldo')` |
| **RN-005** | `test('RN-005: despesa de R$ 100,00 sem nota é elegível; despesa de R$ 100,01 sem nota é recusada com R$ 0')` |
| **RN-006** | `test('RN-006: colaborador em viagem tem todos os limites acrescidos de 50%')` |
| **RN-007** | `test('RN-007: despesa fora do período de competência é recusada integralmente')` |
| **RN-008** | `test('RN-008: despesa duplicada é recusada e não consome limites')` |
| **RN-009** | `test('RN-009: categoria inválida é recusada; categoria em maiúsculas é normalizada')` |
| **RN-010** | `test('RN-010: estorno negativo subtrai do total e restabelece limite diário')` |
| **RN-011** | `test('RN-011: valor com três casas decimais é truncado em duas casas')` |
| **RN-012** | `test('RN-012: despesa com múltiplas violações reporta todas as justificativas')` |

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Mudança de requisitos no Dia 2 alterar fórmulas ou limites | Alta | Parâmetros e limites concentrados exclusivamente em `src/policy.ts`. Motor recebe a política como injeção de dependência. |
| Incompatibilidade de execução entre Windows e Linux (CRLF/LF, paths de CLI) | Média | Uso de `path.resolve` e manipulação agnóstica de caminhos de arquivo em Node.js; scripts npm portáveis no `package.json`. |
| Erro de arredondamento em centavos nos somatórios do resumo | Baixa | Aritmética inteira estrita em centavos do início ao fim; soma dos itens bate matematicamente com o totalizador do resumo (`solicitado = reembolsavel + glosado`). |
