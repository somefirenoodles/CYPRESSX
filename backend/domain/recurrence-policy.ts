/**
 * Política local de recurrencias programadas.
 *
 * Reglas:
 * - Calendario UTC: semanal suma 7 días; mensual/trimestral se anclan al día inicial.
 * - El ancla se recorta al último día del mes destino, sin deriva:
 *   31 ene -> 28 feb -> 31 mar -> 30 abr.
 * - Una ocurrencia es nominal: su fecha no cambia entre reintentos.
 * - Los reintentos usan una escalera finita 1 h / 24 h / 72 h (3 reintentos tras el intento inicial).
 */

export type RecurrenceFrequency = "weekly" | "monthly" | "quarterly";

export const RECURRENCE_FREQUENCIES: readonly RecurrenceFrequency[] = ["weekly", "monthly", "quarterly"] as const;

/** Reintentos posteriores al intento inicial. */
export const MAX_RETRIES = 3;

/** Cadencia del worker de ocurrencias. */
export const RECURRENCE_WORKER_INTERVAL_MS = 30_000;

/** Demoras de reintento en milisegundos: 1 h, 24 h, 72 h. */
const RETRY_DELAYS_MS: readonly number[] = [60 * 60 * 1000, 24 * 60 * 60 * 1000, 72 * 60 * 60 * 1000];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mensaje estable usado para clasificar fondos insuficientes (sin SQL). */
export const INSUFFICIENT_FUNDS_MESSAGE = "Saldo insuficiente.";

/** Mensaje estable usado para fallos técnicos recuperables (sin SQL). */
export const TECHNICAL_FAILURE_MESSAGE = "No se pudo completar el pago recurrente por un error técnico.";

export function isRecurrenceFrequency(value: unknown): value is RecurrenceFrequency {
  return typeof value === "string" && (RECURRENCE_FREQUENCIES as readonly string[]).includes(value);
}

/**
 * Demora de reintento para un índice basado en cero.
 * `0` -> 1 h, `1` -> 24 h, `2` -> 72 h. Devuelve `null` cuando la escalera está agotada.
 */
export function retryDelay(index: number): number | null {
  if (!Number.isInteger(index) || index < 0) return null;
  return RETRY_DELAYS_MS[index] ?? null;
}

/** Reintentos disponibles para un contador dado (0..MAX_RETRIES). */
export function retriesRemaining(retryCount: number): number {
  if (!Number.isFinite(retryCount) || retryCount <= 0) return MAX_RETRIES;
  return Math.max(0, MAX_RETRIES - Math.trunc(retryCount));
}

/** Día ancla (1..31) de una fecha, en UTC. */
export function anchorDayOf(date: Date): number {
  return date.getUTCDate();
}

export function isAnchorDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31;
}

function daysInMonthUtc(year: number, zeroBasedMonth: number): number {
  return new Date(Date.UTC(year, zeroBasedMonth + 1, 0)).getUTCDate();
}

/**
 * Siguiente ocurrencia nominal. Conserva la hora UTC y el ancla del día inicial.
 * El ancla se recorta al último día del mes (31 -> 30/28/29) y, como se recalcula
 * desde el ancla original, no hay deriva al volver a un mes de 31 días.
 */
export function nextOccurrence(date: Date, frequency: RecurrenceFrequency, anchorDay: number): Date {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("La fecha de ocurrencia debe ser una fecha válida.");
  }
  if (!isRecurrenceFrequency(frequency)) {
    throw new TypeError(`Frecuencia desconocida: ${String(frequency)}`);
  }

  if (frequency === "weekly") {
    return new Date(date.getTime() + 7 * DAY_MS);
  }

  const months = frequency === "monthly" ? 1 : 3;
  const target = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    1,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
  const lastDay = daysInMonthUtc(target.getUTCFullYear(), target.getUTCMonth());
  const day = Math.min(Math.max(isAnchorDay(anchorDay) ? anchorDay : date.getUTCDate(), 1), lastDay);
  target.setUTCDate(day);
  return target;
}

/**
 * Primera ocurrencia estrictamente futura. Salta ciclos pasados sin acumular cobros
 * pendientes (no se cobra backlog).
 */
export function nextFutureOccurrence(
  occurrence: Date,
  now: Date,
  frequency: RecurrenceFrequency,
  anchorDay: number,
): Date {
  let candidate = new Date(occurrence.getTime());
  let guard = 0;
  while (candidate.getTime() <= now.getTime()) {
    const following = nextOccurrence(candidate, frequency, anchorDay);
    if (following.getTime() <= candidate.getTime()) {
      throw new RangeError("La ocurrencia no puede retroceder.");
    }
    candidate = following;
    guard += 1;
    if (guard > 5_000) {
      throw new RangeError("No se pudo avanzar la ocurrencia fuera de rango.");
    }
  }
  return candidate;
}

/**
 * Indica si una ocurrencia quedó atrasada más de un ciclo completo. En ese caso
 * debe saltarse al siguiente ciclo futuro sin cobrarla (backlog).
 */
export function isBacklog(
  occurrence: Date,
  now: Date,
  frequency: RecurrenceFrequency,
  anchorDay: number,
): boolean {
  return nextOccurrence(occurrence, frequency, anchorDay).getTime() <= now.getTime();
}

/** Clave idempotente estable de una ocurrencia: recurrence:<id>:<nominalISO>. */
export function occurrenceKey(recurrenceId: number, nominal: Date): string {
  return `recurrence:${recurrenceId}:${nominal.toISOString()}`;
}

/** Fecha de reintento absoluta a partir del instante actual (UTC). */
export function retryAt(now: Date, retryIndex: number): Date | null {
  const delay = retryDelay(retryIndex);
  return delay === null ? null : new Date(now.getTime() + delay);
}

/** Importe menor (entero) a texto decimal con dos posiciones, sin depender de Intl. */
export function formatMinorAmount(amountMinor: bigint | number | string): string {
  const value = typeof amountMinor === "bigint" ? amountMinor : BigInt(amountMinor);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const cents = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${cents}`;
}
