/**
 * Motor de Cálculo de Reembolso de Despesas Corporativas
 * Implementa o pipeline de regras puras definido na spec.md e plan.md v2.0
 */

import {
  LoteEntrada,
  LoteSaida,
  DespesaEntrada,
  DespesaSaida,
  ResumoSaida,
  PoliticaV4,
  TabelaCambio,
  StatusDespesa,
} from './types.js';
import { toCents, fromCents, truncateTwoDecimals } from './money.js';
import { POLITICA_PADRAO_V4, obterRegraCategoria, calcularLimiteEfetivoCentavos } from './policy.js';

/**
 * RN-007: Validação de Competência.
 * Retorna true se a data estiver dentro do intervalo [inicio, fim].
 */
export function validarCompetencia(dataDespesa: string, inicio: string, fim: string): boolean {
  return dataDespesa >= inicio && dataDespesa <= fim;
}

/**
 * Processa um lote completo de despesas aplicando as regras de negócio.
 */
export function processarLote(
  lote: LoteEntrada,
  politica: PoliticaV4 = POLITICA_PADRAO_V4,
  tabelaCambio?: TabelaCambio
): LoteSaida {
  const { colaborador, periodo, despesas } = lote;
  const resultados: DespesaSaida[] = [];

  let totalSolicitadoCentavos = 0;
  let totalReembolsavelCentavos = 0;
  let totalGlosadoCentavos = 0;

  let itensAprovados = 0;
  let itensAprovadosParcialmente = 0;
  let itensPendentesAprovacao = 0;
  let itensRecusados = 0;

  const despesasProcessadasSet = new Set<string>();

  for (const item of despesas) {
    const justificativas: string[] = [];
    const valorSolicitadoCentavos = toCents(item.valor);
    totalSolicitadoCentavos += valorSolicitadoCentavos;

    // RN-007: Competência
    const dentroCompetencia = validarCompetencia(item.data, periodo.inicio, periodo.fim);
    if (!dentroCompetencia) {
      justificativas.push(
        `Despesa fora do período de competência (${periodo.inicio} a ${periodo.fim}). Lançamento não reembolsável.`
      );
    }

    // RN-009: Validação e normalização de categoria
    const categoriaNorm = item.categoria.trim().toLowerCase();
    const regraCategoria = obterRegraCategoria(colaborador.centro_custo, categoriaNorm, politica);
    if (!regraCategoria) {
      justificativas.push(
        `Categoria '${item.categoria}' não é reembolsável para o centro de custo '${colaborador.centro_custo}'.`
      );
    }

    // RN-008: Detecção de duplicatas
    const fingerprintDuplicata = `${item.data}|${categoriaNorm}|${item.fornecedor.trim().toLowerCase()}|${valorSolicitadoCentavos}|${item.descricao.trim().toLowerCase()}`;
    if (despesasProcessadasSet.has(fingerprintDuplicata)) {
      justificativas.push(
        `Despesa duplicada identificada (mesma data, fornecedor, categoria, descrição e valor). Lançamento recusado.`
      );
    } else {
      despesasProcessadasSet.add(fingerprintDuplicata);
    }

    // Se houve violações impeditivas até aqui (competência, categoria ou duplicata)
    if (justificativas.length > 0) {
      itensRecusados++;
      totalGlosadoCentavos += valorSolicitadoCentavos;
      resultados.push({
        id: item.id,
        data: item.data,
        categoria: categoriaNorm,
        valor_solicitado: fromCents(valorSolicitadoCentavos),
        valor_reembolsado: 0.0,
        valor_glosado: fromCents(valorSolicitadoCentavos),
        status: 'RECUSADO',
        justificativas,
      });
      continue;
    }

    // Por enquanto (antes das próximas tasks), despesas válidas são aceitas temporariamente
    itensAprovados++;
    totalReembolsavelCentavos += valorSolicitadoCentavos;
    resultados.push({
      id: item.id,
      data: item.data,
      categoria: item.categoria.trim().toLowerCase(),
      valor_solicitado: fromCents(valorSolicitadoCentavos),
      valor_reembolsado: fromCents(valorSolicitadoCentavos),
      valor_glosado: 0.0,
      status: 'APROVADO',
      justificativas: ['Despesa aprovada.'],
    });
  }

  const resumo: ResumoSaida = {
    total_solicitado: fromCents(totalSolicitadoCentavos),
    total_reembolsavel: fromCents(totalReembolsavelCentavos),
    total_glosado: fromCents(totalGlosadoCentavos),
    itens_processados: despesas.length,
    itens_aprovados: itensAprovados,
    itens_aprovados_parcialmente: itensAprovadosParcialmente,
    itens_pendentes_aprovacao: itensPendentesAprovacao,
    itens_recusados: itensRecusados,
  };

  return {
    colaborador,
    periodo,
    resumo,
    despesas: resultados,
  };
}
