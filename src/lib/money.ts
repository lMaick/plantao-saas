/**
 * Converte uma string de entrada monetária em centavos (bigint).
 * Aceita formatos brasileiros como "850,00", "1.234,56", "R$ 850,00".
 * Retorna null se a string estiver vazia.
 * Lança erro se o valor for inválido, negativo ou <= 0.
 */
export function parseAmountToCents(input: string): bigint | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Detectar sinal explicitamente antes de descartar caracteres.
  // "-" é o único sinal negativo aceito e é sempre rejeitado.
  // "+" é rejeitado para evitar entradas ambíguas não esperadas.
  if (trimmed.startsWith("-") || trimmed.startsWith("+")) {
    throw new Error("O valor deve ser maior que zero.");
  }

  // Remove tudo que não seja dígito, vírgula ou ponto.
  const cleaned = trimmed.replace(/[^\d,.]/g, "");

  if (cleaned.length === 0) {
    throw new Error("Informe um valor numérico válido.");
  }

  // Estratégia: o último separador entre "," e "." define a casa decimal.
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let integerPart: string;
  let decimalPart: string;

  if (lastComma === -1 && lastDot === -1) {
    integerPart = cleaned.replace(/[^\d]/g, "");
    decimalPart = "";
  } else if (lastComma > lastDot) {
    integerPart = cleaned.slice(0, lastComma).replace(/[^\d]/g, "");
    decimalPart = cleaned.slice(lastComma + 1).replace(/[^\d]/g, "");
  } else {
    integerPart = cleaned.slice(0, lastDot).replace(/[^\d]/g, "");
    decimalPart = cleaned.slice(lastDot + 1).replace(/[^\d]/g, "");
  }

  if (integerPart.length === 0 && decimalPart.length === 0) {
    throw new Error("Informe um valor numérico válido.");
  }

  if (decimalPart.length > 2) {
    throw new Error("Valor com mais de duas casas decimais.");
  }

  const padded = (decimalPart + "00").slice(0, 2);
  const centsText = `${integerPart || "0"}${padded}`;
  const cents = BigInt(centsText);

  if (cents <= BigInt(0)) {
    throw new Error("O valor deve ser maior que zero.");
  }

  return cents;
}
