import { Router, type NextFunction, type Request, type Response } from "express";
import oracledb, { type Connection } from "oracledb";
import { z } from "zod";
import { withConnection, withTransaction } from "../db/oracle";
import {
  IdempotencyConflictError,
  isValidIdempotencyKey,
  runIdempotent,
} from "../domain/idempotency";
import { formatMinor, parseMinor } from "../domain/money";
import { sanitizeUserVisibleCopy } from "../domain/display-copy";
import { validatedCurrency } from "../domain/payments";
import {
  MAX_RETRIES,
  anchorDayOf,
  isRecurrenceFrequency,
  nextFutureOccurrence,
  nextOccurrence,
  type RecurrenceFrequency,
} from "../domain/recurrence-policy";
import { currentUser, requireUser } from "./auth";

/**
 * Rutas de gestión de pagos recurrentes.
 *
 * Reglas de negocio relevantes:
 * - Crear una recurrencia no cobra: sólo agenda la primera ocurrencia futura.
 * - El consentimiento explícito es obligatorio para crear y para cambiar el importe.
 * - Un cambio de importe no altera el estado ni el calendario.
 * - Reanudar una recurrencia en pausa salta ciclos perdidos (sin backlog) y reinicia reintentos.
 * - `cancelled` es terminal: sólo se admite reproducir la misma cancelación sin cambios.
 */

type RecurrenceRow = {
  ID: string;
  RECIPIENT_ID: string;
  AMOUNT_MINOR: string;
  CURRENCY: string;
  FREQUENCY: string;
  STATUS: string;
  NEXT_RUN_AT: Date | string;
  OCCURRENCE_AT: Date | string | null;
  LAST_RUN_STATUS: string | null;
  LAST_ERROR: string | null;
  ANCHOR_DAY: string | null;
  RETRY_COUNT: string | null;
  CONSENT_AT: Date | string | null;
};

type RecurrenceDto = {
  id: number;
  recipientId: number;
  amount: string;
  currency: string;
  frequency: string;
  status: string;
  nextRunAt: string;
  occurrenceAt: string;
  retryCount: number;
  maxRetries: number;
  lastRunStatus: string | null;
  lastError: string | null;
  consentAt: string | null;
};

class RouteError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RouteError";
  }
}

const amountSchema = z.union([z.string().trim().min(1).max(32), z.number().finite()]);

const createSchema = z.object({
  recipientId: z.number().int().positive(),
  amount: amountSchema,
  currency: z.string().trim().length(3),
  frequency: z.enum(["weekly", "monthly", "quarterly"]),
  consent: z.literal(true),
  idempotencyKey: z.string(),
});

const patchSchema = z
  .object({
    status: z.enum(["active", "paused", "cancelled"]).optional(),
    amount: amountSchema.optional(),
    consent: z.literal(true).optional(),
  })
  .refine((value) => value.status !== undefined || value.amount !== undefined, {
    message: "Indica un estado o un importe para modificar la recurrencia.",
  });

const recurrenceColumns = `id, recipient_id, amount_minor, currency, frequency, status, next_run_at,
  occurrence_at, last_run_status, last_error, anchor_day, retry_count, consent_at`;

const router = Router();

router.get(
  "/recurrences",
  requireUser,
  route(async (request, response) => {
    const userId = currentUser(request).id;
    const result = await withConnection((connection) =>
      connection.execute<RecurrenceRow>(
        `SELECT ${recurrenceColumns} FROM cx_recurrences WHERE owner_id = :userId ORDER BY created_at DESC`,
        { userId },
      ),
    );
    response.json({ recurrences: (result.rows ?? []).map(toDto) });
  }),
);

