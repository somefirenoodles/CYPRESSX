import { createHash } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { postJournal } from "../domain/ledger";
import oracledb from "oracledb";
import { z } from "zod";
import { withConnection, withTransaction } from "../db/oracle";
import { IdempotencyConflictError, isValidIdempotencyKey, runIdempotent } from "../domain/idempotency";
import { formatMinor, parseMinor } from "../domain/money";
import { notify } from "../domain/notifications";
import { validatedCurrency } from "../domain/payments";
import { calculateSplit } from "../domain/splits";
import { currentUser, requireUser } from "./auth";

const router = Router();

const idSchema = z.coerce.number().int().positive();
const idempotencyKeySchema = z.string().refine(isValidIdempotencyKey, {
  message: "La clave de idempotencia debe tener de 8 a 80 caracteres alfanuméricos o . _ : -.",
});
const shareSchema = z.object({ userId: idSchema, amount: z.union([z.string(), z.number()]) });
const splitBaseSchema = z.object({
  title: z.string().trim().min(1).max(100),
  total: z.union([z.string(), z.number()]),
  currency: z.string(),
  participantIds: z.array(idSchema).min(1).max(50),
  includeOwner: z.boolean().default(false),
  shares: z.array(shareSchema).max(51).optional(),
});
const splitPreviewSchema = splitBaseSchema;
const splitCreateSchema = splitBaseSchema.extend({ idempotencyKey: idempotencyKeySchema });
const inboundSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  currency: z.string(),
  externalReference: z.string().trim().min(8).max(80),
  sourceCountry: z.enum(["US", "CO", "CR"]),
  idempotencyKey: idempotencyKeySchema,
});

type SplitDraft = {
  total: string | number;
  participantIds: number[];
  includeOwner: boolean;
  shares?: { userId: number; amount: string | number }[];
};

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function body<T>(schema: z.ZodType<T>, request: Request, response: Response): T | undefined {
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Datos de solicitud inválidos." });
    return undefined;
  }
  return parsed.data;
}

function route(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response).catch(next);
  };
}

function safeError(error: unknown, response: Response) {
  if (error instanceof HttpError) {
    response.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof IdempotencyConflictError) {
    response.status(409).json({ message: error.message });
    return;
  }
  const oracleError = error as { errorNum?: number };
  if (typeof oracleError?.errorNum === "number") {
    if (oracleError.errorNum === 1) {
      response.status(409).json({ message: "La operación ya existe o la referencia externa está duplicada." });
    } else if (oracleError.errorNum === 2291) {
      response.status(404).json({ message: "No se encontró uno de los usuarios indicados." });
    } else {
      console.error("Fallo Oracle en la API", error);
      response.status(500).json({ message: "No se pudo completar la operación." });
    }
    return;
  }
  response.status(400).json({ message: error instanceof Error ? error.message : "Solicitud inválida." });
}

async function assertUsersExist(connection: oracledb.Connection, userIds: readonly number[]) {
  const unique = [...new Set(userIds)];
  const binds: Record<string, number> = {};
  const placeholders = unique.map((id, index) => {
    binds[`u${index}`] = id;
    return `:u${index}`;
  });
  const result = await connection.execute<{ ID: string }>(
    `SELECT id FROM cx_users WHERE id IN (${placeholders.join(", ")})`,
    binds
  );
  if ((result.rows?.length ?? 0) !== unique.length) {
    throw new HttpError(404, "No se encontró uno de los participantes indicados.");
  }
}

function allocationsFor(draft: SplitDraft, ownerId: number) {
  const totalMinor = parseMinor(draft.total);
  const shares = draft.shares?.map((share) => ({ userId: share.userId, amountMinor: parseMinor(share.amount) }));
  const allocations = calculateSplit({
    totalMinor,
    ownerId,
    participantIds: draft.participantIds,
    includeOwner: draft.includeOwner,
    shares,
  });
  return { totalMinor, allocations };
}

function inboundHash(userId: number, amountMinor: bigint, currency: string, sourceCountry: string): string {
  return createHash("sha256").update([userId, amountMinor.toString(), currency, sourceCountry].join("|")).digest("hex");
}

function inboundOperationKey(idempotencyKey: string): string {
  return createHash("sha256").update(`sandbox.inbound:${idempotencyKey}`).digest("hex");
}

function inboundDto(
  id: number,
  amount: string | bigint,
  currency: string,
  externalReference: string,
  sourceCountry: string
) {
  return {
    id,
    status: "completed" as const,
    amount: formatMinor(amount),
    currency,
    externalReference,
    sourceCountry,
    message: "Recepción registrada correctamente.",
  };
}

