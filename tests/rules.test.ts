import test from 'node:test';
import assert from 'node:assert/strict';
import { toCents, fromCents, truncateTwoDecimals } from '../src/money.js';
import {
  POLITICA_PADRAO_V4,
  obterRegraCategoria,
  calcularLimiteEfetivoCentavos,
} from '../src/policy.js';
import { processarLote, validarCompetencia } from '../src/engine.js';
import { LoteEntrada } from '../src/types.js';

test('T-001: ambiente TypeScript e executor de testes configurados com sucesso', () => {
  assert.strictEqual(true, true);
});

test('T-003 / RN-011: valor com três casas decimais é truncado em duas casas', () => {
  assert.strictEqual(truncateTwoDecimals(33.333), 33.33);
  assert.strictEqual(toCents(33.333), 3333);
  assert.strictEqual(fromCents(3333), 33.33);
  assert.strictEqual(truncateTwoDecimals(10.999), 10.99);
  assert.strictEqual(toCents(72.5), 7250);
  assert.strictEqual(toCents(-45.0), -4500);
});

test('T-004 / RN-006 / RN-014: resolve limites por centro de custo e ampliação de viagem', () => {
  const regraAlimComercial = obterRegraCategoria('CC-COMERCIAL', 'alimentacao');
  assert.strictEqual(regraAlimComercial?.limite, 90.0);
  assert.strictEqual(calcularLimiteEfetivoCentavos(regraAlimComercial!, false), 9000);
  assert.strictEqual(calcularLimiteEfetivoCentavos(regraAlimComercial!, true), 13500);

  const regraHospEng = obterRegraCategoria('CC-ENG-PLATAFORMA', 'hospedagem');
  assert.strictEqual(regraHospEng?.limite, 0.0);
  assert.strictEqual(calcularLimiteEfetivoCentavos(regraHospEng!, false), 0);

  const regraHospAdm = obterRegraCategoria('CC-ADM', 'hospedagem');
  assert.strictEqual(regraHospAdm?.limite, 250.0);

  const regraRepDesconhecido = obterRegraCategoria('CC-SUPORTE-N2', 'representacao');
  assert.strictEqual(regraRepDesconhecido, null);
});

test('T-005 / RN-007: despesa fora do período de competência é recusada com R$ 0,00', () => {
  assert.strictEqual(validarCompetencia('2026-07-15', '2026-07-01', '2026-07-31'), true);
  assert.strictEqual(validarCompetencia('2026-04-15', '2026-07-01', '2026-07-31'), false);

  const lote: LoteEntrada = {
    colaborador: { id: 'c-0417', nome: 'Marina Volpi', centro_custo: 'CC-ENG-PLATAFORMA' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'd-008',
        data: '2026-04-15',
        categoria: 'alimentacao',
        descricao: 'Almoco de abril lancado com atraso',
        fornecedor: 'Restaurante Tavola',
        valor: 41.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);
  assert.strictEqual(resultado.despesas[0].status, 'RECUSADO');
  assert.strictEqual(resultado.despesas[0].valor_reembolsado, 0.0);
});

test('T-006 / RN-009: categoria inválida é recusada; categoria em maiúsculas é normalizada', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-0417', nome: 'Marina Volpi', centro_custo: 'CC-ENG-PLATAFORMA' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'd-005',
        data: '2026-07-07',
        categoria: 'coworking',
        descricao: 'Diaria em espaco compartilhado',
        fornecedor: 'HubOffice',
        valor: 89.0,
        tem_nota_fiscal: true,
      },
      {
        id: 'd-014',
        data: '2026-07-31',
        categoria: 'ALIMENTACAO',
        descricao: 'Jantar de encerramento',
        fornecedor: 'Restaurante Tavola',
        valor: 60.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);
  assert.strictEqual(resultado.despesas[0].status, 'RECUSADO');
  assert.strictEqual(resultado.despesas[0].categoria, 'coworking');
  assert.strictEqual(resultado.despesas[1].status, 'APROVADO');
  assert.strictEqual(resultado.despesas[1].categoria, 'alimentacao');
});