router.post(
  "/recurrences",
  requireUser,
  route(async (request, response) => {
    const userId = currentUser(request).id;
    const parsed = createSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new RouteError(400, "Solicitud de recurrencia inválida. Se requiere consentimiento explícito.");
    }
    const input = parsed.data;
    if (!isValidIdempotencyKey(input.idempotencyKey)) {
      throw new RouteError(400, "La clave de idempotencia debe tener entre 8 y 80 caracteres válidos.");
    }
    if (input.recipientId === userId) {
      throw new RouteError(400, "No puedes programar un pago a tu propio usuario.");
    }

    const amountMinor = parsePositiveAmountMinor(input.amount);
    const currency = parseCurrency(input.currency);
    const payload = {
      recipientId: input.recipientId,
      amountMinor,
      currency,
      frequency: input.frequency,
    };

    const recurrence = await withTransaction((connection) =>
      runIdempotent(
        connection,
        { userId, scope: "rec.create", key: input.idempotencyKey, payload },
        async () => {
          const now = new Date();
          const anchorDay = anchorDayOf(now);
          const firstOccurrence = nextOccurrence(now, input.frequency, anchorDay);

          const inserted = await connection.execute(
            `INSERT INTO cx_recurrences(owner_id, recipient_id, amount_minor, currency, frequency, status,
               next_run_at, occurrence_at, anchor_day, retry_count, consent_at)
             VALUES (:userId, :recipientId, :amountMinor, :currency, :frequency, 'active',
               :firstOccurrence, :firstOccurrence, :anchorDay, 0, SYSTIMESTAMP)
             RETURNING id INTO :id`,
            {
              userId,
              recipientId: input.recipientId,
              amountMinor,
              currency,
              frequency: input.frequency,
              firstOccurrence,
              anchorDay,
              id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            },
          );

          const outBinds = inserted.outBinds;
          if (!outBinds || Array.isArray(outBinds)) {
            throw new Error("No se pudo obtener el identificador de la recurrencia creada.");
          }
          const rawId: unknown = (outBinds as Record<string, unknown>).id;
          const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
          if (!Number.isInteger(id) || id <= 0) {
            throw new Error("El identificador devuelto para la recurrencia no es válido.");
          }

          const row = await findRecurrence(connection, id, userId);
          if (!row) {
            throw new RouteError(500, "No se pudo confirmar la recurrencia creada.");
          }
          return toDto(row);
        },
      ),
    );

    response.status(201).json({
      recurrence,
      message: "Recurrencia programada correctamente.",
    });
  }),
);

router.patch(
  "/recurrences/:id",
  requireUser,
  route(async (request, response) => {
    const userId = currentUser(request).id;
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new RouteError(400, "Identificador de recurrencia inválido.");
    }

    const parsed = patchSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new RouteError(400, "Modificación de recurrencia inválida.");
    }
    const input = parsed.data;

    const updated = await withTransaction(async (connection) => {
      const result = await connection.execute<RecurrenceRow>(
        `SELECT ${recurrenceColumns} FROM cx_recurrences
          WHERE id = :id AND owner_id = :userId FOR UPDATE`,
        { id, userId },
      );
      const row = result.rows?.[0];
      if (!row) {
        throw new RouteError(404, "Recurrencia no encontrada.");
      }

      // Cancelar es terminal. Sólo se tolera repetir la cancelación sin cambios.
      if (row.STATUS === "cancelled") {
        const isReplay = input.status === "cancelled" && input.amount === undefined;
        if (isReplay) {
          return toDto(row);
        }
        throw new RouteError(409, "La recurrencia cancelada no puede modificarse ni reactivarse.");
      }

      if (input.amount !== undefined) {
        if (input.consent !== true) {
          throw new RouteError(400, "El cambio de importe requiere consentimiento explícito.");
        }
        const amountMinor = parsePositiveAmountMinor(input.amount);
        await connection.execute(
          `UPDATE cx_recurrences
              SET amount_minor = :amountMinor, consent_at = SYSTIMESTAMP
            WHERE id = :id AND owner_id = :userId`,
          { amountMinor, id, userId },
        );
      }

      if (input.status === "cancelled") {
        await connection.execute(
          `UPDATE cx_recurrences SET status = 'cancelled'
            WHERE id = :id AND owner_id = :userId`,
          { id, userId },
        );
      } else if (input.status === "paused") {
        if (row.STATUS !== "paused") {
          await connection.execute(
            `UPDATE cx_recurrences SET status = 'paused'
              WHERE id = :id AND owner_id = :userId`,
            { id, userId },
          );
        }
      } else if (input.status === "active" && row.STATUS === "paused") {
        if (!row.CONSENT_AT && input.consent !== true) throw new RouteError(400, "Reanudar esta instrucción requiere autorización explícita.");
        if (!row.CONSENT_AT) await connection.execute("UPDATE cx_recurrences SET consent_at = SYSTIMESTAMP WHERE id = :id AND owner_id = :userId", { id, userId });
        // Reanudar salta los ciclos perdidos: no se cobra backlog.
        const frequency = toFrequency(row.FREQUENCY);
        const occurrence = toDate(row.OCCURRENCE_AT ?? row.NEXT_RUN_AT);
        const anchorDay = parseAnchorDay(row.ANCHOR_DAY, occurrence);
        const next = nextFutureOccurrence(occurrence, new Date(), frequency, anchorDay);
        await connection.execute(
          `UPDATE cx_recurrences
              SET status = 'active', occurrence_at = :next, next_run_at = :next, retry_count = 0
            WHERE id = :id AND owner_id = :userId`,
          { next, id, userId },
        );
      }

      const current = await findRecurrence(connection, id, userId);
      if (!current) {
        throw new RouteError(404, "Recurrencia no encontrada.");
      }
      return toDto(current);
    });

    response.json({ recurrence: updated });
  }),
);

