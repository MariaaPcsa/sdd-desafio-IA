import test from 'node:test';
import assert from 'node:assert/strict';
import { toCents, fromCents, truncateTwoDecimals } from '../src/money.js';
import {
  POLITICA_PADRAO_V4,
  obterRegraCategoria,
  calcularLimiteEfetivoCentavos,
} from '../src/policy.js';

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
  // CC-COMERCIAL: alimentação limite 90.00
  const regraAlimComercial = obterRegraCategoria('CC-COMERCIAL', 'alimentacao');
  assert.notStrictEqual(regraAlimComercial, null);
  assert.strictEqual(regraAlimComercial?.limite, 90.0);
  assert.strictEqual(calcularLimiteEfetivoCentavos(regraAlimComercial!, false), 9000);
  // Em viagem (+50%): 90 * 1.5 = 135
  assert.strictEqual(calcularLimiteEfetivoCentavos(regraAlimComercial!, true), 13500);

  // CC-ENG-PLATAFORMA: hospedagem limite 0.00 (não reembolsável)
  const regraHospEng = obterRegraCategoria('CC-ENG-PLATAFORMA', 'hospedagem');
  assert.notStrictEqual(regraHospEng, null);
  assert.strictEqual(regraHospEng?.limite, 0.0);
  assert.strictEqual(calcularLimiteEfetivoCentavos(regraHospEng!, false), 0);
  assert.strictEqual(calcularLimiteEfetivoCentavos(regraHospEng!, true), 0);

  // CC-ADM: herda hospedagem do padrão (fallback aditivo R$ 250)
  const regraHospAdm = obterRegraCategoria('CC-ADM', 'hospedagem');
  assert.notStrictEqual(regraHospAdm, null);
  assert.strictEqual(regraHospAdm?.limite, 250.0);

  // Centro de custo desconhecido (CC-SUPORTE-N2): recusa representacao (não existe no padrão)
  const regraRepDesconhecido = obterRegraCategoria('CC-SUPORTE-N2', 'representacao');
  assert.strictEqual(regraRepDesconhecido, null);

  // CC-COMERCIAL tem representacao com limite 300
  const regraRepComercial = obterRegraCategoria('CC-COMERCIAL', 'representacao');
  assert.notStrictEqual(regraRepComercial, null);
  assert.strictEqual(regraRepComercial?.limite, 300.0);
});
