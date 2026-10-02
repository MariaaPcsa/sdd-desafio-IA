#!/usr/bin/env node
/**
 * Interface de Linha de Comando (CLI) para o Motor de Reembolso
 * Uso:
 *   npx tsx src/cli.ts calcular --input <caminho> --output <caminho> [--politica <caminho>] [--cambio <caminho>]
 *   npm start -- calcular --input <caminho> --output <caminho>
 */

import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoteEntrada, PoliticaV4, TabelaCambio } from './types.js';
import { POLITICA_PADRAO_V4 } from './policy.js';
import { processarLote } from './engine.js';

export async function main(args: string[] = process.argv.slice(2)): Promise<number> {
  const options = {
    input: { type: 'string' as const },
    output: { type: 'string' as const },
    politica: { type: 'string' as const },
    cambio: { type: 'string' as const },
    help: { type: 'boolean' as const, short: 'h' },
  };

  try {
    const { values, positionals } = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    if (values.help) {
      console.log(`
Uso:
  reembolso calcular --input <despesas.json> --output <resultado.json> [--politica <politica.json>] [--cambio <cambio.json>]

Opções:
  --input     Caminho do arquivo JSON de entrada contendo o lote de despesas (obrigatório)
  --output    Caminho onde será salvo o relatório JSON gerado (obrigatório)
  --politica  Caminho da tabela de política de reembolso externa (opcional)
  --cambio    Caminho da tabela de cotações de câmbio (opcional)
  -h, --help  Exibe esta mensagem de ajuda
      `);
      return 0;
    }

    const comando = positionals[0];
    if (comando !== 'calcular') {
      console.error(`Erro: Comando '${comando ?? ''}' desconhecido. O comando esperado é 'calcular'.`);
      return 1;
    }

    const inputFile = values.input ?? positionals[1];
    const outputFile = values.output ?? positionals[2];

    if (!inputFile) {
      console.error("Erro: Parâmetro obrigatório '--input' não informado.");
      return 1;
    }

    if (!outputFile) {
      console.error("Erro: Parâmetro obrigatório '--output' não informado.");
      return 1;
    }

    const inputPath = resolve(process.cwd(), inputFile);
    if (!existsSync(inputPath)) {
      console.error(`Erro: Arquivo de entrada não encontrado: '${inputFile}'.`);
      return 1;
    }

    const inputContent = await readFile(inputPath, 'utf-8');
    let lote: LoteEntrada;
    try {
      lote = JSON.parse(inputContent) as LoteEntrada;
    } catch (err) {
      console.error(`Erro: Arquivo de entrada '${inputFile}' não contém um JSON válido.`);
      return 1;
    }

    // Carregar Política (externa ou padrão)
    let politica: PoliticaV4 = POLITICA_PADRAO_V4;
    const defaultPoliticaPath = resolve(process.cwd(), 'exemplos/envelope/politica-v4.json');
    let caminhoPolitica: string | undefined;

    if (values.politica) {
      caminhoPolitica = resolve(process.cwd(), values.politica);
      if (!existsSync(caminhoPolitica)) {
        console.error(`Erro: Arquivo de política não encontrado: '${values.politica}'.`);
        return 1;
      }
    } else if (existsSync(defaultPoliticaPath)) {
      caminhoPolitica = defaultPoliticaPath;
    }

    if (caminhoPolitica) {
      try {
        const polContent = await readFile(caminhoPolitica, 'utf-8');
        politica = JSON.parse(polContent) as PoliticaV4;
      } catch (err) {
        console.error(`Aviso: Erro ao carregar política de '${caminhoPolitica}'. Utilizando política padrão.`);
      }
    }

    // Carregar Câmbio (externo ou padrão)
    let tabelaCambio: TabelaCambio | undefined;
    const defaultCambioPath = resolve(process.cwd(), 'exemplos/envelope/cambio.json');
    let caminhoCambio: string | undefined;

    if (values.cambio) {
      caminhoCambio = resolve(process.cwd(), values.cambio);
      if (!existsSync(caminhoCambio)) {
        console.error(`Erro: Arquivo de câmbio não encontrado: '${values.cambio}'.`);
        return 1;
      }
    } else if (existsSync(defaultCambioPath)) {
      caminhoCambio = defaultCambioPath;
    }

    if (caminhoCambio) {
      try {
        const cambioContent = await readFile(caminhoCambio, 'utf-8');
        tabelaCambio = JSON.parse(cambioContent) as TabelaCambio;
      } catch (err) {
        console.error(`Aviso: Erro ao carregar tabela de câmbio de '${caminhoCambio}'.`);
      }
    }

    // Processamento do lote
    const resultado = processarLote(lote, politica, tabelaCambio);

    // Gravação da saída
    const outputPath = resolve(process.cwd(), outputFile);
    await writeFile(outputPath, JSON.stringify(resultado, null, 2), 'utf-8');

    console.log(`Sucesso: Processamento concluído com êxito!`);
    console.log(`Colaborador: ${resultado.colaborador.nome} (${resultado.colaborador.centro_custo})`);
    console.log(`Itens processados: ${resultado.resumo.itens_processados}`);
    console.log(`Total solicitado: R$ ${resultado.resumo.total_solicitado.toFixed(2)}`);
    console.log(`Total reembolsável: R$ ${resultado.resumo.total_reembolsavel.toFixed(2)}`);
    console.log(`Total glosado: R$ ${resultado.resumo.total_glosado.toFixed(2)}`);
    console.log(`Arquivo salvo em: '${outputFile}'`);

    return 0;
  } catch (err: unknown) {
    console.error(`Erro inesperado durante execução: ${(err as Error).message}`);
    return 1;
  }
}

// Execução direta via CLI
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().then((code) => {
    if (code !== 0) {
      process.exit(code);
    }
  });
}