async function findRecurrence(
  connection: Connection,
  id: number,
  userId: number,
): Promise<RecurrenceRow | null> {
  const result = await connection.execute<RecurrenceRow>(
    `SELECT ${recurrenceColumns} FROM cx_recurrences WHERE id = :id AND owner_id = :userId`,
    { id, userId },
  );
  return result.rows?.[0] ?? null;
}

function route(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction): void => {
    handler(request, response).catch((error: unknown) => {
      if (error instanceof RouteError) {
        response.status(error.status).json({ message: error.message });
        return;
      }
      if (error instanceof IdempotencyConflictError) {
        response.status(409).json({ message: "La clave de idempotencia ya se usó con otra intención." });
        return;
      }
      if (oracleErrorNumber(error) === 2291) {
        response.status(404).json({ message: "El destinatario indicado no existe." });
        return;
      }
      next(error);
    });
  };
}

function toDto(row: RecurrenceRow): RecurrenceDto {
  return {
    id: Number(row.ID),
    recipientId: Number(row.RECIPIENT_ID),
    amount: formatMinor(row.AMOUNT_MINOR),
    currency: row.CURRENCY,
    frequency: row.FREQUENCY,
    status: row.STATUS,
    nextRunAt: toIso(row.NEXT_RUN_AT),
    occurrenceAt: toIso(row.OCCURRENCE_AT ?? row.NEXT_RUN_AT),
    retryCount: Number(row.RETRY_COUNT ?? 0),
    maxRetries: MAX_RETRIES,
    lastRunStatus: row.LAST_RUN_STATUS,
    lastError: row.LAST_ERROR === null ? null : sanitizeUserVisibleCopy(row.LAST_ERROR),
    consentAt: row.CONSENT_AT === null ? null : toIso(row.CONSENT_AT),
  };
}

/**
 * Convierte un importe decimal a unidades menores como texto.
 * `parseMinor` valida el formato decimal; aquí sólo se normaliza y se exige positivo.
 */
function parsePositiveAmountMinor(value: string | number): string {
  let minor: unknown;
  try {
    minor = parseMinor(value);
  } catch {
    throw new RouteError(400, "El importe debe ser un monto decimal positivo.");
  }
  const text = String(minor);
  if (!/^\d+$/.test(text) || Number(text) <= 0) {
    throw new RouteError(400, "El importe debe ser un monto decimal positivo.");
  }
  return text;
}

function parseCurrency(value: string): string {
  try {
    return validatedCurrency(value.toUpperCase());
  } catch {
    throw new RouteError(400, "Moneda no admitida.");
  }
}

function toFrequency(value: string): RecurrenceFrequency {
  if (!isRecurrenceFrequency(value)) {
    throw new Error(`Frecuencia de recurrencia almacenada no válida: ${value}`);
  }
  return value;
}

function parseAnchorDay(value: string | null | undefined, occurrence: Date): number {
  const parsed = value === null || value === undefined ? Number.NaN : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31 ? parsed : occurrence.getUTCDate();
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toIso(value: Date | string): string {
  return toDate(value).toISOString();
}

function oracleErrorNumber(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { errorNum?: unknown };
  return typeof candidate.errorNum === "number" ? candidate.errorNum : undefined;
}

export default router;
