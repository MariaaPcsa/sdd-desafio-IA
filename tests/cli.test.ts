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
