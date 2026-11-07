import oracledb, { type Connection } from "oracledb";
import { withConnection, withTransaction } from "../db/oracle";
import { createTransfer, validatedCurrency } from "./payments";
import { notify } from "./notifications";
import { operationKey } from "./idempotency";
import type { Currency } from "./money";
import {
  INSUFFICIENT_FUNDS_MESSAGE,
  MAX_RETRIES,
  RECURRENCE_WORKER_INTERVAL_MS,
  TECHNICAL_FAILURE_MESSAGE,
  isBacklog,
  isRecurrenceFrequency,
  nextFutureOccurrence,
  nextOccurrence,
  occurrenceKey,
  retryAt,
  type RecurrenceFrequency,
} from "./recurrence-policy";

type DueRecurrence = {
  ID: string;
  OWNER_ID: string;
  RECIPIENT_ID: string;
  AMOUNT_MINOR: string;
  CURRENCY: string;
  FREQUENCY: string;
  NEXT_RUN_AT: Date;
  OCCURRENCE_AT: Date | null;
  ANCHOR_DAY: string | null;
  RETRY_COUNT: string | null;
};

type OccurrenceContext = {
  id: number;
  ownerId: number;
  recipientId: number;
  amountMinor: bigint;
  currency: Currency;
  frequency: RecurrenceFrequency;
  occurrenceAt: Date;
  anchorDay: number;
  retryCount: number;
};

const DUE_LIMIT = 25;
const ATTEMPT_SAVEPOINT = "cx_recurrence_attempt";

let running = false;

/** Worker de 30 s; una sola pasada a la vez dentro del proceso. */
export function startRecurrenceWorker(intervalMs = RECURRENCE_WORKER_INTERVAL_MS) {
  const timer = setInterval(() => void processDueRecurrences(), intervalMs);
  timer.unref();
  void processDueRecurrences();
  return () => clearInterval(timer);
}

/**
 * Procesa las recurrencias vencidas. Si la base no está accesible no se debita
 * nada: la transacción completa se revierte y el temporizador reintenta luego.
 */
export async function processDueRecurrences(): Promise<number> {
  if (running) return 0;
  running = true;
  let processed = 0;
  try {
    const due = await withConnection((connection) =>
      connection.execute<{ ID: string }>(
        `SELECT id FROM cx_recurrences
          WHERE status = 'active' AND consent_at IS NOT NULL AND next_run_at <= SYSTIMESTAMP
          ORDER BY next_run_at
          FETCH FIRST ${DUE_LIMIT} ROWS ONLY`,
      ),
    );
    for (const row of due.rows ?? []) {
      const id = Number(row.ID);
      if (!Number.isInteger(id) || id <= 0) continue;
      await processRecurrenceOnce(id);
      processed += 1;
    }
  } catch (error) {
    console.error("No se pudieron procesar las programaciones.", describeForLog(error));
  } finally {
    running = false;
  }
  return processed;
}

/**
 * Cobra una ocurrencia concreta. Los errores se aíslan por recurrencia para que
 * una fila problemática no detenga al resto; cada intento corre en su transacción.
 */
export async function processRecurrenceOnce(id: number): Promise<void> {
  try {
    await withTransaction((connection) => chargeOccurrence(connection, id));
  } catch (error) {
    console.error(`No se pudo procesar la recurrencia ${id}.`, describeForLog(error));
  }
}

