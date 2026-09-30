/**
 * Suíte de Testes para Casos de Borda
 * Atende: T-013 e Seção 7 da spec.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { processarLote } from '../src/engine.js';
import { LoteEntrada } from '../src/types.js';

test('T-013 / Borda 1: múltiplas despesas de alimentação no mesmo dia consomem teto e glosam excedente', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-001',
        data: '2026-07-05',
        categoria: 'alimentacao',
        descricao: 'Almoco',
        fornecedor: 'Restaurante A',
        valor: 40.0,
        tem_nota_fiscal: true,
      },
      {
        id: 'b-002',
        data: '2026-07-05',
        categoria: 'alimentacao',
        descricao: 'Jantar',
        fornecedor: 'Restaurante B',
        valor: 40.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'APROVADO');
  assert.strictEqual(res.despesas[0].valor_reembolsado, 40.0);

  // Segunda despesa consome os R$ 20 restantes do teto de R$ 60 e glosa R$ 20
  assert.strictEqual(res.despesas[1].status, 'APROVADO_PARCIAL');
  assert.strictEqual(res.despesas[1].valor_reembolsado, 20.0);
  assert.strictEqual(res.despesas[1].valor_glosado, 20.0);
});

test('T-013 / Borda 2 e 3: fronteira estrita de nota fiscal (R$ 100,00 vs R$ 100,01)', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-COMERCIAL' }, // Transporte de CC-COMERCIAL é 150/dia
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-003',
        data: '2026-07-06',
        categoria: 'transporte_urbano',
        descricao: 'Corrida A',
        fornecedor: 'TaxiApp',
        valor: 100.0,
        tem_nota_fiscal: false, // 100.00 exatos sem nota -> elegível e aprovado
      },
      {
        id: 'b-004',
        data: '2026-07-07',
        categoria: 'transporte_urbano',
        descricao: 'Corrida B',
        fornecedor: 'TaxiApp',
        valor: 100.01,
        tem_nota_fiscal: false, // 100.01 sem nota -> estritamente maior que 100 -> recusado com R$ 0,00
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'APROVADO');
  assert.strictEqual(res.despesas[0].valor_reembolsado, 100.0);

  assert.strictEqual(res.despesas[1].status, 'RECUSADO');
  assert.strictEqual(res.despesas[1].valor_reembolsado, 0.0);
});

test('T-013 / Borda 4: categoria fora da política institucional é recusada integralmente', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-005',
        data: '2026-07-07',
        categoria: 'coworking',
        descricao: 'Espaço compartilhado',
        fornecedor: 'HubOffice',
        valor: 89.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'RECUSADO');
  assert.strictEqual(res.despesas[0].valor_reembolsado, 0.0);
  assert.strictEqual(res.despesas[0].valor_glosado, 89.0);
});

test('T-013 / Borda 5: despesas idênticas na mesma data caracterizam duplicata na segunda ocorrência', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-006',
        data: '2026-07-09',
        categoria: 'alimentacao',
        descricao: 'Almoco',
        fornecedor: 'Bistro Central',
        valor: 54.9,
        tem_nota_fiscal: true,
      },
      {
        id: 'b-007',
        data: '2026-07-09',
        categoria: 'alimentacao',
        descricao: 'Almoco',
        fornecedor: 'Bistro Central',
        valor: 54.9,
        tem_nota_fiscal: true,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'APROVADO');
  assert.strictEqual(res.despesas[1].status, 'RECUSADO');
  assert.strictEqual(res.despesas[1].valor_reembolsado, 0.0);
});

test('T-013 / Borda 6: despesa fora do período de competência é recusada integralmente', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-008',
        data: '2026-04-15',
        categoria: 'alimentacao',
        descricao: 'Almoco antigo',
        fornecedor: 'Tavola',
        valor: 41.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'RECUSADO');
  assert.strictEqual(res.despesas[0].valor_reembolsado, 0.0);
});

test('T-013 / Borda 7: valor com 3 casas decimais é truncado em 2 casas decimais', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-009',
        data: '2026-07-15',
        categoria: 'alimentacao',
        descricao: 'Cafe da manha hotel',
        fornecedor: 'Hotel Copa Sul',
        valor: 33.333,
        tem_nota_fiscal: true,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].valor_solicitado, 33.33);
  assert.strictEqual(res.despesas[0].valor_reembolsado, 33.33);
});

test('T-013 / Borda 8: estorno com valor negativo reduz o total e restabelece limite diário', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-010',
        data: '2026-07-11',
        categoria: 'transporte_urbano',
        descricao: 'Estorno corrida',
        fornecedor: 'TaxiApp',
        valor: -45.0,
        tem_nota_fiscal: false,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'APROVADO');
  assert.strictEqual(res.despesas[0].valor_reembolsado, -45.0);
  assert.strictEqual(res.resumo.total_solicitado, -45.0);
  assert.strictEqual(res.resumo.total_reembolsavel, -45.0);
});

test('T-013 / Borda 9: hospedagem com múltiplas diárias na descrição multiplica o teto', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-011',
        data: '2026-07-14',
        categoria: 'hospedagem',
        descricao: 'Hotel Rio - 2 diarias',
        fornecedor: 'Hotel Copa Sul',
        valor: 480.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'APROVADO');
  assert.strictEqual(res.despesas[0].valor_reembolsado, 480.0);
  assert.strictEqual(res.despesas[0].valor_glosado, 0.0);
});

test('T-013 / Borda 10: despesa em fim de semana / plantão dentro da competência é avaliada normalmente', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO' },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-012',
        data: '2026-07-18', // Sábado
        categoria: 'alimentacao',
        descricao: 'Almoco de sabado - plantao',
        fornecedor: 'Padaria Uniao',
        valor: 47.2,
        tem_nota_fiscal: true,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'APROVADO');
  assert.strictEqual(res.despesas[0].valor_reembolsado, 47.2);
});

test('T-013 / Borda 11: colaborador em viagem com alimentação tem teto ampliado em 50%', () => {
  const lote: LoteEntrada = {
    colaborador: { id: 'c-001', nome: 'Funcionario', centro_custo: 'CC-OUTRO', em_viagem: true },
    periodo: { competencia: '2026-07', inicio: '2026-07-01', fim: '2026-07-31' },
    despesas: [
      {
        id: 'b-013',
        data: '2026-07-12',
        categoria: 'alimentacao',
        descricao: 'Jantar em viagem',
        fornecedor: 'Restaurante Aeroporto',
        valor: 85.0, // Limite padrão é 60. Em viagem (+50%) é 90.00 -> Aprovado integralmente!
        tem_nota_fiscal: true,
      },
    ],
  };

  const res = processarLote(lote);
  assert.strictEqual(res.despesas[0].status, 'APROVADO');
  assert.strictEqual(res.despesas[0].valor_reembolsado, 85.0);
  assert.strictEqual(res.despesas[0].valor_glosado, 0.0);
});
