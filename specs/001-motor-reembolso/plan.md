# Plano Técnico — Motor de Cálculo de Reembolso

**Versão:** 2.0 · **Baseado na spec:** 2.0 (Política v4) · **Data:** 2026-09-30

> **Regra deste arquivo:** Aqui mora o COMO. Este arquivo descreve linguagem,
> bibliotecas, arquitetura e decisões de engenharia. Ele **não** introduz regra
> de negócio nova — toda regra pertence estritamente à `spec.md`.

---

## 1. Stack

| Escolha | O quê | Por quê | O que descartei e por quê |
|---|---|---|---|
| **Linguagem / Runtime** | Node.js 22.14.0 + TypeScript | Tipagem estática rigorosa para garantir contratos de dados sem bugs de schema em tempo de execução; ecossistema moderno com ESM nativo. Execução via `tsx` sem compilação intermediária lenta. | Python 3.11: descartado por alinhamento prévio com o usuário. JavaScript puro: descartado pela ausência de verificação estática de tipos em schemas com moedas e centros de custo. |
| **Testes** | `node:test` + `node:assert/strict` (Nativo do Node 22) | Nativo do Node 22, execução instantânea, zero dependências externas vulneráveis, suporte a subtestes (`describe`/`it`) e relatórios de execução detalhados. | Vitest / Jest: descartados para manter a suíte leve e sem overhead de configuração. |
| **Parsing e CLI** | `node:util` (`parseArgs`) + `node:fs/promises` | Nativo do Node 22, compatível com as flags obrigatórias (`--input`, `--output`) e opcionais (`--politica`, `--cambio`). | Bibliotecas pesadas (Commander/Yargs): descartadas por serem desnecessárias. |
| **Aritmética Monetária e Câmbio** | Centavos Inteiros (`src/money.ts`) + Conversor Cambial (`src/currency.ts`) | Elimina imprecisões de ponto flutuante. As taxas de câmbio convertem valores estrangeiros para BRL e o resultado é imediatamente convertido e truncado em centavos inteiros para as validações de limites e notas fiscais. | Ponto flutuante puro: descartado por risco de divergência de centavos no fechamento contábil. |

---

## 2. Arquitetura

### 2.1 Visão Geral e Fluxo de Dados v2.0

```
[Linha de Comando (CLI: cli.ts)]
        ↓ lê --input, --output, --politica, --cambio
[I/O Adapter: cli.ts]
        ↓ carrega despesas, politica-v4.json e cambio.json do disco
[Módulo de Câmbio: currency.ts]
        ↓ converte despesas em moeda estrangeira para BRL (PTAX útil) e trunca
[Motor de Regras de Negócio: engine.ts] ← [Carregador de Política: policy.ts]
        ↓ aplica limites do centro de custo do colaborador (com fallback)
        ↓ valida duplicatas, competência e notas fiscais (> R$ 100 BRL)
        ↓ calcula valores reembolsados e glosas
        ↓ classifica itens > R$ 500 como PENDENTE_APROVACAO (RN-015)
[Consolidador de Resumo e Justificativas]
        ↓ formata totais com centavos para BRL
[I/O Adapter: cli.ts]
        ↓ grava arquivo JSON final no caminho especificado em --output
[Arquivo de Saída resultado.json]
```

### 2.2 Fronteiras e Isolamento

- **Núcleo de Domínio (`engine.ts`, `policy.ts`, `currency.ts`, `money.ts`):** 100% livre de chamadas de terminal ou disco. Recebe as estruturas já desserializadas em memória e devolve o lote resultante. Testável em microssegundos com mocks e fixtures.
- **Carregador de Política Externa (`policy.ts`):** Capaz de ler a estrutura JSON de `politica-v4.json`, extrair as regras específicas do centro de custo informado e combinar com o bloco `padrao` (fallback aditivo).
- **Módulo Cambial (`currency.ts`):** Recebe o mapa de taxas de `cambio.json`, normaliza a busca da data com retrocesso automático para o último dia útil disponível (resolvendo sábados, domingos e feriados), e sinaliza erro quando a moeda não possuir cotação cadastrada.
- **Adaptador CLI (`cli.ts`):** Responsável único por tratar argumentos, invocar o carregamento dos arquivos e persistir o resultado.

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
  moeda?: string;      // Padrão: "BRL"
  tem_nota_fiscal: boolean;
}

export interface LoteEntrada {
  colaborador: ColaboradorEntrada;
  periodo: PeriodoEntrada;
  despesas: DespesaEntrada[];
}
```

### 3.2 Tipos de Política e Câmbio (`src/types.ts`)

```typescript
export interface RegraCategoria {
  limite: number;
  periodicidade: 'dia' | 'diaria';
  observacao?: string;
}