router.post("/splits/preview", requireUser, route(async (request, response) => {
  const input = body(splitPreviewSchema, request, response);
  if (!input) return;
  try {
    const ownerId = currentUser(request).id;
    const currency = validatedCurrency(input.currency);
    const { totalMinor, allocations } = allocationsFor(input, ownerId);
    await withConnection((connection) => assertUsersExist(connection, allocations.map((allocation) => allocation.userId)));
    response.json({
      participants: allocations.map((allocation) => ({
        userId: allocation.userId,
        amount: formatMinor(allocation.amountMinor),
        isOwner: allocation.isOwner,
      })),
      total: formatMinor(totalMinor),
      currency,
    });
  } catch (error) { safeError(error, response); }
}));

router.post("/splits", requireUser, route(async (request, response) => {
  const input = body(splitCreateSchema, request, response);
  if (!input) return;
  try {
    const ownerId = currentUser(request).id;
    const currency = validatedCurrency(input.currency);
    const { totalMinor, allocations } = allocationsFor(input, ownerId);
    const payload = {
      ownerId,
      title: input.title,
      totalMinor: totalMinor.toString(),
      currency,
      participantIds: allocations.map((allocation) => allocation.userId),
      includeOwner: input.includeOwner,
      shares: allocations.map((allocation) => ({
        userId: allocation.userId,
        amountMinor: allocation.amountMinor.toString(),
      })),
    };
    const result = await withTransaction((connection) => runIdempotent(
      connection,
      { userId: ownerId, scope: "splits.create", key: input.idempotencyKey, payload },
      async () => {
        await assertUsersExist(connection, allocations.map((allocation) => allocation.userId));
        const inserted = await connection.execute(
          `INSERT INTO cx_splits(owner_id, title, total_minor, currency)
           VALUES (:owner, :title, :total, :currency) RETURNING id INTO :id`,
          {
            owner: ownerId,
            title: input.title,
            total: totalMinor.toString(),
            currency,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          }
        );
        const splitId = Number((inserted.outBinds as { id: number[] }).id[0]);
        const requestIds: number[] = [];
        for (const allocation of allocations) {
          if (allocation.isOwner) {
            await connection.execute(
              "INSERT INTO cx_split_participants(split_id, user_id, share_minor) VALUES (:split, :actorId, :shareAmount)",
              { split: splitId, actorId: allocation.userId, shareAmount: allocation.amountMinor.toString() }
            );
            continue;
          }
          const createdRequest = await connection.execute(
            `INSERT INTO cx_payment_requests(requester_id, payer_id, amount_minor, currency, note)
             VALUES (:owner, :payer, :amount, :currency, :note) RETURNING id INTO :id`,
            {
              owner: ownerId,
              payer: allocation.userId,
              amount: allocation.amountMinor.toString(),
              currency,
              note: `División: ${input.title}`,
              id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            }
          );
          const requestId = Number((createdRequest.outBinds as { id: number[] }).id[0]);
          requestIds.push(requestId);
          await connection.execute(
            `INSERT INTO cx_split_participants(split_id, user_id, share_minor, request_id)
             VALUES (:split, :actorId, :shareAmount, :request)`,
            { split: splitId, actorId: allocation.userId, shareAmount: allocation.amountMinor.toString(), request: requestId }
          );
          await notify(connection, {
            userId: allocation.userId,
            eventKey: `split:${splitId}:${allocation.userId}`,
            title: "Nueva división de gastos",
            message: `Te solicitaron ${formatMinor(allocation.amountMinor)} ${currency} por "${input.title}".`,
            referenceType: "split",
            referenceId: splitId,
          });
        }
        return {
          id: splitId,
          participantCount: allocations.length,
          requestIds,
          participants: allocations.map((allocation) => ({
            userId: allocation.userId,
            amount: formatMinor(allocation.amountMinor),
            isOwner: allocation.isOwner,
          })),
          total: formatMinor(totalMinor),
          currency,
          message: "División creada; cada participante recibió una solicitud de pago.",
        };
      }
    ));
    response.status(201).json(result);
  } catch (error) { safeError(error, response); }
}));

