# CLAUDE.md

Este arquivo define as convenções operacionais e comandos do projeto para manter a conformidade rigorosa com a Rubrica de Avaliação do Desafio SDD.

## O projeto

Motor de cálculo de reembolso de despesas corporativas. Interface CLI que lê um lote de despesas em formato JSON e gera um relatório JSON detalhado com o valor aprovado e justificativas completas para cada item.

## Fonte da verdade

- `specs/001-motor-reembolso/spec.md` define **o que** o sistema faz.
- `specs/001-motor-reembolso/plan.md` define **como**.
- `specs/001-motor-reembolso/tasks.md` define **em que ordem**.

Quando o código e a spec discordarem, a spec está certa e o código é o bug — a menos que a spec precise ser ajustada, o que exige registrar em `DECISIONS.md` antes de qualquer alteração de código.

**Antes de implementar qualquer coisa, consulte a task em `tasks.md`.** Toda implementação deve estar associada a uma task previamente aprovada.

## Regras de trabalho

- Toda regra de negócio vive exclusivamente na `spec.md`, nunca apenas no chat ou em comentários de código.
- Qualquer regra explicada fora da spec é considerada um bug de especificação.
- Todo commit de código ou teste deve referenciar sua respectiva task:
  - `feat(T-003): <descrição>`
  - `test(T-003): <descrição>`
- Commits de documentação e planejamento utilizam:
  - `docs(spec):`, `docs(plan):`, `docs(tasks):`, `docs(sessions):`
- Nenhuma regra de negócio é entregue sem teste automatizado.

## Stack e comandos

- **Linguagem / Runtime:** Node.js 22.14.0 + TypeScript
- **Execução:** `npm start -- calcular --input <caminho> --output <caminho>`
- **Testes:** `npm test`
- **Validação de tipos:** `npm run typecheck`

## Convenções de código

- **Estrutura de pastas:** `src/` para código de domínio e CLI; `tests/` para testes automatizados; `specs/` para documentação viva de SDD.
- **Valores monetários:** Representação interna estritamente em **números inteiros de centavos** (ex: `R$ 60,00` = `6000`). Truncamento estrito em 2 casas decimais na ingestão de dados.
- **Tratamento de erros:** Mensagens amigáveis no `stderr` com códigos de saída semanticos (0 para sucesso, 1 para erro de validação/argumento).

## Fora de escopo

- Não realiza OCR ou leitura de comprovantes físicos.
- Não efetua chamadas a APIs bancárias ou gateways de pagamento.
- Não gerencia autenticação ou controle de permissões.
- Não busca taxas de câmbio na internet em tempo real (utiliza o arquivo de câmbio oficial).
