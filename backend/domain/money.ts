export type Currency = "USD" | "COP" | "CRC";

export function parseMinor(value: unknown): bigint {
  const text = typeof value === "number" && Number.isFinite(value) ? String(value) : String(value ?? "");
  const match = /^(0|[1-9]\d{0,11})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error("Ingresa un importe válido con hasta dos decimales.");
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const minor = BigInt(match[1]) * 100n + BigInt(fraction || "0");
  if (minor <= 0n) throw new Error("El importe debe ser mayor que cero.");
  return minor;
}

export function formatMinor(value: unknown): string {
  const minor = BigInt(String(value ?? "0"));
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const formatted = `${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
  return negative ? `-${formatted}` : formatted;
}

export function multiplyMinor(amount: bigint, numerator: bigint, denominator: bigint): bigint {
  return (amount * numerator + denominator / 2n) / denominator;
}

export function isCurrency(value: unknown): value is Currency {
  return value === "USD" || value === "COP" || value === "CRC";
}

export function currencyPair(from: Currency, to: Currency) {
  if (from === to) return { numerator: 1n, denominator: 1n, displayRate: "1.00000000" };
  const rates: Record<string, { numerator: bigint; denominator: bigint; displayRate: string }> = {
    "USD:COP": { numerator: 4100n, denominator: 1n, displayRate: "4100.00000000" },
    "COP:USD": { numerator: 1n, denominator: 4100n, displayRate: "0.00024390" },
    "USD:CRC": { numerator: 510n, denominator: 1n, displayRate: "510.00000000" },
    "CRC:USD": { numerator: 1n, denominator: 510n, displayRate: "0.00196078" },
    "COP:CRC": { numerator: 51n, denominator: 410n, displayRate: "0.12439024" },
    "CRC:COP": { numerator: 410n, denominator: 51n, displayRate: "8.03921569" },
  };
  const pair = rates[`${from}:${to}`];
  if (!pair) throw new Error("Ese corredor de cambio no está disponible.");
  return pair;
}

export function decimalMinorString(value: unknown, currency: string): string {
  const amount = BigInt(String(value ?? "0"));
  return `${formatMinor(amount)} ${currency}`;
}
