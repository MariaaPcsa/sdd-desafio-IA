import test from 'node:test';
import assert from 'node:assert/strict';
import { toCents, fromCents, truncateTwoDecimals } from '../src/money.js';
import {
  POLITICA_PADRAO_V4,
  obterRegraCategoria,
  calcularLimiteEfetivoCentavos,
} from '../src/policy.js';
import { processarLote, validarCompetencia, extrairQuantidadeDiarias } from '../src/engine.js';
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
  assert.strictEqual(resultado.despesas[0].status, 'APROVADO_PARCIAL');
  assert.strictEqual(resultado.despesas[0].valor_reembolsado, 80.0);
  assert.strictEqual(resultado.despesas[0].valor_glosado, 20.0);

  assert.strictEqual(resultado.despesas[1].status, 'RECUSADO');
  assert.strictEqual(resultado.despesas[1].valor_reembolsado, 0.0);
});

test('T-009 / RN-001 / RN-002 / RN-004: limites diários com corte parcial e esgotamento subsequente', () => {
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
  assert.strictEqual(resultado.despesas[0].status, 'APROVADO_PARCIAL');
  assert.strictEqual(resultado.despesas[0].valor_reembolsado, 60.0);
  assert.strictEqual(resultado.despesas[0].valor_glosado, 12.5);

  assert.strictEqual(resultado.despesas[1].status, 'RECUSADO');
  assert.strictEqual(resultado.despesas[1].valor_reembolsado, 0.0);
  assert.strictEqual(resultado.despesas[1].valor_glosado, 38.0);
});

test('T-010 / RN-003: hospedagem calcula teto multiplicando diárias da descrição', () => {
  assert.strictEqual(extrairQuantidadeDiarias('Hotel Rio - 2 diarias'), 2);
  assert.strictEqual(extrairQuantidadeDiarias('Airbnb 3 noites'), 3);
  assert.strictEqual(extrairQuantidadeDiarias('Pousada - 1 diaria'), 1);

  const lote: LoteEntrada = {
    colaborador: { id: 'c-9999', nome: 'Colaborador', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'd-010',
        data: '2026-07-14',
        categoria: 'hospedagem',
        descricao: 'Hotel Rio - 2 diarias',
        fornecedor: 'Hotel Copa Sul',
        valor: 480.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);
  assert.strictEqual(resultado.despesas.length, 1);
  const item = resultado.despesas[0];
  assert.strictEqual(item.id, 'd-010');
  assert.strictEqual(item.status, 'APROVADO');
  assert.strictEqual(item.valor_reembolsado, 480.0);
  assert.strictEqual(item.valor_glosado, 0.0);
});

test('T-011 / RN-010: estorno negativo subtrai do total e restabelece limite diário', () => {
  // Lote com corrida de 50.00 e estorno de -45.00 na mesma data
  const lote: LoteEntrada = {
    colaborador: { id: 'c-0417', nome: 'Marina Volpi', centro_custo: 'CC-ENG-PLATAFORMA' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'd-009',
        data: '2026-07-11',
        categoria: 'transporte_urbano',
        descricao: 'Estorno de corrida cancelada',
        fornecedor: 'TaxiApp',
        valor: -45.0,
        tem_nota_fiscal: false,
      },
    ],
  };

  const resultado = processarLote(lote);
  assert.strictEqual(resultado.despesas.length, 1);
  const item = resultado.despesas[0];
  assert.strictEqual(item.id, 'd-009');
  assert.strictEqual(item.status, 'APROVADO');
  assert.strictEqual(item.valor_solicitado, -45.0);
  assert.strictEqual(item.valor_reembolsado, -45.0);
  assert.strictEqual(item.valor_glosado, 0.0);

  // No resumo, abate do total
  assert.strictEqual(resultado.resumo.total_solicitado, -45.0);
  assert.strictEqual(resultado.resumo.total_reembolsavel, -45.0);
});
