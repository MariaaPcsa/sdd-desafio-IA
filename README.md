# Motor de Cálculo de Reembolso Corporativo (SDD)

Motor de linha de comando (CLI) determinístico e auditável para cálculo e validação de lotes de reembolso de despesas corporativas, desenvolvido em **Node.js 22 LTS + TypeScript**, seguindo a metodologia **Spec-Driven Development (SDD)**.

---

## 🚀 Como Instalar e Executar

### Pré-requisitos
- **Node.js**: versão `>= 22.0.0` (suporte a ESM nativo e test runner integrado).
- **npm**: versão `>= 10.0.0`.

### 1. Diretório do Projeto e Instalação

Abra o terminal e certifique-se de estar dentro da pasta do projeto:

```powershell
# Se estiver na pasta anterior, navegue para o projeto:
cd sdd-desafio-IA

# Instale as dependências:
npm install
```

### 2. Execução dos Testes Automatizados

O projeto utiliza o executor de testes nativo do Node.js (`node:test`), executando 37 testes automatizados cobrindo regras de negócio, casos de borda e cenários ponta a ponta:

```powershell
# Executa a suíte completa de testes (37 testes aprovados)
npm test

# Executa verificação estática de tipos TypeScript (0 erros)
npm run typecheck
```

### 3. Execução da CLI (`reembolso calcular`)

Os comandos abaixo são formatados em linha única, prontos para copiar e colar diretamente no **PowerShell**, **Prompt de Comando (CMD)** ou **Bash**:

#### Processamento do Lote de Referência (v3):
```powershell
npx tsx src/cli.ts calcular --input exemplos/despesas-exemplo.json --output resultado.json
```

#### Processamento do Cenário do Envelope Lacrado (Política v4 e Câmbio):
```powershell
npx tsx src/cli.ts calcular --input exemplos/envelope/despesas-envelope.json --output resultado-envelope.json --politica exemplos/envelope/politica-v4.json --cambio exemplos/envelope/cambio.json
```

#### Processamento de Centro de Custo Desconhecido (Fallback Padrão):
```powershell
npx tsx src/cli.ts calcular --input exemplos/envelope/despesas-envelope-cc-desconhecido.json --output resultado-desconhecido.json --politica exemplos/envelope/politica-v4.json --cambio exemplos/envelope/cambio.json
```

#### Exibição de Ajuda da CLI:
```powershell
npx tsx src/cli.ts --help
```

---

## 🏛️ Arquitetura e Decisões de Engenharia

1. **Aritmética Financeira Estrita em Centavos (`src/money.ts`):** Todos os cálculos internos, consolidações e glosas operam estritamente em centavos inteiros (`toCents`/`fromCents`), eliminando erros de arredondamento de ponto flutuante IEEE 754.
2. **Truncamento a Duas Casas Decimais (`RN-011`):** Conforme exigência contábil, valores com dízimas ou três casas decimais são truncados estritamente na segunda casa (ex: `33.333 -> 33.33`).
3. **Resolução Dinâmica por Centro de Custo (`src/policy.ts`, `RN-014`):** Suporte à tabela institucional v4 com limites diferenciados por departamento (`CC-COMERCIAL`, `CC-ENG-PLATAFORMA`, `CC-ADM`) e mecanismo de fallback aditivo para departamentos não cadastrados.
4. **Conversão Cambial com PTAX do Dia Útil Anterior (`src/currency.ts`, `RN-013`):** Conversão automática de despesas internacionais (`USD`, `EUR`) para `BRL`. Despesas em fins de semana e feriados adotam a taxa do último dia útil imediatamente anterior (convenção Banco Central). Moedas sem cotação cadastrada (ex: `GBP`) são recusadas integralmente com R$ 0,00.
5. **Fila de Aprovação Manual (`RN-015`):** Despesas cujo montante reembolsável ultrapassar R$ 500,00 recebem o status `PENDENTE_APROVACAO` e justificativa explícita de encaminhamento para a gerência.
6. **Transparência e Auditabilidade Integral (`RN-012`):** Cada despesa avaliada contém a lista completa de justificativas, histórico de conversão cambial e detalhamento das glosas aplicadas.

---

## 📁 Estrutura do Repositório

