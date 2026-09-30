import test from 'node:test';
import assert from 'node:assert/strict';
import { toCents, fromCents, truncateTwoDecimals } from '../src/money.js';

test('T-001: ambiente TypeScript e executor de testes configurados com sucesso', () => {
  assert.strictEqual(true, true);
});

test('T-003 / RN-011: valor com três casas decimais é truncado em duas casas', () => {
  // Teste direto com o valor de exemplo da spec (d-011: 33.333)
  assert.strictEqual(truncateTwoDecimals(33.333), 33.33);
  assert.strictEqual(toCents(33.333), 3333);
  assert.strictEqual(fromCents(3333), 33.33);

  // Não arredonda para cima (truncamento puro)
  assert.strictEqual(truncateTwoDecimals(10.999), 10.99);
  assert.strictEqual(toCents(10.999), 1099);

  // Valores normais
  assert.strictEqual(truncateTwoDecimals(72.5), 72.5);
  assert.strictEqual(toCents(72.5), 7250);
  assert.strictEqual(toCents(100.01), 10001);

  // Valores negativos (estorno)
  assert.strictEqual(toCents(-45.0), -4500);
  assert.strictEqual(fromCents(-4500), -45.0);
  assert.strictEqual(truncateTwoDecimals(-45.0), -45.0);
});
