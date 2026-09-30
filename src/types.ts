/**
 * Contratos de dados e interfaces TypeScript para o Motor de Cálculo de Reembolso
 * Definidos na spec.md e plan.md v2.0
 */

// ==========================================
// Estruturas de Entrada (despesas.json)
// ==========================================

export interface ColaboradorEntrada {
  id: string;
  nome: string;
  centro_custo: string;
  em_viagem?: boolean;
}

export interface PeriodoEntrada {
  competencia: string; // Formato "YYYY-MM"
  inicio: string;      // Formato "YYYY-MM-DD"
  fim: string;         // Formato "YYYY-MM-DD"
}

export interface DespesaEntrada {
  id: string;
  data: string;        // Formato "YYYY-MM-DD"
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

// ==========================================
// Estruturas de Saída (resultado.json)
// ==========================================

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

// ==========================================
// Estruturas da Política v4 e Câmbio
// ==========================================

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
  centros_custo?: Record<string, Record<string, RegraCategoria>>;
  nota_fiscal_obrigatoria_acima_de: number;
  acrescimo_em_viagem_percentual: number;
}

export interface TabelaCambio {
  moeda_base: string;
  fonte?: string;
  observacao?: string;
  taxas: Record<string, Record<string, number>>; // data -> moeda -> taxa
}
