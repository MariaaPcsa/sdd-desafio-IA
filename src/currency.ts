/**
 * Módulo de conversão cambial por data com PTAX do dia útil anterior
 * Atende: T-016, RN-013, AMB-E01, AMB-E02, DT-001
 */

import { TabelaCambio } from './types.js';
import { truncateTwoDecimals, toCents } from './money.js';

export const TABELA_CAMBIO_PADRAO: TabelaCambio = {
  moeda_base: 'BRL',
  fonte: 'Banco Central - PTAX de fechamento',
  observacao: 'Cotacoes publicadas apenas em dias uteis bancarios.',
  taxas: {
    '2026-07-13': { USD: 5.42, EUR: 5.91 },
    '2026-07-14': { USD: 5.44, EUR: 5.93 },
    '2026-07-15': { USD: 5.39, EUR: 5.88 },
    '2026-07-16': { USD: 5.41, EUR: 5.90 },
    '2026-07-17': { USD: 5.47, EUR: 5.96 },
    '2026-07-20': { USD: 5.50, EUR: 6.01 },
    '2026-07-21': { USD: 5.48, EUR: 5.99 },
    '2026-07-22': { USD: 5.45, EUR: 5.95 },
    '2026-07-23': { USD: 5.44, EUR: 5.94 },
    '2026-07-24': { USD: 5.46, EUR: 5.97 },
    '2026-07-27': { USD: 5.52, EUR: 6.03 },
    '2026-07-28': { USD: 5.51, EUR: 6.02 },
  },
};

export interface CotacaoEncontrada {
  taxa: number;
  dataCotacao: string;
  ehDiaAnterior: boolean;
}

export interface ResultadoConversao {
  moedaOrigem: string;
  valorOriginal: number;
  taxa: number;
  dataCotacao: string;
  ehDiaAnterior: boolean;
  valorBrl: number;
  valorBrlCentavos: number;
}

/**
 * RN-013, AMB-E01: Obtém a taxa de câmbio para a data informada.
 * Se a data cair em final de semana ou feriado, retrocede dia a dia
 * até encontrar o último dia útil disponível na tabela (até 7 dias).
 * Retorna null caso a moeda não possua cotação cadastrada (ex: GBP).
 */
export function obterTaxaCambio(
  data: string,
  moeda: string = 'BRL',
  tabela: TabelaCambio = TABELA_CAMBIO_PADRAO
): CotacaoEncontrada | null {
  const moedaNorm = (moeda || 'BRL').trim().toUpperCase();

  if (moedaNorm === 'BRL') {
    return { taxa: 1.0, dataCotacao: data, ehDiaAnterior: false };
  }

  if (!tabela || !tabela.taxas) {
    return null;
  }

  // 1. Busca exata na data
  if (tabela.taxas[data] && typeof tabela.taxas[data][moedaNorm] === 'number') {
    return {
      taxa: tabela.taxas[data][moedaNorm],
      dataCotacao: data,
      ehDiaAnterior: false,
    };
  }

  // 2. Retrocede dia a dia buscando o último dia útil com cotação (até 7 dias)
  const partes = data.split('-').map(Number);
  if (partes.length !== 3 || isNaN(partes[0]) || isNaN(partes[1]) || isNaN(partes[2])) {
    return null;
  }

  let cur = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));

  for (let i = 1; i <= 7; i++) {
    cur.setUTCDate(cur.getUTCDate() - 1);
    const yyyy = cur.getUTCFullYear();
    const mm = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(cur.getUTCDate()).padStart(2, '0');
    const dataIso = `${yyyy}-${mm}-${dd}`;

    if (tabela.taxas[dataIso] && typeof tabela.taxas[dataIso][moedaNorm] === 'number') {
      return {
        taxa: tabela.taxas[dataIso][moedaNorm],
        dataCotacao: dataIso,
        ehDiaAnterior: true,
      };
    }
  }

  // Moeda sem cotação encontrada
  return null;
}

/**
 * RN-013, RN-011: Converte um valor em moeda estrangeira para BRL,
 * aplicando truncamento estrito de duas casas decimais.
 */
export function converterParaBrl(
  valorOriginal: number,
  moeda: string = 'BRL',
  data: string,
  tabela: TabelaCambio = TABELA_CAMBIO_PADRAO
): ResultadoConversao | null {
  const cotacao = obterTaxaCambio(data, moeda, tabela);
  if (!cotacao) {
    return null;
  }

  if (cotacao.taxa === 1.0) {
    const truncado = truncateTwoDecimals(valorOriginal);
    return {
      moedaOrigem: 'BRL',
      valorOriginal,
      taxa: 1.0,
      dataCotacao: data,
      ehDiaAnterior: false,
      valorBrl: truncado,
      valorBrlCentavos: toCents(truncado),
    };
  }

  // Truncamento em 2 casas decimais conforme especificação
  const valorBrl = truncateTwoDecimals(valorOriginal * cotacao.taxa);
  return {
    moedaOrigem: moeda.trim().toUpperCase(),
    valorOriginal,
    taxa: cotacao.taxa,
    dataCotacao: cotacao.dataCotacao,
    ehDiaAnterior: cotacao.ehDiaAnterior,
    valorBrl,
    valorBrlCentavos: toCents(valorBrl),
  };
}
