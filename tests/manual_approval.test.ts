/**
 * Testes Unitários e de Integração para RN-015: Fila de Aprovação Manual (> R$ 500)
 * Atende: T-018, RN-015, AMB-E06, DT-003
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { processarLote } from '../src/engine.js';
import { LoteEntrada } from '../src/types.js';

test('T-018 / RN-015: item com reembolso superior a R$ 500 recebe PENDENTE_APROVACAO', () => {
  // e-007: Hospedagem em Londres - 3 noites, R$ 1.200,00 no CC-COMERCIAL (teto 3 x 400 = 1200)
  const lote: LoteEntrada = {
    colaborador: {
      id: 'c-0912',
      nome: 'Rafael Nkemelu',
      centro_custo: 'CC-COMERCIAL',
    },
    periodo: {
      competencia: '2026-07',
      inicio: '2026-07-01',
      fim: '2026-07-31',
    },
    despesas: [
      {
        id: 'e-007',
        data: '2026-07-22',
        categoria: 'hospedagem',
        descricao: 'Hotel Londres - 3 noites',
        fornecedor: 'Premier Inn',
        valor: 1200.0,
        moeda: 'BRL',
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);
  const item = resultado.despesas[0];

  assert.strictEqual(item.status, 'PENDENTE_APROVACAO');
  assert.strictEqual(item.valor_solicitado, 1200.0);
  assert.strictEqual(item.valor_reembolsado, 1200.0);
  assert.strictEqual(item.valor_glosado, 0.0);
  assert.ok(item.justificativas.some((j) => j.includes('fila de aprovação manual')));

  // Resumo
  assert.strictEqual(resultado.resumo.itens_processados, 1);
  assert.strictEqual(resultado.resumo.itens_pendentes_aprovacao, 1);
  assert.strictEqual(resultado.resumo.itens_aprovados, 0);
  assert.strictEqual(resultado.resumo.itens_aprovados_parcialmente, 0);
  assert.strictEqual(resultado.resumo.itens_recusados, 0);
  assert.strictEqual(resultado.resumo.total_solicitado, 1200.0);
  assert.strictEqual(resultado.resumo.total_reembolsavel, 1200.0);
  assert.strictEqual(resultado.resumo.total_glosado, 0.0);
});

test('T-018 / RN-015: fronteira estrita de R$ 500,00 (500.00 é aprovado; 500.01 fica pendente)', () => {
  // Hospedagem 2 diárias no CC-COMERCIAL (teto 800)
  const lote: LoteEntrada = {
    colaborador: {
      id: 'c-0912',
      nome: 'Rafael Nkemelu',
      centro_custo: 'CC-COMERCIAL',
    },
    periodo: {
      competencia: '2026-07',
      inicio: '2026-07-01',
      fim: '2026-07-31',
    },
    despesas: [
      {
        id: 'd-exato-500',
        data: '2026-07-23',
        categoria: 'hospedagem',
        descricao: 'Hotel 2 diarias',
        fornecedor: 'Hotel Exato',
        valor: 500.0,
        tem_nota_fiscal: true,
      },
      {
        id: 'd-acima-500',
        data: '2026-07-25',
        categoria: 'hospedagem',
        descricao: 'Hotel 2 diarias',
        fornecedor: 'Hotel Acima',
        valor: 500.01,
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);

  assert.strictEqual(resultado.despesas[0].status, 'APROVADO');
  assert.strictEqual(resultado.despesas[0].valor_reembolsado, 500.0);

  assert.strictEqual(resultado.despesas[1].status, 'PENDENTE_APROVACAO');
  assert.strictEqual(resultado.despesas[1].valor_reembolsado, 500.01);

  assert.strictEqual(resultado.resumo.itens_aprovados, 1);
  assert.strictEqual(resultado.resumo.itens_pendentes_aprovacao, 1);
});
