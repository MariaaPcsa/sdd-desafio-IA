/**
 * Testes de Integração e Ponta a Ponta (E2E) da CLI
 * Atende: T-014 e Critérios de Aceite da spec
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { main } from '../src/cli.js';
import { LoteSaida } from '../src/types.js';

test('T-014 / CLI E2E: processa exemplos/despesas-exemplo.json e gera resultado.json válido', async () => {
  const outputPath = resolve(process.cwd(), 'tests/output_e2e_exemplo.json');
  if (existsSync(outputPath)) {
    await unlink(outputPath);
  }

  const exitCode = await main([
    'calcular',
    '--input',
    'exemplos/despesas-exemplo.json',
    '--output',
    'tests/output_e2e_exemplo.json',
  ]);

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(existsSync(outputPath), true);

  const fileContent = await readFile(outputPath, 'utf-8');
  const resultado = JSON.parse(fileContent) as LoteSaida;

  // Validação da estrutura
  assert.strictEqual(resultado.colaborador.id, 'c-0417');
  assert.strictEqual(resultado.colaborador.nome, 'Marina Volpi');
  assert.strictEqual(resultado.periodo.competencia, '2026-07');
  assert.strictEqual(resultado.despesas.length, 14);

  // Validação dos totalizadores e integridade: solicitado = reembolsavel + glosado
  const somaCalculada = Math.round((resultado.resumo.total_reembolsavel + resultado.resumo.total_glosado) * 100) / 100;
  assert.strictEqual(resultado.resumo.total_solicitado, somaCalculada);

  // Limpeza
  await unlink(outputPath);
});

test('T-019 / CLI E2E: processa despesas-envelope.json com politica v4 e cambio', async () => {
  const outputPath = resolve(process.cwd(), 'tests/output_e2e_envelope.json');
  if (existsSync(outputPath)) {
    await unlink(outputPath);
  }

  const exitCode = await main([
    'calcular',
    '--input',
    'exemplos/envelope/despesas-envelope.json',
    '--output',
    'tests/output_e2e_envelope.json',
    '--politica',
    'exemplos/envelope/politica-v4.json',
    '--cambio',
    'exemplos/envelope/cambio.json',
  ]);

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(existsSync(outputPath), true);

  const fileContent = await readFile(outputPath, 'utf-8');
  const resultado = JSON.parse(fileContent) as LoteSaida;

  // Colaborador e período
  assert.strictEqual(resultado.colaborador.id, 'c-0912');
  assert.strictEqual(resultado.colaborador.centro_custo, 'CC-COMERCIAL');
  assert.strictEqual(resultado.periodo.competencia, '2026-07');
  assert.strictEqual(resultado.despesas.length, 10);

  // Verificação de itens emblemáticos:
  // e-004 (sábado com câmbio de sexta-feira)
  const e004 = resultado.despesas.find((d) => d.id === 'e-004');
  assert.ok(e004);
  assert.strictEqual(e004.status, 'APROVADO_PARCIAL');
  assert.strictEqual(e004.valor_solicitado, 178.8); // 30 EUR * 5.96
  assert.strictEqual(e004.valor_reembolsado, 90.0); // teto CC-COMERCIAL
  assert.strictEqual(e004.valor_glosado, 88.8);

  // e-005 (USD sem nota > R$ 100 BRL)
  const e005 = resultado.despesas.find((d) => d.id === 'e-005');
  assert.ok(e005);
  assert.strictEqual(e005.status, 'RECUSADO');
  assert.strictEqual(e005.valor_solicitado, 220.0); // 40 USD * 5.50
  assert.strictEqual(e005.valor_reembolsado, 0.0);

  // e-006 (GBP sem cotação)
  const e006 = resultado.despesas.find((d) => d.id === 'e-006');
  assert.ok(e006);
  assert.strictEqual(e006.status, 'RECUSADO');
  assert.strictEqual(e006.valor_reembolsado, 0.0);

  // e-007 (Hospedagem Londres > R$ 500 -> PENDENTE_APROVACAO)
  const e007 = resultado.despesas.find((d) => d.id === 'e-007');
  assert.ok(e007);
  assert.strictEqual(e007.status, 'PENDENTE_APROVACAO');
  assert.strictEqual(e007.valor_reembolsado, 1200.0);

  // Totalizadores e integridade matemática
  assert.strictEqual(resultado.resumo.itens_processados, 10);
  assert.strictEqual(resultado.resumo.itens_pendentes_aprovacao, 1);
  const soma = Math.round((resultado.resumo.total_reembolsavel + resultado.resumo.total_glosado) * 100) / 100;
  assert.strictEqual(resultado.resumo.total_solicitado, soma);

  await unlink(outputPath);
});

test('T-019 / CLI E2E: processa despesas-envelope-cc-desconhecido.json com fallback padrão', async () => {
  const outputPath = resolve(process.cwd(), 'tests/output_e2e_desconhecido.json');
  if (existsSync(outputPath)) {
    await unlink(outputPath);
  }

  const exitCode = await main([
    'calcular',
    '--input',
    'exemplos/envelope/despesas-envelope-cc-desconhecido.json',
    '--output',
    'tests/output_e2e_desconhecido.json',
    '--politica',
    'exemplos/envelope/politica-v4.json',
    '--cambio',
    'exemplos/envelope/cambio.json',
  ]);

  assert.strictEqual(exitCode, 0);
  assert.strictEqual(existsSync(outputPath), true);

  const fileContent = await readFile(outputPath, 'utf-8');
  const resultado = JSON.parse(fileContent) as LoteSaida;

  assert.strictEqual(resultado.colaborador.centro_custo, 'CC-SUPORTE-N2');
  assert.strictEqual(resultado.despesas.length, 4);

  // f-001 (alimentacao 58 <= 60 padrao) -> APROVADO
  assert.strictEqual(resultado.despesas[0].status, 'APROVADO');
  assert.strictEqual(resultado.despesas[0].valor_reembolsado, 58.0);

  // f-002 (hospedagem 310 > 250 padrao) -> APROVADO_PARCIAL (250 reembolsado, 60 glosa)
  assert.strictEqual(resultado.despesas[1].status, 'APROVADO_PARCIAL');
  assert.strictEqual(resultado.despesas[1].valor_reembolsado, 250.0);
  assert.strictEqual(resultado.despesas[1].valor_glosado, 60.0);

  // f-003 (representacao não existe no padrao) -> RECUSADO
  assert.strictEqual(resultado.despesas[2].status, 'RECUSADO');
  assert.strictEqual(resultado.despesas[2].valor_reembolsado, 0.0);

  // f-004 (transporte 12 USD * 5.48 = R$ 65.76 <= 80 padrao) -> APROVADO
  assert.strictEqual(resultado.despesas[3].status, 'APROVADO');
  assert.strictEqual(resultado.despesas[3].valor_solicitado, 65.76);
  assert.strictEqual(resultado.despesas[3].valor_reembolsado, 65.76);

  // Integridade matemática
  const soma = Math.round((resultado.resumo.total_reembolsavel + resultado.resumo.total_glosado) * 100) / 100;
  assert.strictEqual(resultado.resumo.total_solicitado, soma);

  await unlink(outputPath);
});

test('T-014 / CLI: tratamento de erros de validação de argumentos e arquivos inexistentes', async () => {
  // Comando inválido
  const codeInvalido = await main(['invalido']);
  assert.strictEqual(codeInvalido, 1);

  // Arquivo de entrada inexistente
  const codeInexistente = await main([
    'calcular',
    '--input',
    'arquivo_inexistente.json',
    '--output',
    'saida.json',
  ]);
  assert.strictEqual(codeInexistente, 1);

  // Help
  const codeHelp = await main(['--help']);
  assert.strictEqual(codeHelp, 0);
});
