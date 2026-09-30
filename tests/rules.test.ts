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
  // Teste unitário da função de validação
  assert.strictEqual(validarCompetencia('2026-07-15', '2026-07-01', '2026-07-31'), true);
  assert.strictEqual(validarCompetencia('2026-04-15', '2026-07-01', '2026-07-31'), false);
  assert.strictEqual(validarCompetencia('2026-08-01', '2026-07-01', '2026-07-31'), false);

  // Teste de lote com despesa d-008 datada de abril (2026-04-15) em lote de julho
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
  assert.strictEqual(resultado.despesas.length, 1);
  const item = resultado.despesas[0];
  assert.strictEqual(item.status, 'RECUSADO');
  assert.strictEqual(item.valor_reembolsado, 0.0);
  assert.strictEqual(item.valor_glosado, 41.0);
  assert.strictEqual(resultado.resumo.itens_recusados, 1);
  assert.strictEqual(resultado.resumo.total_reembolsavel, 0.0);
});
