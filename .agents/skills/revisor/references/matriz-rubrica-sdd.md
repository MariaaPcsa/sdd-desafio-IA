# Matriz de Auditoria da Rubrica SDD

O Revisor Técnico Sênior deve avaliar o repositório contra as 5 dimensões oficiais da Rubrica de Avaliação (100 pontos).

---

## 1. Qualidade da Spec (25 pontos)
- **Faixa Alvo (23–25):**
  - Mínimo de 8 ambiguidades reais da política mapeadas e resolvidas formalmente com decisão e justificativa de negócio.
  - Zero vazamento de solução técnica (sem bibliotecas, classes, paths, estruturas de pastas ou tipos de linguagem).
  - Critérios de aceite verificáveis e claros sem necessidade de inspecionar código-fonte.
  - Escopo negativo explícito ("o que este sistema não faz").
  - Auto-suficiência: qualquer desenvolvedor externo implementaria a mesma solução lendo apenas a `spec.md`.
- **Alerta Vermelho (Zera o critério):** Nenhuma ambiguidade identificada ou registrada.

---

## 2. Rastreabilidade Ponta a Ponta (25 pontos)
- **Faixa Alvo (23–25):**
  - Cadeia fechada: `spec.md` ➔ `tasks.md` ➔ `git log` ➔ `tests/` ➔ `src/`.
  - Toda task referencia requisitos específicos da spec.
  - Todo commit de código ou teste referencia o ID de uma task.
  - Todo requisito testável possui teste automatizado correspondente.
  - Granularidade consistente de commits (sem commits monolíticos ou commits vazios).
  - Tarefas marcadas como concluídas progressivamente.

---

## 3. Resposta à Mudança de Requisito (20 pontos)
- **Faixa Alvo (18–20):**
  - A mudança (envelope lacrado / novos requisitos) entrou estritamente pela especificação:
    1. `spec.md` atualizada com novas regras e ambiguidades resolvidas.
    2. Registro formal em `DECISIONS.md` documentando o que mudou, por quê e o que quebrou.
    3. Novas tasks criadas em `tasks.md`.
    4. Implementação e testes desenvolvidos subsequentemente.
  - Testes pré-existentes continuam passando ou tiveram suas alterações estritamente justificadas.
  - Diff arquitetural limpo e cirúrgico (a arquitetura absorveu o impacto).

---

## 4. Relatório e Discernimento (20 pontos)
- **Faixa Alvo (18–20):**
  - Os blocos essenciais respondidos com evidências factuais (hashes de commits, trechos de sessões, antes/depois).
  - **Seção de Discernimento com Caso Concreto:** Erro real cometido pelo agente de IA documentado em detalhes:
    - O que o agente propôs.
    - Por que estava incorreto.
    - Como o revisor/humano detectou o erro.
    - Ação corretiva realizada e evidência no histórico.
  - Autocrítica fundamentada e verificação de 100% de diffs.
- **Alerta Vermelho (Penalidade −8 a zeramento):** Ausência de caso concreto de erro da IA ou ausência de sessões exportadas em `docs/sessions/`.

---

## 5. Produto Funciona (10 pontos)
- **Faixa Alvo (9–10):**
  - Execução fluida a partir do README sem passos manuais ocultos.
  - Processa com perfeição o lote de exemplo (`despesas-exemplo.json`) e cenários adicionais.
  - Saída aderente ao schema de resultado acordado na spec.
  - 100% dos testes automatizados passam sem intercorrências.

---

## Penalidades Transversais a Evitar Rigorosamente

| Infração | Impacto na Nota |
|---|---|
| Regra de negócio que só existe no chat/código, ausente da spec | −5 por ocorrência (teto de −15) |
| `DECISIONS.md` ausente tendo havido alteração de spec | −5 |
| `CLAUDE.md` ausente ou desatualizado | −3 |
| README não permite rodar o projeto do zero | −3 |
| Repositório sem histórico contínuo (commit único inicial) | −15 e critério 2 limitado a 8 |