```
.
├── CLAUDE.md                                    # Convenções e instruções do agente de IA
├── README.md                                    # Instruções de execução e arquitetura do projeto
├── package.json                                 # Configuração do projeto e scripts npm
├── tsconfig.json                                # Configuração rigorosa do TypeScript
├── src/                                         # Código-fonte do motor
│   ├── types.ts                                 # Contratos e tipos TypeScript
│   ├── money.ts                                 # Aritmética de centavos inteiros e truncamento
│   ├── policy.ts                                # Resolução dinâmica de política e centros de custo
│   ├── currency.ts                              # Módulo cambial PTAX e fallback de dia útil
│   ├── engine.ts                                # Motor de cálculo puro e regras de negócio
│   └── cli.ts                                   # Interface de linha de comando
├── tests/                                       # Suítes de testes automatizados (37 testes)
│   ├── cli.test.ts                              # Testes de integração E2E da CLI
│   ├── cost_center.test.ts                      # Testes de centros de custo e fallback
│   ├── currency.test.ts                         # Testes de conversão cambial e PTAX
│   ├── foreign_currency.test.ts                 # Testes de validação fiscal em moeda estrangeira
│   ├── manual_approval.test.ts                  # Testes da fila de aprovação manual (> R$ 500)
│   ├── edge_cases.test.ts                       # Testes de casos de borda (fins de semana, estornos)
│   └── rules.test.ts                            # Testes unitários das regras RN-001 a RN-012
├── specs/001-motor-reembolso/                   # Trilha de especificação SDD
│   ├── spec.md                                  # Especificação formal v2.0 e regras de negócio
│   ├── plan.md                                  # Plano de arquitetura técnica v2.0
│   ├── tasks.md                                 # Lista de tarefas atômicas (T-001 a T-019)
│   └── DECISIONS.md                             # Log de decisões e resposta ao Envelope Lacrado
├── docs/                                        # Documentação e auditoria
│   ├── RELATORIO.md                             # Relatório final organizado pelos 4 Ds e Envelope
│   ├── RESUMO.md                                # Resumo executivo da entrega
│   ├── PARECER_TECNICO.md                       # Parecer formal da auditoria sênior independente
│   └── sessions/                                # Transcrições das sessões de trabalho com a IA
│       ├── 01-especificacao-e-decisoes.md       # Sessão 01: Especificação inicial v1.0
│       ├── 02-planejamento-e-tasks.md           # Sessão 02: Plano técnico e criação de tasks
│       ├── 03-envelope-lacrado-e-spec-v2.md     # Sessão 03: Absorção da Política v4
│       ├── 04-implementacao-e-testes.md         # Sessão 04: Implementação TDD e testes
│       └── 05-revisao-tecnica-e-auditoria-final.md # Sessão 05: Auditoria técnica e homologação CLI
└── exemplos/                                    # Arquivos de entrada e referência
    ├── despesas-exemplo.json                    # Arquivo de despesas original v3
    └── envelope/                                # Arquivos fornecidos no Envelope Lacrado v4
        ├── politica-v4.json
        ├── cambio.json
        ├── despesas-envelope.json
        └── despesas-envelope-cc-desconhecido.json
```

---

## 🔄 Protocolo Obrigatório para Mudanças (Regras de Negócio e Estrutura)

> **⚠️ REGRA DE OURO DO PROJETO:**  
> Sempre que houver qualquer alteração na **estrutura do projeto (pastas/arquivos)** ou nas **regras de negócio/política**, é **OBRIGATÓRIO** atualizar todos os arquivos de documentação com as novas informações **antes ou simultaneamente à entrega do código**. É estritamente proibido alterar o código sem atualizar a especificação e os artefatos de rastreabilidade.

### 📋 Checklist de Arquivos a Atualizar Obrigatoriamente:

1. **`specs/001-motor-reembolso/spec.md`:**
   - Registrar/atualizar as regras de negócio (`RN-xxx`), ambiguidades identificadas (`AMB-xxx`) e critérios de aceite verificáveis.
2. **`specs/001-motor-reembolso/DECISIONS.md`:**
   - Registrar formalmente a decisão arquitetural ou de negócio (`D-xxx`), com contexto, alternativas consideradas e impacto contábil.
3. **`specs/001-motor-reembolso/plan.md`:**
   - Atualizar a arquitetura técnica, interfaces TypeScript e contratos de dados afetados.
4. **`specs/001-motor-reembolso/tasks.md`:**
   - Decompor o trabalho em tarefas atômicas (`T-xxx`), com critérios de aceite individuais e mapeamento 1-para-1 com commits Git.
5. **`README.md`:**
   - Atualizar a árvore de diretórios, novas flags da CLI e instruções de execução.
6. **`docs/RELATORIO.md` e `docs/RESUMO.md`:**
   - Atualizar a matriz de evidências dos 4 Ds, totalizador de commits, quantidade de testes e relato de novos desafios.
7. **`docs/sessions/`:**
   - Registrar a nova sessão de trabalho (`0X-nome-da-sessao.md`) com as transcrições das decisões e intervenções humanas.

---

### ⚡ Comandos Obrigatórios de Validação e Homologação:

Antes de realizar commits ou finalizar qualquer alteração de regras ou estrutura, execute **obrigatoriamente** o seguinte ciclo no terminal:

```powershell
# 1. Checagem estática rigorosa de tipos TypeScript (deve retornar 0 erros)
npm run typecheck

# 2. Execução da suíte completa de testes automatizados (100% de aprovação obrigatória)
npm test

# 3. Teste de ponta a ponta da CLI com os lotes de exemplo e envelope
npx tsx src/cli.ts calcular --input exemplos/despesas-exemplo.json --output resultado.json
npx tsx src/cli.ts calcular --input exemplos/envelope/despesas-envelope.json --output resultado-envelope.json --politica exemplos/envelope/politica-v4.json --cambio exemplos/envelope/cambio.json

# 4. Verificação de status limpo e commits atômicos rastreáveis por task
git status
git add <arquivos-especificos>
git commit -m "feat(T-xxx): <descricao da mudanca alinhada a spec>"
```

---

## 🔍 Auditoria Independente (Skill `revisor`)

O repositório inclui a skill especializada [.agents/skills/revisor/SKILL.md](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/.agents/skills/revisor/SKILL.md) que audita a conformidade de todo o projeto frente à rubrica e especificação. Para acioná-la no chat:

- *"Ative a skill revisor e faça um code review completo das últimas tasks implementadas."*
- *"Revisor: audite o projeto contra a rubrica e aponte riscos de penalidade ou regressão."*
- *"Revise a aderência entre a spec.md e os testes em edge_cases.test.ts."*