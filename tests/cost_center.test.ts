/**
 * Testes Unitários e de Integração para RN-014: Variação de Limites por Centro de Custo
 * Atende: T-015, RN-014, AMB-E03, DT-002
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { obterRegraCategoria } from '../src/policy.js';
import { processarLote } from '../src/engine.js';
import { LoteEntrada, PoliticaV4 } from '../src/types.js';

test('T-015 / RN-014: resolução de limites por centro de custo e fallback aditivo', () => {
  // 1. CC-COMERCIAL: possui representação (R$ 300) e limites ampliados
  const alimComercial = obterRegraCategoria('CC-COMERCIAL', 'alimentacao');
  assert.strictEqual(alimComercial?.limite, 90.0);

  const transpComercial = obterRegraCategoria('CC-COMERCIAL', 'transporte_urbano');
  assert.strictEqual(transpComercial?.limite, 150.0);

  const hospComercial = obterRegraCategoria('CC-COMERCIAL', 'hospedagem');
  assert.strictEqual(hospComercial?.limite, 400.0);

  const repComercial = obterRegraCategoria('CC-COMERCIAL', 'representacao');
  assert.strictEqual(repComercial?.limite, 300.0);

  // 2. CC-ENG-PLATAFORMA: hospedagem com limite 0 (não reembolsável)
  const hospEng = obterRegraCategoria('CC-ENG-PLATAFORMA', 'hospedagem');
  assert.strictEqual(hospEng?.limite, 0.0);

  const alimEng = obterRegraCategoria('CC-ENG-PLATAFORMA', 'alimentacao');
  assert.strictEqual(alimEng?.limite, 75.0);

  // 3. CC-ADM: hospedagem omitida herda do padrão (R$ 250.00) via fallback aditivo (AMB-E03)
  const hospAdm = obterRegraCategoria('CC-ADM', 'hospedagem');
  assert.strictEqual(hospAdm?.limite, 250.0);

  const alimAdm = obterRegraCategoria('CC-ADM', 'alimentacao');
  assert.strictEqual(alimAdm?.limite, 45.0);

  // 4. Centro de Custo Desconhecido (CC-SUPORTE-N2): aplica bloco padrão
  const alimDesconhecido = obterRegraCategoria('CC-SUPORTE-N2', 'alimentacao');
  assert.strictEqual(alimDesconhecido?.limite, 60.0);

  const transpDesconhecido = obterRegraCategoria('CC-SUPORTE-N2', 'transporte_urbano');
  assert.strictEqual(transpDesconhecido?.limite, 80.0);

  const hospDesconhecido = obterRegraCategoria('CC-SUPORTE-N2', 'hospedagem');
  assert.strictEqual(hospDesconhecido?.limite, 250.0);

  const repDesconhecido = obterRegraCategoria('CC-SUPORTE-N2', 'representacao');
  assert.strictEqual(repDesconhecido, null); // representacao não existe no bloco padrao
});

test('T-015 / RN-014: motor recusa despesas de categoria com limite zero no centro de custo', () => {
  const lote: LoteEntrada = {
    colaborador: {
      id: 'c-0417',
      nome: 'Marina Volpi',
      centro_custo: 'CC-ENG-PLATAFORMA',
    },
    periodo: {
      competencia: '2026-07',
      inicio: '2026-07-01',
      fim: '2026-07-31',
    },
    despesas: [
      {
        id: 'd-hosp-01',
        data: '2026-07-10',
        categoria: 'hospedagem',
        descricao: 'Hotel em SP - 1 diaria',
        fornecedor: 'Hotel Central',
        valor: 200.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);
  assert.strictEqual(resultado.despesas[0].status, 'RECUSADO');
  assert.strictEqual(resultado.despesas[0].valor_reembolsado, 0.0);
  assert.strictEqual(resultado.despesas[0].valor_glosado, 200.0);
  assert.ok(resultado.despesas[0].justificativas.some((j) => j.includes('limite zero')));
  assert.strictEqual(resultado.resumo.itens_recusados, 1);
  assert.strictEqual(resultado.resumo.total_reembolsavel, 0.0);
});

test('T-015 / RN-014: motor aplica regras e fallback para centro de custo desconhecido', () => {
  const lote: LoteEntrada = {
    colaborador: {
      id: 'c-1103',
      nome: 'Dani Okonkwo',
      centro_custo: 'CC-SUPORTE-N2',
    },
    periodo: {
      competencia: '2026-07',
      inicio: '2026-07-01',
      fim: '2026-07-31',
    },
    despesas: [
      {
        id: 'f-001',
        data: '2026-07-16',
        categoria: 'alimentacao',
        descricao: 'Almoco',
        fornecedor: 'Padaria Uniao',
        valor: 58.0,
        tem_nota_fiscal: true,
      },
      {
        id: 'f-003',
        data: '2026-07-17',
        categoria: 'representacao',
        descricao: 'Jantar com fornecedor',
        fornecedor: 'Casa Trindade',
        valor: 190.0,
        tem_nota_fiscal: true,
      },
    ],
  };

  const resultado = processarLote(lote);

  // f-001: alimentacao 58 <= 60 (padrao) -> APROVADO
  assert.strictEqual(resultado.despesas[0].status, 'APROVADO');
  assert.strictEqual(resultado.despesas[0].valor_reembolsado, 58.0);

  // f-003: representacao não existe no padrao -> RECUSADO
  assert.strictEqual(resultado.despesas[1].status, 'RECUSADO');
  assert.strictEqual(resultado.despesas[1].valor_reembolsado, 0.0);
  assert.strictEqual(resultado.despesas[1].valor_glosado, 190.0);
});
