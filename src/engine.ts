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
 * RN-003, DT-003: Extrai o multiplicador de diárias da descrição de hospedagem.
 * Padrões reconhecidos: "2 diarias", "3 diárias", "4 noites", etc.
 * Caso nenhum padrão numérico seja encontrado, assume 1 diária.
 */
export function extrairQuantidadeDiarias(descricao: string): number {
  const match = descricao.match(/(\d+)\s*(?:di[aá]rias?|noites?)/i);
  if (match) {
    const qtd = parseInt(match[1], 10);
    if (!isNaN(qtd) && qtd > 0) {
      return qtd;
    }
  }
  return 1;
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
  const consumoDiarioMap = new Map<string, number>();

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

    // RN-005: Conformidade fiscal (nota fiscal obrigatória acima de R$ 100,00)
    const limiteNotaCentavos = toCents(politica.nota_fiscal_obrigatoria_acima_de ?? 100.0);
    if (valorSolicitadoCentavos > limiteNotaCentavos && !item.tem_nota_fiscal) {
      justificativas.push(
        `Nota fiscal obrigatória para despesas com valor superior a ${fromCents(limiteNotaCentavos).toFixed(2)}. Lançamento recusado por inconformidade fiscal.`
      );
    }

    // Se houve violações impeditivas até aqui (competência, categoria, duplicata ou nota fiscal)
    if (justificativas.length > 0 || !regraCategoria) {
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

    const emViagem = colaborador.em_viagem === true;

    // RN-001, RN-002, RN-004: Limites de periodicidade diária (alimentação, transporte, representação)
    if (regraCategoria.periodicidade === 'dia') {
      const keyDiaria = `${item.data}|${categoriaNorm}`;
      const tetoDiarioCentavos = calcularLimiteEfetivoCentavos(regraCategoria, emViagem, politica);
      const consumidoAteAgora = consumoDiarioMap.get(keyDiaria) ?? 0;
      const saldoDisponivelCentavos = Math.max(0, tetoDiarioCentavos - consumidoAteAgora);

      if (saldoDisponivelCentavos === 0) {
        itensRecusados++;
        totalGlosadoCentavos += valorSolicitadoCentavos;
        justificativas.push(
          `Limite diário da categoria '${categoriaNorm}' já esgotado para a data ${item.data} (teto: R$ ${fromCents(tetoDiarioCentavos).toFixed(2)}).`
        );
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

      if (valorSolicitadoCentavos <= saldoDisponivelCentavos) {
        itensAprovados++;
        totalReembolsavelCentavos += valorSolicitadoCentavos;
        consumoDiarioMap.set(keyDiaria, consumidoAteAgora + valorSolicitadoCentavos);
        justificativas.push('Despesa aprovada dentro do limite diário.');
        resultados.push({
          id: item.id,
          data: item.data,
          categoria: categoriaNorm,
          valor_solicitado: fromCents(valorSolicitadoCentavos),
          valor_reembolsado: fromCents(valorSolicitadoCentavos),
          valor_glosado: 0.0,
          status: 'APROVADO',
          justificativas,
        });
        continue;
      } else {
        // Ultrapassa o teto diário: reembolso parcial
        itensAprovadosParcialmente++;
        const valorReembolsadoCentavos = saldoDisponivelCentavos;
        const valorGlosadoCentavos = valorSolicitadoCentavos - saldoDisponivelCentavos;

        totalReembolsavelCentavos += valorReembolsadoCentavos;
        totalGlosadoCentavos += valorGlosadoCentavos;
        consumoDiarioMap.set(keyDiaria, tetoDiarioCentavos);

        justificativas.push(
          `Limite diário da categoria '${categoriaNorm}' atingido (teto: R$ ${fromCents(tetoDiarioCentavos).toFixed(2)}). Valor excedente de R$ ${fromCents(valorGlosadoCentavos).toFixed(2)} glosado.`
        );
        resultados.push({
          id: item.id,
          data: item.data,
          categoria: categoriaNorm,
          valor_solicitado: fromCents(valorSolicitadoCentavos),
          valor_reembolsado: fromCents(valorReembolsadoCentavos),
          valor_glosado: fromCents(valorGlosadoCentavos),
          status: 'APROVADO_PARCIAL',
          justificativas,
        });
        continue;
      }
    }

    // RN-003: Hospedagem (periodicidade diária com multiplicador por diárias)
    if (regraCategoria.periodicidade === 'diaria') {
      if (regraCategoria.limite === 0) {
        itensRecusados++;
        totalGlosadoCentavos += valorSolicitadoCentavos;
        justificativas.push(
          `Hospedagem não é reembolsável para o centro de custo '${colaborador.centro_custo}'. Lançamento recusado.`
        );
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

      const diarias = extrairQuantidadeDiarias(item.descricao);
      const tetoHospedagemCentavos = calcularLimiteEfetivoCentavos(
        regraCategoria,
        emViagem,
        politica,
        diarias
      );

      if (valorSolicitadoCentavos <= tetoHospedagemCentavos) {
        itensAprovados++;
        totalReembolsavelCentavos += valorSolicitadoCentavos;
        justificativas.push(
          `Hospedagem aprovada dentro do limite de ${diarias} diária(s) (teto: R$ ${fromCents(tetoHospedagemCentavos).toFixed(2)}).`
        );
        resultados.push({
          id: item.id,
          data: item.data,
          categoria: categoriaNorm,
          valor_solicitado: fromCents(valorSolicitadoCentavos),
          valor_reembolsado: fromCents(valorSolicitadoCentavos),
          valor_glosado: 0.0,
          status: 'APROVADO',
          justificativas,
        });
        continue;
      } else {
        itensAprovadosParcialmente++;
        const valorReembolsadoCentavos = tetoHospedagemCentavos;
        const valorGlosadoCentavos = valorSolicitadoCentavos - tetoHospedagemCentavos;

        totalReembolsavelCentavos += valorReembolsadoCentavos;
        totalGlosadoCentavos += valorGlosadoCentavos;

        justificativas.push(
          `Hospedagem atingiu o limite de ${diarias} diária(s) (teto: R$ ${fromCents(tetoHospedagemCentavos).toFixed(2)}). Excedente de R$ ${fromCents(valorGlosadoCentavos).toFixed(2)} glosado.`
        );
        resultados.push({
          id: item.id,
          data: item.data,
          categoria: categoriaNorm,
          valor_solicitado: fromCents(valorSolicitadoCentavos),
          valor_reembolsado: fromCents(valorReembolsadoCentavos),
          valor_glosado: fromCents(valorGlosadoCentavos),
          status: 'APROVADO_PARCIAL',
          justificativas,
        });
        continue;
      }
    }

    // Caso surja outra periodicidade no futuro
    itensAprovados++;
    totalReembolsavelCentavos += valorSolicitadoCentavos;
    resultados.push({
      id: item.id,
      data: item.data,
      categoria: categoriaNorm,
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
