/**
 * Testes Unitários e de Integração para RN-013: Conversão Cambial
 * Atende: T-016, RN-013, AMB-E01, AMB-E02, DT-001
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { obterTaxaCambio, converterParaBrl, TABELA_CAMBIO_PADRAO } from '../src/currency.js';

test('T-016 / RN-013: obtém taxa de câmbio em dia útil exato', () => {
  // Segunda-feira 2026-07-13
  const cotacaoUsd = obterTaxaCambio('2026-07-13', 'USD', TABELA_CAMBIO_PADRAO);
  assert.strictEqual(cotacaoUsd?.taxa, 5.42);
  assert.strictEqual(cotacaoUsd?.dataCotacao, '2026-07-13');
  assert.strictEqual(cotacaoUsd?.ehDiaAnterior, false);

  // Terça-feira 2026-07-14
  const cotacaoEur = obterTaxaCambio('2026-07-14', 'EUR', TABELA_CAMBIO_PADRAO);
  assert.strictEqual(cotacaoEur?.taxa, 5.93);
  assert.strictEqual(cotacaoEur?.dataCotacao, '2026-07-14');
  assert.strictEqual(cotacaoEur?.ehDiaAnterior, false);
});

test('T-016 / RN-013 / AMB-E01: despesa em fim de semana retrocede para a sexta-feira anterior (PTAX)', () => {
  // Sábado 2026-07-18 -> deve usar sexta-feira 2026-07-17 (EUR: 5.96, USD: 5.47)
  const cotacaoSabadoEur = obterTaxaCambio('2026-07-18', 'EUR', TABELA_CAMBIO_PADRAO);
  assert.strictEqual(cotacaoSabadoEur?.taxa, 5.96);
  assert.strictEqual(cotacaoSabadoEur?.dataCotacao, '2026-07-17');
  assert.strictEqual(cotacaoSabadoEur?.ehDiaAnterior, true);

  // Domingo 2026-07-19 -> também deve usar sexta-feira 2026-07-17
  const cotacaoDomingoUsd = obterTaxaCambio('2026-07-19', 'USD', TABELA_CAMBIO_PADRAO);
  assert.strictEqual(cotacaoDomingoUsd?.taxa, 5.47);
  assert.strictEqual(cotacaoDomingoUsd?.dataCotacao, '2026-07-17');
  assert.strictEqual(cotacaoDomingoUsd?.ehDiaAnterior, true);
});

test('T-016 / RN-013 / AMB-E02: moeda não cotada (GBP) retorna null para acionar recusa integral', () => {
  const cotacaoGbp = obterTaxaCambio('2026-07-21', 'GBP', TABELA_CAMBIO_PADRAO);
  assert.strictEqual(cotacaoGbp, null);

  const conversaoGbp = converterParaBrl(55.0, 'GBP', '2026-07-21', TABELA_CAMBIO_PADRAO);
  assert.strictEqual(conversaoGbp, null);
});

test('T-016 / RN-013: conversão para BRL com truncamento de 2 casas decimais', () => {
  // 30.00 EUR em 2026-07-18 (taxa 5.96 de 2026-07-17) -> 30 * 5.96 = 178.80
  const conversao = converterParaBrl(30.0, 'EUR', '2026-07-18', TABELA_CAMBIO_PADRAO);
  assert.ok(conversao !== null);
  assert.strictEqual(conversao.valorBrl, 178.8);
  assert.strictEqual(conversao.taxa, 5.96);
  assert.strictEqual(conversao.dataCotacao, '2026-07-17');
  assert.strictEqual(conversao.ehDiaAnterior, true);

  // Moeda BRL não sofre alteração cambial (taxa 1.0)
  const conversaoBrl = converterParaBrl(150.0, 'BRL', '2026-07-18', TABELA_CAMBIO_PADRAO);
  assert.ok(conversaoBrl !== null);
  assert.strictEqual(conversaoBrl.valorBrl, 150.0);
  assert.strictEqual(conversaoBrl.taxa, 1.0);
});
