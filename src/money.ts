/**
 * Utilitários para aritmética monetária de alta precisão em centavos inteiros
 * Atende: RN-011, AMB-009, DT-001
 */

/**
 * Converte um valor numérico em reais para centavos inteiros,
 * aplicando truncamento estrito em 2 casas decimais (sem arredondamento para cima).
 *
 * Exemplo: 33.333 -> 3333 (R$ 33,33)
 * Exemplo: 100.019 -> 10001 (R$ 100,01)
 * Exemplo: -45.00 -> -4500 (R$ -45,00)
 */
export function toCents(value: number): number {
  if (value === 0 || isNaN(value)) {
    return 0;
  }

  const isNegative = value < 0;
  const absVal = Math.abs(value);

  // Manipulação de string para evitar imprecisões binárias de float
  const str = absVal.toFixed(8);
  const [intPart, decPart] = str.split('.');
  const twoDecimals = decPart ? decPart.slice(0, 2) : '00';
  const cents = parseInt(intPart, 10) * 100 + parseInt(twoDecimals, 10);

  return isNegative ? -cents : cents;
}

/**
 * Converte centavos inteiros de volta para valor float com 2 casas decimais.
 * Exemplo: 3333 -> 33.33
 */
export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * Trunca um número para exatamente 2 casas decimais.
 * Exemplo: 33.333 -> 33.33
 */
export function truncateTwoDecimals(value: number): number {
  return fromCents(toCents(value));
}

/**
 * Formata centavos em string legível em Real (BRL).
 * Exemplo: 6000 -> "R$ 60,00"
 */
export function formatBRL(cents: number): string {
  return fromCents(cents).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