async function chargeOccurrence(connection: Connection, id: number): Promise<void> {
  const schedule = await lockSchedule(connection, id);
  if (!schedule) return;

  const frequency = toFrequency(schedule.FREQUENCY);
  const nominal = toDate(schedule.OCCURRENCE_AT ?? schedule.NEXT_RUN_AT);
  const anchorDay = toAnchorDay(schedule.ANCHOR_DAY, nominal);
  const now = new Date();
  const context: OccurrenceContext = {
    id,
    ownerId: Number(schedule.OWNER_ID),
    recipientId: Number(schedule.RECIPIENT_ID),
    amountMinor: BigInt(schedule.AMOUNT_MINOR),
    currency: validatedCurrency(schedule.CURRENCY),
    frequency,
    occurrenceAt: nominal,
    anchorDay,
    retryCount: toCount(schedule.RETRY_COUNT),
  };

  // Backlog: si la ocurrencia quedó atrasada más de un ciclo completo se salta
  // al siguiente ciclo futuro sin cobrar las ocurrencias perdidas.
  if (isBacklog(nominal, now, frequency, anchorDay)) {
    const next = nextFutureOccurrence(nextOccurrence(nominal, frequency, anchorDay), now, frequency, anchorDay);
    await moveSchedule(connection, id, next);
    return;
  }

  const key = occurrenceKey(id, nominal);
  const previous = await findOperation(connection, context.ownerId, operationKey("recurrences.run", key));
  if (previous && previous.STATUS === "completed") {
    // La ocurrencia ya se pagó (por ejemplo, tras un reinicio del worker).
    await markCompleted(connection, id, nominal, frequency, anchorDay, Number(previous.ID));
    return;
  }

  let operationId: number | null = null;
  let failure: string | null = null;

  await connection.execute(`SAVEPOINT ${ATTEMPT_SAVEPOINT}`);
  try {
    const result = await createTransfer(connection, {
      userId: context.ownerId,
      recipientId: context.recipientId,
      amountMinor: context.amountMinor,
      fromCurrency: context.currency,
      toCurrency: context.currency,
      idempotencyKey: key,
      description: `Pago recurrente #${id}`,
      operationType: "recurrence",
    });
    operationId = Number(result.id);
    if (!Number.isFinite(operationId)) throw new Error("Operación sin identificador.");
  } catch (error) {
    await rollbackAttempt(connection);
    operationId = null;
    failure = classifyFailure(error);
  }

  if (failure === null && operationId !== null) {
    await markCompleted(connection, id, nominal, frequency, anchorDay, operationId);
    return;
  }

  const message = failure ?? TECHNICAL_FAILURE_MESSAGE;
  // Sin saldo ni ledger: solo una operación fallida para dejar rastro del intento.
  const failedOperationId = await recordFailedAttempt(connection, context, key, message);
  await scheduleFailure(connection, context, failedOperationId, message, now);
}

async function lockSchedule(connection: Connection, id: number): Promise<DueRecurrence | null> {
  const selected = await connection.execute<DueRecurrence>(
    `SELECT id, owner_id, recipient_id, amount_minor, currency, frequency, next_run_at,
            occurrence_at, anchor_day, retry_count
       FROM cx_recurrences
      WHERE id = :id AND status = 'active' AND consent_at IS NOT NULL AND next_run_at <= SYSTIMESTAMP
      FOR UPDATE SKIP LOCKED`,
    { id },
  );
  return selected.rows?.[0] ?? null;
}

async function findOperation(
  connection: Connection,
  userId: number,
  key: string,
): Promise<{ ID: string; STATUS: string } | null> {
  const found = await connection.execute<{ ID: string; STATUS: string }>(
    `SELECT id, status FROM cx_operations WHERE user_id = :userId AND idempotency_key = :key`,
    { userId, key },
  );
  return found.rows?.[0] ?? null;
}

async function markCompleted(
  connection: Connection,
  id: number,
  nominal: Date,
  frequency: RecurrenceFrequency,
  anchorDay: number,
  operationId: number,
): Promise<void> {
  const next = nextOccurrence(nominal, frequency, anchorDay);
  await connection.execute(
    `UPDATE cx_recurrences
        SET occurrence_at = :next, next_run_at = :next, retry_count = 0,
            last_run_at = SYSTIMESTAMP, last_run_status = 'completed',
            last_error = NULL, last_operation_id = :operationId
      WHERE id = :id`,
    { next, operationId, id },
  );
}

async function moveSchedule(connection: Connection, id: number, next: Date): Promise<void> {
  await connection.execute(
    `UPDATE cx_recurrences
        SET occurrence_at = :next, next_run_at = :next, retry_count = 0,
            last_error = NULL
      WHERE id = :id`,
    { next, id },
  );
}

