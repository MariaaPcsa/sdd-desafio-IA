# Checklist Detalhado do Revisor Técnico Sênior

Utilize este checklist como guia de inspeção linha a linha durante a revisão do projeto.

---

## 1. Conformidade com a Especificação (SDD)

- [ ] **Desambiguação Completa:** Todas as ambiguidades da política (unidade de aplicação, fronteira, dado ausente) possuem decisão explícita e justificativa de negócio em `spec.md`?
- [ ] **Isolamento de Solução:** A `spec.md` contém apenas requisitos de negócio (o QUÊ e o PORQUÊ), sem mencionar nomes de bibliotecas, classes, frameworks ou arquivos de código?
- [ ] **Escopo Negativo:** Há seção clara declarando o que o sistema **não** faz?
- [ ] **Alinhamento Spec x Código:** O comportamento do código reflete fielmente o que está escrito na spec? Se houver divergência, a spec foi atualizada primeiro via `DECISIONS.md`?
- [ ] **Ausência de Conhecimento Fantasma:** Nenhuma regra de negócio reside exclusivamente em variáveis do código, comentários ou conversas de chat.

---

## 2. Rastreabilidade e Git

- [ ] **Granularidade de Tasks:** Cada requisito de negócio possui uma tarefa mapeada em `tasks.md` com critério de aceite claro.
- [ ] **Padrão Semântico de Commits:** Todos os commits de funcionalidade e testes referenciam o ID da task (ex.: `feat(T-015): ...`, `test(T-015): ...`).
- [ ] **Commits de Documentação:** Commits em specs e relatórios usam prefixos padronizados (`docs(spec):`, `docs(plan):`, etc.).
- [ ] **Ordem Cronológica:** O fluxo temporal no histórico do Git respeita: especificação ➔ plano/tasks ➔ implementação ➔ testes.
- [ ] **Auditoria de Diff:** O diff do commit contém apenas o escopo estrito da tarefa referenciada, sem refatorações não documentadas ou exclusões acidentais de código.

---

## 3. Rigor Contábil e Aritmética Numérica

- [ ] **Aritmética de Ponto Flutuante:** Operações monetárias internas não acumulam desvios IEEE 754 (ex.: `0.1 + 0.2 !== 0.3`).
- [ ] **Centavos Inteiros:** Cálculos de agregação, limites, glosas e saldos utilizam centavos inteiros (`Math.round` / truncamento seguro em 2 casas decimais na ingestão).
- [ ] **Invariante Contábil Universal:** Em qualquer cenário de processamento e em todos os nós de resumo, é verificado que:
  $$\text{total\_solicitado} = \text{total\_reembolsavel} + \text{total\_glosado}$$
- [ ] **Tratamento de Estorno:** Valores negativos (estornos) subtraem do total solicitado e restauram o teto diário consumido de forma idêntica à especificação.
- [ ] **Câmbio e Conversão:** Conversão de moedas estrangeiras (USD, EUR) respeita o dia útil bancário anterior em finais de semana (PTAX) e trunca em 2 casas decimais.

---

## 4. Arquitetura e Engenharia de Código

- [ ] **TypeScript Estrito:** `tsc --noEmit` passa sem warnings ou erros; ausência de tipo `any` indiscriminado.
- [ ] **Separação de Responsabilidades (SoC):** O motor de cálculo de despesas (`domain/engine`) é puro e desacoplado da interface de linha de comando (`cli`).
- [ ] **Imutabilidade e Efeitos Colaterais:** As despesas de entrada não são mutadas durante o processamento de regras; o motor retorna novas estruturas auditáveis.
- [ ] **Tratamento de Erros e Saída:**
  - Argumentos inválidos ou arquivos inexistentes geram mensagens claras no `stderr` e encerram com código de saída diferente de 0.
  - O JSON de saída é sempre bem formatado e aderente ao schema acordado.

---

## 5. Qualidade e Eficácia da Suite de Testes

- [ ] **Cobertura de Casos de Borda:**
  - Despesas exatamente no limite (ex.: R$ 100,00 sem nota fiscal vs R$ 100,01).
  - Limite diário consumido em múltiplas despesas no mesmo dia (primeira aprovada total, segunda aprovada parcial, terceira glosada integral).
  - Alçadas de aprovação (ex.: R$ 500,00 aprovado vs R$ 500,01 pendente de aprovação).
- [ ] **Teste de Mutação Mental:** Alterações sutis de operadores lógicos (`<` vs `<=`) em regras de fronteira quebram imediatamente os testes associados.
- [ ] **Ausência de Asserções Tautológicas:** Os testes validam o comportamento esperado pelo usuário/spec, e não apenas espelham os métodos privados da implementação.
- [ ] **Independência dos Testes:** Cada teste é determinístico, sem depender de ordem de execução ou estado compartilhado global mutável.