export interface PoliticaV4 {
  versao: string;
  vigencia: string;
  moeda_base: string;
  padrao: Record<string, RegraCategoria>;
  centros_custo: Record<string, Record<string, RegraCategoria>>;
  nota_fiscal_obrigatoria_acima_de: number;
  acrescimo_em_viagem_percentual: number;
}

export interface TabelaCambio {
  moeda_base: string;
  taxas: Record<string, Record<string, number>>; // data -> moeda -> taxa
}
```

### 3.3 Tipos de Saída (`src/types.ts`)

```typescript
export type StatusDespesa = 'APROVADO' | 'APROVADO_PARCIAL' | 'PENDENTE_APROVACAO' | 'RECUSADO';

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
  itens_pendentes_aprovacao: number;
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

## 4. Decisões Técnicas v2.0

### DT-001 — Conversão Cambial com Busca de Último Dia Útil Anterior
- **Contexto:** Fins de semana e feriados bancários não têm publicação de taxa PTAX em `cambio.json` (ex: sábado 2026-07-18 em `e-004`).
- **Decisão:** A função `obterTaxaCambio(data: string, moeda: string, tabela: TabelaCambio)` verifica se a data informada possui a taxa. Se não possuir, retrocede dia a dia (até no máximo 7 dias) buscando o último dia útil com taxa disponível. Se a moeda não existir na tabela (ex: GBP), retorna `null` para acionar a recusa integral do item.
- **Alternativa descartada:** Abortar a aplicação ou inventar taxas médias.
- **Consequência:** Fidelidade estrita aos princípios contábeis regulamentares do BACEN.

### DT-002 — Resolução de Limites com Fallback Aditivo por Centro de Custo
- **Contexto:** Centros de custo podem ser desconhecidos (`CC-SUPORTE-N2`) ou parciais (`CC-ADM`).
- **Decisão:** A função `obterRegraCategoria(centroCusto: string, categoria: string, politica: PoliticaV4)` busca primeiramente a categoria no centro de custo do colaborador. Se não encontrar e o centro de custo estiver cadastrado, herda do bloco `padrao`. Se a categoria tiver limite 0.00 (como hospedagem em `CC-ENG-PLATAFORMA`), respeita o teto zero. Se o centro de custo não estiver na lista de `centros_custo`, aplica diretamente a regra de `padrao` (categorias fora do padrão são recusadas).
- **Alternativa descartada:** Tratar centro de custo desconhecido como erro fatal de sistema.
- **Consequência:** Robustez total frente a novos centros de custo criados pelo RH sem necessidade de alterar o código.

### DT-003 — Classificação de Status para Valores > R$ 500 (Fila de Aprovação)
- **Contexto:** Gastos com valor aprovado elevado exigem aprovação manual de gerência.
- **Decisão:** Ao final do cálculo do item, se `valor_reembolsado > 500.00`, o status é definido como `PENDENTE_APROVACAO`, adicionando justificativa correspondente e incrementando `resumo.itens_pendentes_aprovacao`.
- **Alternativa descartada:** Descartar ou glosar o valor que excedesse 500.
- **Consequência:** Cumprimento do Item C opcional com transparência de estado no relatório.

---

## 5. Estratégia de Testes Atualizada

1. **Testes Unitários da Política v4 e Câmbio (`tests/v4_envelope.test.ts`):**
   - `test('RN-013: converte EUR em dia de semana pela cotação exata')`
   - `test('RN-013: converte EUR em sábado usando cotação do último dia útil anterior (sexta)')`
   - `test('RN-013: recusa integralmente despesa em moeda não cotada (GBP)')`
   - `test('RN-014: CC-ENG-PLATAFORMA não reembolsa hospedagem (limite zero)')`
   - `test('RN-014: CC-COMERCIAL aprova representacao com limite de R$ 300')`
   - `test('RN-014: centro de custo desconhecido adota politica padrao e recusa representacao')`
   - `test('RN-015: despesa reembolsável acima de R$ 500 recebe status PENDENTE_APROVACAO')`
2. **Testes de Integração de Arquivos Reais (`tests/cli_envelope.test.ts`):**
   - Executa a CLI contra `despesas-envelope.json` gerando relatório validado.
   - Executa a CLI contra `despesas-envelope-cc-desconhecido.json` gerando relatório validado.
   - Executa a CLI contra o arquivo legado v3 `despesas-exemplo.json` garantindo que nada quebrou (compatibilidade regressiva).
