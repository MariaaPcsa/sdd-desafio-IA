# Parecer Técnico de Revisão — [Nome do Componente / Task]

**Data:** [AAAA-MM-DD]  
**Revisor:** Revisor Técnico Sênior (Skill `revisor`)  
**Escopo Analisado:** [Ex.: Tarefas T-015 a T-019 / Branch / Commit]  
**Veredito Geral:** [APROVADO | APROVADO COM RESSALVAS | REQUER AJUSTES | REPROVADO]  

---

## 1. Sumário Executivo

[Resumo conciso de 1 a 2 parágrafos com a visão geral do estado do projeto, nível de conformidade com a especificação, qualidade do código e principais pontos de atenção.]

---

## 2. Indicadores de Sanidade da Linha de Base

| Verificação | Comando / Critério | Status | Detalhes |
|---|---|:---:|---|
| **Tipagem Estática** | `npm run typecheck` | [OK / FALHA] | 0 erros encontrados |
| **Suite de Testes** | `npm test` | [OK / FALHA] | 37/37 testes passando |
| **Integridade Contábil** | `total = reimb + glosado` | [OK / FALHA] | Balanço estrito em centavos |
| **Alinhamento Spec** | Regras na `spec.md` | [OK / FALHA] | Nenhuma regra órfã no código |
| **Rastreabilidade Git** | Task nos commits | [OK / FALHA] | Commits seguem convenção `feat(T-xxx)` |

---

## 3. Matriz de Achados e Severidade

| ID | Severidade | Categoria | Descrição Sucinta | Ação Recomendada |
|---|:---:|---|---|---|
| ACH-01 | [CRÍTICO / ALTO / MÉDIO / BAIXO] | [SDD / Código / Testes / Contábil] | [Descrição em 1 linha] | [Ação imediata necessária] |

---

## 4. Detalhamento dos Problemas Identificados

### ACH-01: [Título Descritivo do Problema]
- **Severidade:** [CRÍTICO / ALTO / MÉDIO / BAIXO]
- **Arquivo / Linha:** [`src/...`](file:///c:/Users/maria/Desktop/desafio-/sdd-desafio-IA/sdd-desafio-IA/src/...)
- **Causa Raiz:** [Explicação técnica detalhada de por que o problema ocorre]
- **Impacto / Risco:** [Quebra de spec, risco de regressão, perda financeira, erro em tempo de execução]
- **Evidência / Código Atual:**
  ```typescript
  // Código problemático encontrado
  ```
- **Correção Recomendada:**
  ```typescript
  // Solução proposta ou diff cirúrgico
  ```

---

## 5. Avaliação Frente à Rubrica SDD

| Critério | Pontuação Estimada | Justificativa e Gaps Identificados |
|---|:---:|---|
| 1. Qualidade da Spec (25 pts) | xx/25 | [Comentários sobre resolução de ambiguidades e escopo] |
| 2. Rastreabilidade (25 pts) | xx/25 | [Comentários sobre a cadeia spec -> tasks -> git -> tests] |
| 3. Resposta à Mudança (20 pts) | xx/20 | [Comentários sobre absorção via DECISIONS.md] |
| 4. Relatório e Discernimento (20 pts) | xx/20 | [Comentários sobre evidências e erro concreto de IA] |
| 5. Produto Funciona (10 pts) | xx/10 | [Comentários sobre execução via README e CLI] |
| **Total Estimado** | **xx/100** | |

---

## 6. Próximos Passos e Plano de Ação

1. [ ] **Ação 1:** [Descrever ação prioritária antes do commit/merge]
2. [ ] **Ação 2:** [Descrever ajuste de teste ou documentação]
3. [ ] **Ação 3:** [Verificação final de regressão]