async function scheduleFailure(
  connection: Connection,
  context: OccurrenceContext,
  operationId: number,
  message: string,
  now: Date,
): Promise<void> {
  const retryIndex = context.retryCount;
  const nextRunAt = retryIndex < MAX_RETRIES ? retryAt(now, retryIndex) : null;

  if (nextRunAt) {
    await connection.execute(
      `UPDATE cx_recurrences
          SET next_run_at = :nextRunAt, retry_count = :retryCount,
              last_run_at = SYSTIMESTAMP, last_run_status = 'failed',
              last_error = :message, last_operation_id = :operationId
        WHERE id = :id`,
      { nextRunAt, retryCount: retryIndex + 1, message, operationId, id: context.id },
    );
    await safeNotify(connection, {
      userId: context.ownerId,
      referenceId: context.id,
      eventKey: `recurrence:${context.id}:${context.occurrenceAt.toISOString()}:retry:${retryIndex + 1}`,
      title: "Pago recurrente no procesado",
      message: `${message} Reintentaremos automáticamente.`,
    });
    return;
  }

  // Reintentos agotados: la ocurrencia nominal se abandona y el ciclo sigue en el futuro.
  const following = nextOccurrence(context.occurrenceAt, context.frequency, context.anchorDay);
  const next = nextFutureOccurrence(following, now, context.frequency, context.anchorDay);
  await connection.execute(
    `UPDATE cx_recurrences
        SET occurrence_at = :next, next_run_at = :next, retry_count = 0,
            last_run_at = SYSTIMESTAMP, last_run_status = 'failed',
            last_error = :message, last_operation_id = :operationId
      WHERE id = :id`,
    { next, message, operationId, id: context.id },
  );
  await safeNotify(connection, {
    userId: context.ownerId,
    referenceId: context.id,
    eventKey: `recurrence:${context.id}:${context.occurrenceAt.toISOString()}:exhausted`,
    title: "Pago recurrente omitido",
    message: `${message} Se agotaron los ${MAX_RETRIES} reintentos de esta ocurrencia; no se debitó saldo.`,
  });
}

async function recordFailedAttempt(
  connection: Connection,
  context: OccurrenceContext,
  key: string,
  message: string,
): Promise<number> {
  const attemptKey = operationKey("recurrences.failed", `${key}:${context.retryCount}`);
  const existing = await findOperation(connection, context.ownerId, attemptKey);
  if (existing) {
    if (existing.STATUS !== "completed") {
      await connection.execute(
        `UPDATE cx_operations SET status = 'failed', description = :description WHERE id = :id`,
        { description: `${message} Pago recurrente #${context.id}`, id: Number(existing.ID) },
      );
    }
    return Number(existing.ID);
  }

  const inserted = await connection.execute(
    `INSERT INTO cx_operations(user_id, operation_type, idempotency_key, recipient_id, from_currency, to_currency,
       from_amount_minor, to_amount_minor, fx_rate, status, description)
     VALUES (:actorId, 'recurrence', :key, :recipient, :currency, :currency,
       :amount, :amount, 1, 'failed', :description)
     RETURNING id INTO :id`,
    {
      actorId: context.ownerId,
      key: attemptKey,
      recipient: context.recipientId,
      currency: context.currency,
      amount: context.amountMinor.toString(),
      description: `${message} Pago recurrente #${context.id}`,
      id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    },
  );
  return Number((inserted.outBinds as { id: number[] }).id[0]);
}

async function safeNotify(connection: Connection, input: {
  userId: number;
  referenceId: number;
  eventKey: string;
  title: string;
  message: string;
}): Promise<void> {
  await notify(connection, { ...input, referenceType: "recurrence" });
}

async function rollbackAttempt(connection: Connection): Promise<void> {
  // A failed savepoint rollback must abort the entire transaction.
  await connection.execute(`ROLLBACK TO SAVEPOINT ${ATTEMPT_SAVEPOINT}`);
}

function classifyFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Saldo insuficiente")) return INSUFFICIENT_FUNDS_MESSAGE;
  // Nunca se persiste el mensaje técnico crudo: podría contener SQL.
  return TECHNICAL_FAILURE_MESSAGE;
}

function describeForLog(error: unknown): string {
  if (error instanceof Error) return error.name;
  return "Error desconocido";
}

function toFrequency(value: string): RecurrenceFrequency {
  if (!isRecurrenceFrequency(value)) throw new Error("Frecuencia de recurrencia inválida.");
  return value;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toAnchorDay(value: string | null, occurrence: Date): number {
  const parsed = value === null ? Number.NaN : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31 ? parsed : occurrence.getUTCDate();
}

function toCount(value: string | null): number {
  const parsed = value === null ? 0 : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}
