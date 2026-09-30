/**
 * Testes de Integração para RN-005 + RN-013: Validação Fiscal em Moeda Estrangeira
 * Atende: T-017, RN-005, RN-013, AMB-E04
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { processarLote } from '../src/engine.js';
import { LoteEntrada } from '../src/types.js';

test('T-017 / RN-005 + RN-013: despesa em USD sem nota > R$ 100 BRL é recusada integralmente', () => {
  // 40.00 USD em 2026-07-20: taxa PTAX = 5.50 -> 40 * 5.50 = R$ 220,00 > R$ 100,00
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
        id: 'e-005',
        data: '2026-07-20',
        categoria: 'transporte_urbano',
        descricao: 'Corridas do dia',
        fornecedor: 'Bolt',
        valor: 40.0,
        moeda: 'USD',
        tem_nota_fiscal: false,
      },
    ],
  };

  const resultado = processarLote(lote);
  const item = resultado.despesas[0];

  assert.strictEqual(item.status, 'RECUSADO');
  assert.strictEqual(item.valor_solicitado, 220.0);
  assert.strictEqual(item.valor_reembolsado, 0.0);
  assert.strictEqual(item.valor_glosado, 220.0);

  // Deve conter justificativa de conversão E justificativa de recusa por falta de nota fiscal
  assert.ok(item.justificativas.some((j) => j.includes('Conversão cambial')));
  assert.ok(item.justificativas.some((j) => j.includes('Nota fiscal obrigatória')));

  assert.strictEqual(resultado.resumo.total_solicitado, 220.0);
  assert.strictEqual(resultado.resumo.total_reembolsavel, 0.0);
  assert.strictEqual(resultado.resumo.total_glosado, 220.0);
  assert.strictEqual(resultado.resumo.itens_recusados, 1);
});

test('T-017 / RN-005 + RN-013: despesa em EUR sem nota <= R$ 100 BRL é aceita sem exigência fiscal', () => {
  // 14.50 EUR em 2026-07-15: taxa PTAX = 5.88 -> 14.50 * 5.88 = R$ 85,26 <= R$ 100,00
  // No CC-COMERCIAL, teto diário de alimentação é R$ 90,00. 85.26 <= 90.00 -> Aprovado integralmente!
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
        id: 'e-003',
        data: '2026-07-15',
        categoria: 'alimentacao',
        descricao: 'Cafe e sanduiche',
        fornecedor: 'Padaria Lisboa',
        valor: 14.5,
        moeda: 'EUR',
        tem_nota_fiscal: false,
      },
    ],
  };

  const resultado = processarLote(lote);
  const item = resultado.despesas[0];

  assert.strictEqual(item.status, 'APROVADO');
  assert.strictEqual(item.valor_solicitado, 85.26);
  assert.strictEqual(item.valor_reembolsado, 85.26);
  assert.strictEqual(item.valor_glosado, 0.0);
  assert.ok(item.justificativas.some((j) => j.includes('Conversão cambial')));
  assert.ok(!item.justificativas.some((j) => j.includes('Nota fiscal obrigatória')));

  assert.strictEqual(resultado.resumo.total_solicitado, 85.26);
  assert.strictEqual(resultado.resumo.total_reembolsavel, 85.26);
  assert.strictEqual(resultado.resumo.itens_aprovados, 1);
});

test('T-017 / RN-013: despesa em GBP sem cotação é recusada integralmente', () => {
  // 55.00 GBP em 2026-07-21: GBP não cotada na tabela de câmbio
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
        id: 'e-006',
        data: '2026-07-21',
        categoria: 'representacao',
        descricao: 'Almoco com parceiro - Londres',
        fornecedor: 'The Ivy',
        valor: 55.0,
        moeda: 'GBP',
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);
  const item = resultado.despesas[0];

  assert.strictEqual(item.status, 'RECUSADO');
  assert.strictEqual(item.valor_reembolsado, 0.0);
  assert.ok(item.justificativas.some((j) => j.includes("Moeda 'GBP' não possui cotação oficial")));
  assert.strictEqual(resultado.resumo.itens_recusados, 1);
});
