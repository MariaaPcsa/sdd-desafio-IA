/**
 * Módulo de configuração declarativa da política de reembolso
 * Atende: plan.md Seção 4, RN-006, RN-014, AMB-E03
 */

import { PoliticaV4, RegraCategoria } from './types.js';
import { toCents } from './money.js';

export const POLITICA_PADRAO_V4: PoliticaV4 = {
  versao: 'v4',
  vigencia: '2026-07-01',
  moeda_base: 'BRL',
  padrao: {
    alimentacao: { limite: 60.0, periodicidade: 'dia' },
    transporte_urbano: { limite: 80.0, periodicidade: 'dia' },
    hospedagem: { limite: 250.0, periodicidade: 'diaria' },
  },
  centros_custo: {
    'CC-ENG-PLATAFORMA': {
      alimentacao: { limite: 75.0, periodicidade: 'dia' },
      transporte_urbano: { limite: 80.0, periodicidade: 'dia' },
      hospedagem: { limite: 0.0, periodicidade: 'diaria', observacao: 'nao reembolsavel' },
    },
    'CC-COMERCIAL': {
      alimentacao: { limite: 90.0, periodicidade: 'dia' },
      transporte_urbano: { limite: 150.0, periodicidade: 'dia' },
      hospedagem: { limite: 400.0, periodicidade: 'diaria' },
      representacao: { limite: 300.0, periodicidade: 'dia' },
    },
    'CC-ADM': {
      alimentacao: { limite: 45.0, periodicidade: 'dia' },
      transporte_urbano: { limite: 60.0, periodicidade: 'dia' },
    },
  },
  nota_fiscal_obrigatoria_acima_de: 100.0,
  acrescimo_em_viagem_percentual: 50,
};

/**
 * Resolve a regra aplicável a uma categoria e centro de custo,
 * aplicando a regra de Fallback Aditivo da spec v2.0 (AMB-E03).
 */
export function obterRegraCategoria(
  centroCusto: string,
  categoria: string,
  politica: PoliticaV4 = POLITICA_PADRAO_V4
): RegraCategoria | null {
  const catNorm = categoria.trim().toLowerCase();

  const centro = politica.centros_custo?.[centroCusto];
  if (centro) {
    if (catNorm in centro) {
      return centro[catNorm];
    }
    // Fallback aditivo: herda do bloco padrão se omitido no centro cadastrado
    if (catNorm in politica.padrao) {
      return politica.padrao[catNorm];
    }
    return null;
  }

  // Centro de custo não cadastrado: aplica integralmente a política padrão
  if (catNorm in politica.padrao) {
    return politica.padrao[catNorm];
  }

  return null;
}

/**
 * Calcula o limite efetivo em centavos inteiros para uma categoria,
 * considerando multiplicador de diárias e acréscimo de colaborador em viagem (+50%).
 */
export function calcularLimiteEfetivoCentavos(
  regra: RegraCategoria,
  emViagem: boolean,
  politica: PoliticaV4 = POLITICA_PADRAO_V4,
  quantidadeMultiplicador = 1
): number {
  if (regra.limite === 0) {
    return 0; // Categoria explicitamente não reembolsável
  }

  const baseCentavos = toCents(regra.limite) * quantidadeMultiplicador;
  if (!emViagem) {
    return baseCentavos;
  }

  const percentual = politica.acrescimo_em_viagem_percentual ?? 50;
  return Math.round(baseCentavos * (1 + percentual / 100));
}