test('T-007 / RN-008: despesa duplicada é recusada integralmente e não consome limite', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-0417', nome: 'Marina Volpi', centro_custo: 'CC-ENG-PLATAFORMA' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'd-006',
        data: '2026-07-09',
        categoria: 'alimentacao',
        descricao: 'Almoco',
        fornecedor: 'Bistro Central',
        valor: 54.9,
        tem_nota_fiscal: true,
      },
      {
        id: 'd-007',
        data: '2026-07-09',
        categoria: 'alimentacao',
        descricao: 'Almoco',
        fornecedor: 'Bistro Central',
        valor: 54.9,
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);
  assert.strictEqual(resultado.despesas[0].status, 'APROVADO');
  assert.strictEqual(resultado.despesas[1].status, 'RECUSADO');
});

test('T-008 / RN-005: R$ 100,00 sem nota é aprovado; R$ 100,01 sem nota é recusado integralmente', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-0417', nome: 'Marina Volpi', centro_custo: 'CC-ENG-PLATAFORMA' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'd-003',
        data: '2026-07-06',
        categoria: 'transporte_urbano',
        descricao: 'Corrida aeroporto',
        fornecedor: 'TaxiApp',
        valor: 100.0,
        tem_nota_fiscal: false,
      },
      {
        id: 'd-004',
        data: '2026-07-06',
        categoria: 'transporte_urbano',
        descricao: 'Corrida hotel',
        fornecedor: 'TaxiApp',
        valor: 100.01,
        tem_nota_fiscal: false,
      },
    ],
  };

  const resultado = processarLote(lote);
  // d-003: elegível fiscalmente (não exigiu nota), mas respeitou o teto diário de transporte de R$ 80 -> APROVADO_PARCIAL
  assert.strictEqual(resultado.despesas[0].status, 'APROVADO_PARCIAL');
  assert.strictEqual(resultado.despesas[0].valor_reembolsado, 80.0);
  assert.strictEqual(resultado.despesas[0].valor_glosado, 20.0);

  // d-004: 100.01 sem nota é RECUSADO integralmente por falta de nota fiscal
  assert.strictEqual(resultado.despesas[1].status, 'RECUSADO');
  assert.strictEqual(resultado.despesas[1].valor_reembolsado, 0.0);
});

test('T-009 / RN-001 / RN-002 / RN-004: limites diários com corte parcial e esgotamento subsequente', () => {
  // Cenário da spec: d-001 (R$ 72,50) e d-002 (R$ 38,00) no mesmo dia (2026-07-03)
  // Limite padrão de alimentação: R$ 60,00 (ou R$ 75 para CC-ENG-PLATAFORMA)
  // Vamos testar com a política padrão (limite R$ 60,00) para validar o caso da spec:
  const lotePadrao: LoteEntrada = {
    colaborador: { id: 'c-9999', nome: 'Colaborador Padrão', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'd-001',
        data: '2026-07-03',
        categoria: 'alimentacao',
        descricao: 'Almoco com cliente',
        fornecedor: 'Restaurante Tavola',
        valor: 72.5,
        tem_nota_fiscal: true,
      },
      {
        id: 'd-002',
        data: '2026-07-03',
        categoria: 'alimentacao',
        descricao: 'Jantar apos reuniao',
        fornecedor: 'Cantina do Porto',
        valor: 38.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lotePadrao);
  assert.strictEqual(resultado.despesas.length, 2);

  // d-001: R$ 72,50 consome teto de R$ 60,00, glosa R$ 12,50 -> APROVADO_PARCIAL
  const item1 = resultado.despesas[0];
  assert.strictEqual(item1.id, 'd-001');
  assert.strictEqual(item1.status, 'APROVADO_PARCIAL');
  assert.strictEqual(item1.valor_reembolsado, 60.0);
  assert.strictEqual(item1.valor_glosado, 12.5);

  // d-002: R$ 38,00 chega com teto do dia já zerado -> RECUSADO (R$ 0,00 reembolsado)
  const item2 = resultado.despesas[1];
  assert.strictEqual(item2.id, 'd-002');
  assert.strictEqual(item2.status, 'RECUSADO');
  assert.strictEqual(item2.valor_reembolsado, 0.0);
  assert.strictEqual(item2.valor_glosado, 38.0);
  assert.match(item2.justificativas[0], /já esgotado/i);

  // Totais do lote
  assert.strictEqual(resultado.resumo.total_solicitado, 110.5);
  assert.strictEqual(resultado.resumo.total_reembolsavel, 60.0);
  assert.strictEqual(resultado.resumo.total_glosado, 50.5);
  assert.strictEqual(resultado.resumo.itens_aprovados_parcialmente, 1);
  assert.strictEqual(resultado.resumo.itens_recusados, 1);
});