router.post("/sandbox/inbound-transfers", requireUser, route(async (request, response) => {
  const input = body(inboundSchema, request, response);
  if (!input) return;
  try {
    const userId = currentUser(request).id;
    const amountMinor = parseMinor(input.amount);
    const currency = validatedCurrency(input.currency);
    const externalReference = input.externalReference;
    const sourceCountry = input.sourceCountry;
    const requestHash = inboundHash(userId, amountMinor, currency, sourceCountry);
    const result = await withTransaction((connection) => runIdempotent(
      connection,
      {
        userId,
        scope: "sandbox.inbound",
        key: input.idempotencyKey,
        payload: {
          userId,
          amountMinor: amountMinor.toString(),
          currency,
          externalReference,
          sourceCountry,
        },
      },
      async () => {
        const userLock = await connection.execute<{ ID: string }>(
          "SELECT id FROM cx_users WHERE id = :userId FOR UPDATE",
          { userId }
        );
        if (!userLock.rows?.length) throw new HttpError(404, "No se encontró el usuario de la sesión.");
        const existing = await connection.execute<{
          ID: string; OPERATION_ID: string; EXTERNAL_REFERENCE: string; SOURCE_COUNTRY: string; REQUEST_HASH: string;
        }>(
          `SELECT id, operation_id, external_reference, source_country, request_hash
           FROM cx_inbound_transfers
           WHERE user_id = :userId AND external_reference = :reference FOR UPDATE`,
          { userId, reference: externalReference }
        );
        const found = existing.rows?.[0];
        if (found) {
          if (found.REQUEST_HASH !== requestHash) {
            throw new HttpError(409, "La referencia externa ya fue usada con otros datos.");
          }
          const operation = await connection.execute<{ FROM_AMOUNT_MINOR: string; TO_CURRENCY: string }>(
            "SELECT from_amount_minor, to_currency FROM cx_operations WHERE id = :id",
            { id: Number(found.OPERATION_ID) }
          );
          const previous = operation.rows?.[0];
          return inboundDto(
            Number(found.OPERATION_ID),
            previous?.FROM_AMOUNT_MINOR ?? amountMinor.toString(),
            previous?.TO_CURRENCY ?? currency,
            found.EXTERNAL_REFERENCE,
            found.SOURCE_COUNTRY
          );
        }

        await connection.execute(
          `MERGE INTO cx_accounts target USING (SELECT :userId user_id, :currency currency FROM dual) source
           ON (target.user_id = source.user_id AND target.currency = source.currency)
           WHEN NOT MATCHED THEN INSERT (user_id, currency, balance_minor) VALUES (source.user_id, source.currency, 0)`,
          { userId, currency }
        );
        const account = await connection.execute<{ ID: string }>(
          "SELECT id FROM cx_accounts WHERE user_id = :userId AND currency = :currency FOR UPDATE",
          { userId, currency }
        );
        const accountId = Number(account.rows?.[0]?.ID);
        if (!accountId) throw new HttpError(404, "No se encontró la cuenta del usuario.");

        const operation = await connection.execute(
          `INSERT INTO cx_operations(user_id, operation_type, idempotency_key, from_currency, to_currency,
             from_amount_minor, to_amount_minor, status, description)
           VALUES (:actorId, 'sandbox_inbound', :key, :currency, :currency, :amount, :amount, 'completed', 'Recepción externa')
           RETURNING id INTO :id`,
          {
            actorId: userId,
            key: inboundOperationKey(input.idempotencyKey),
            currency,
            amount: amountMinor.toString(),
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          }
        );
        const operationId = Number((operation.outBinds as { id: number[] }).id[0]);
        await postJournal(connection, operationId, [
          { accountId, currency, amountMinor, type: 'sandbox_funding' },
          { accountId: null, systemAccount: `system:sandbox_funding:${currency}`, currency, amountMinor: -amountMinor, type: 'sandbox_clearing' },
        ]);
        await connection.execute(
          `INSERT INTO cx_inbound_transfers(user_id, operation_id, external_reference, request_hash, source_country)
           VALUES (:userId, :operation, :reference, :hash, :country)`,
          {
            userId,
            operation: operationId,
            reference: externalReference,
            hash: requestHash,
            country: sourceCountry,
          }
        );
        await notify(connection, {
          userId,
          eventKey: `inbound:${operationId}`,
          title: "Recepción externa",
          message: `Recibiste ${formatMinor(amountMinor)} ${currency} (referencia ${externalReference}).`,
          referenceType: "operation",
          referenceId: operationId,
        });
        return inboundDto(operationId, amountMinor, currency, externalReference, sourceCountry);
      }
    ));
    response.status(201).json(result);
  } catch (error) { safeError(error, response); }
}));

export default router;
