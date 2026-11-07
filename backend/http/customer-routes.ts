import { Router, type NextFunction, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import oracledb from "oracledb";
import { z } from "zod";
import { withConnection, withTransaction } from "../db/oracle";
import { formatMinor } from "../domain/money";
import { sanitizeUserVisibleCopy } from "../domain/display-copy";
import { currentUser, requireUser } from "./auth";

const router = Router();
const idSchema = z.coerce.number().int().positive();
const kindSchema = z.enum(["operation", "request"]);
const transactionTypeSchema = z.enum(["funding", "merchant", "recurring", "sent", "received", "request"]);
const transactionStatusSchema = z.enum(["completed", "failed", "pending", "accepted", "rejected"]);

type Kind = z.infer<typeof kindSchema>;

type TransactionRow = {
  TS_KEY: string;
  CREATED_AT: string;
  KIND: string;
  ID: string;
  DESCRIPTION: string;
  TX_TYPE: string;
  STATUS: string;
  AMOUNT_MINOR: string;
  CURRENCY: string;
  COUNTERPARTY: string;
};

type TransactionCursor = { t: string; k: Kind; i: number };
const cursorTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{9}$/;

/**
 * Unión de operaciones y solicitudes visible para el usuario autenticado.
 * Cada rama aplica el filtro de participante antes de exponer datos, y la
 * contraparte solo se resuelve con nombre (nunca correo ni identificadores
 * internos) para conservar la privacidad del listado unificado.
 */
const transactionSource = `
  SELECT
    TO_CHAR(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.FF9') AS ts_key,
    TO_CHAR(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.FF9') || 'Z' AS created_at,
    'operation' AS kind,
    o.id AS id,
    o.description AS description,
    CASE o.operation_type
      WHEN 'sandbox_topup' THEN 'funding'
      WHEN 'sandbox_inbound' THEN 'funding'
      WHEN 'merchant' THEN 'merchant'
      WHEN 'recurrence' THEN 'recurring'
      ELSE CASE WHEN o.user_id = :userId THEN 'sent' ELSE 'received' END
    END AS tx_type,
    o.status AS status,
    CASE WHEN o.user_id = :userId THEN o.from_amount_minor ELSE o.to_amount_minor END AS amount_minor,
    CASE WHEN o.user_id = :userId THEN o.from_currency ELSE o.to_currency END AS currency,
    CASE
      WHEN o.user_id = :userId AND m.name IS NOT NULL THEN m.name
      WHEN o.user_id = :userId AND recipient.id IS NOT NULL THEN recipient.first_name || ' ' || recipient.last_name
      WHEN o.user_id <> :userId AND sender.id IS NOT NULL THEN sender.first_name || ' ' || sender.last_name
      ELSE 'Usuario'
    END AS counterparty
  FROM cx_operations o
  LEFT JOIN cx_merchants m ON m.id = o.merchant_id
  LEFT JOIN cx_users sender ON sender.id = o.user_id
  LEFT JOIN cx_users recipient ON recipient.id = o.recipient_id
  WHERE o.user_id = :userId OR o.recipient_id = :userId
  UNION ALL
  SELECT
    TO_CHAR(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.FF9') AS ts_key,
    TO_CHAR(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.FF9') || 'Z' AS created_at,
    'request' AS kind,
    r.id AS id,
    CASE WHEN r.note = '' THEN 'Solicitud de pago' ELSE r.note END AS description,
    'request' AS tx_type,
    r.status AS status,
    r.amount_minor AS amount_minor,
    r.currency AS currency,
    CASE
      WHEN r.requester_id = :userId THEN payer.first_name || ' ' || payer.last_name
      ELSE requester.first_name || ' ' || requester.last_name
    END AS counterparty
  FROM cx_payment_requests r
  JOIN cx_users requester ON requester.id = r.requester_id
  JOIN cx_users payer ON payer.id = r.payer_id
  WHERE r.requester_id = :userId OR r.payer_id = :userId
`;

const listTransactionsSql = `
  SELECT ts_key, created_at, kind, id, description, tx_type, status, amount_minor, currency, counterparty
  FROM (${transactionSource}) tx
  WHERE (:type IS NULL OR tx.tx_type = :type)
    AND (:status IS NULL OR tx.status = :status)
    AND (
      :cursorTs IS NULL
      OR tx.ts_key < :cursorTs
      OR (tx.ts_key = :cursorTs AND (tx.kind < :cursorKind OR (tx.kind = :cursorKind AND tx.id < :cursorId)))
    )
  ORDER BY ts_key DESC, kind DESC, id DESC
  FETCH FIRST 51 ROWS ONLY`;

const detailTransactionSql = `
  SELECT ts_key, created_at, kind, id, description, tx_type, status, amount_minor, currency, counterparty
  FROM (${transactionSource}) tx
  WHERE tx.kind = :kind AND tx.id = :id`;

function body<T>(schema: z.ZodType<T>, request: Request, response: Response): T | undefined {
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Datos de solicitud inválidos." });
    return;
  }
  return parsed.data;
}

function route(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response).catch(next);
  };
}

function badRequest(response: Response, message = "Solicitud inválida.") {
  response.status(400).json({ message });
}

function normalizedQuery(request: Request): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(request.query)) {
    normalized[key] = value === "" ? undefined : value;
  }
  return normalized;
}

function notFound(response: Response, message = "No se encontró el recurso.") {
  response.status(404).json({ message });
}

function safeError(error: unknown, response: Response) {
  const oracleError = error as { errorNum?: number };
  if (typeof oracleError?.errorNum === "number") {
    if (oracleError.errorNum === 1) {
      response.status(409).json({ message: "El registro ya existe." });
    } else if (oracleError.errorNum === 2291) {
      response.status(404).json({ message: "No se encontró el usuario indicado." });
    } else if (oracleError.errorNum === 2292) {
      response.status(409).json({ message: "El registro está en uso." });
    } else {
      response.status(500).json({ message: "No se pudo completar la operación." });
    }
    return;
  }
  response.status(400).json({ message: error instanceof Error ? error.message : "Solicitud inválida." });
}

function encodeCursor(cursor: TransactionCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(raw: string): TransactionCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<TransactionCursor>;
    if (typeof parsed.t !== "string" || !cursorTimestampPattern.test(parsed.t)) return null;
    if (typeof parsed.i !== "number" || !Number.isInteger(parsed.i) || parsed.i <= 0) return null;
    const kind = kindSchema.safeParse(parsed.k);
    if (!kind.success) return null;
    return { t: parsed.t, k: kind.data, i: parsed.i };
  } catch {
    return null;
  }
}

function mapTransaction(row: TransactionRow) {
  return {
    id: Number(row.ID),
    kind: row.KIND === "request" ? "request" : "operation",
    description: sanitizeUserVisibleCopy(row.DESCRIPTION),
    type: row.TX_TYPE,
    status: row.STATUS,
    amount: formatMinor(row.AMOUNT_MINOR),
    currency: row.CURRENCY,
    createdAt: row.CREATED_AT,
    counterparty: row.COUNTERPARTY,
  };
}

function bankFingerprint(bankName: string, digits: string, routingNumber: string): string {
  return createHash("sha256")
    .update(`superpay-bank:${bankName.trim().toUpperCase()}:${digits}:${routingNumber}`, "utf8")
    .digest("hex");
}

router.get("/transactions", requireUser, route(async (request, response) => {
  try {
    const parsed = z.object({
      cursor: z.string().min(1).max(1024).optional(),
      limit: z.string().regex(/^\d+$/, "El límite debe ser un número entero.").optional(),
      type: transactionTypeSchema.optional(),
      status: transactionStatusSchema.optional(),
    }).safeParse(normalizedQuery(request));
    if (!parsed.success) {
      badRequest(response, parsed.error.issues[0]?.message ?? "Parámetros inválidos.");
      return;
    }
    const limit = parsed.data.limit ? Number(parsed.data.limit) : 25;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      badRequest(response, "El límite debe estar entre 1 y 50.");
      return;
    }
    const cursor = parsed.data.cursor ? decodeCursor(parsed.data.cursor) : null;
    if (parsed.data.cursor && !cursor) {
      badRequest(response, "El cursor no es válido.");
      return;
    }
    const result = await withConnection((connection) => connection.execute<TransactionRow>(listTransactionsSql, {
      userId: currentUser(request).id,
      type: parsed.data.type ?? null,
      status: parsed.data.status ?? null,
      cursorTs: cursor?.t ?? null,
      cursorKind: cursor?.k ?? null,
      cursorId: cursor?.i ?? null,
    }));
    const rows = result.rows ?? [];
    const hasMore = rows.length > limit;
    const visible = hasMore ? rows.slice(0, limit) : rows;
    const last = visible[visible.length - 1];
    const nextCursor = hasMore && last
      ? encodeCursor({ t: last.TS_KEY, k: last.KIND === "request" ? "request" : "operation", i: Number(last.ID) })
      : null;
    response.json({ transactions: visible.map(mapTransaction), nextCursor });
  } catch (error) { safeError(error, response); }
}));

router.get("/transactions/:id", requireUser, route(async (request, response) => {
  try {
    const id = idSchema.safeParse(request.params.id);
    if (!id.success) {
      badRequest(response, "Identificador inválido.");
      return;
    }
    const parsed = z.object({ kind: kindSchema.optional() }).safeParse(normalizedQuery(request));
    if (!parsed.success) {
      badRequest(response, "Tipo de transacción inválido.");
      return;
    }
    const kind: Kind = parsed.data.kind ?? "operation";
    const result = await withConnection((connection) => connection.execute<TransactionRow>(detailTransactionSql, {
      userId: currentUser(request).id,
      kind,
      id: id.data,
    }));
    const row = result.rows?.[0];
    if (!row) {
      notFound(response, "No se encontró la transacción.");
      return;
    }
    response.json({ transaction: mapTransaction(row) });
  } catch (error) { safeError(error, response); }
}));

router.get("/users", requireUser, route(async (request, response) => {
  try {
    const parsed = z.object({ search: z.string().max(80).optional() }).safeParse(request.query);
    if (!parsed.success) {
      badRequest(response, "El término de búsqueda no es válido.");
      return;
    }
    const term = (parsed.data.search ?? "").trim().toLowerCase();
    const result = await withConnection((connection) => connection.execute<{
      ID: string; USERNAME: string; FIRST_NAME: string; LAST_NAME: string;
    }>(
      `SELECT id, username, first_name, last_name
       FROM cx_users
       WHERE id <> :userId
         AND (:hasSearch = 0
           OR INSTR(LOWER(username), :term) > 0
           OR INSTR(LOWER(first_name || ' ' || last_name), :term) > 0)
       ORDER BY first_name, last_name, username
       FETCH FIRST 100 ROWS ONLY`,
      { userId: currentUser(request).id, hasSearch: term.length > 0 ? 1 : 0, term }
    ));
    response.json({
      users: (result.rows ?? []).map((row) => ({
        id: Number(row.ID),
        username: row.USERNAME,
        firstName: row.FIRST_NAME,
        lastName: row.LAST_NAME,
      })),
    });
  } catch (error) { safeError(error, response); }
}));

router.get("/contacts", requireUser, route(async (request, response) => {
  try {
    const result = await withConnection((connection) => connection.execute<{
      ID: string; USER_ID: string; USERNAME: string; FIRST_NAME: string; LAST_NAME: string;
    }>(
      `SELECT c.id, u.id user_id, u.username, u.first_name, u.last_name
       FROM cx_contacts c JOIN cx_users u ON u.id = c.contact_id
       WHERE c.owner_id = :userId
       ORDER BY u.first_name, u.last_name, u.username`,
      { userId: currentUser(request).id }
    ));
    response.json({
      contacts: (result.rows ?? []).map((row) => ({
        id: Number(row.ID),
        userId: Number(row.USER_ID),
        username: row.USERNAME,
        firstName: row.FIRST_NAME,
        lastName: row.LAST_NAME,
      })),
    });
  } catch (error) { safeError(error, response); }
}));

router.post("/contacts", requireUser, route(async (request, response) => {
  const input = body(z.object({ userId: idSchema }), request, response);
  if (!input) return;
  try {
    const ownerId = currentUser(request).id;
    if (input.userId === ownerId) {
      badRequest(response, "No puedes agregarte como contacto.");
      return;
    }
    const contact = await withTransaction(async (connection) => {
      const inserted = await connection.execute(
        `INSERT INTO cx_contacts(owner_id, contact_id) VALUES (:owner, :contact) RETURNING id INTO :id`,
        { owner: ownerId, contact: input.userId, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }
      );
      const contactId = Number((inserted.outBinds as { id: number[] }).id[0]);
      const result = await connection.execute<{ ID: string; USERNAME: string; FIRST_NAME: string; LAST_NAME: string }>(
        "SELECT id, username, first_name, last_name FROM cx_users WHERE id = :id",
        { id: input.userId }
      );
      const row = result.rows?.[0];
      if (!row) throw new Error("No se encontró el usuario.");
      return {
        id: contactId,
        userId: Number(row.ID),
        username: row.USERNAME,
        firstName: row.FIRST_NAME,
        lastName: row.LAST_NAME,
      };
    });
    response.status(201).json({ contact });
  } catch (error) { safeError(error, response); }
}));

router.delete("/contacts/:id", requireUser, route(async (request, response) => {
  try {
    const id = idSchema.safeParse(request.params.id);
    if (!id.success) {
      badRequest(response, "Identificador inválido.");
      return;
    }
    const result = await withTransaction((connection) => connection.execute(
      "DELETE FROM cx_contacts WHERE id = :id AND owner_id = :owner",
      { id: id.data, owner: currentUser(request).id }
    ));
    if (!result.rowsAffected) {
      notFound(response, "No se encontró el contacto.");
      return;
    }
    response.status(204).end();
  } catch (error) { safeError(error, response); }
}));

router.get("/bank-accounts", requireUser, route(async (request, response) => {
  try {
    const result = await withConnection((connection) => connection.execute<{
      ID: string; BANK_NAME: string; LAST4: string; STATUS: string;
    }>(
      "SELECT id, bank_name, last4, status FROM cx_bank_accounts WHERE owner_id = :userId ORDER BY created_at DESC",
      { userId: currentUser(request).id }
    ));
    response.json({
      accounts: (result.rows ?? []).map((row) => ({
        id: Number(row.ID),
        bankName: row.BANK_NAME,
        last4: row.LAST4,
        status: row.STATUS,
      })),
    });
  } catch (error) { safeError(error, response); }
}));

router.post("/bank-accounts", requireUser, route(async (request, response) => {
  const input = body(z.object({
    bankName: z.string().trim().min(2).max(100),
    accountNumber: z.string().trim().regex(/^TEST-\d{4,32}$/, "Formato de cuenta inválido."),
    routingNumber: z.string().trim().regex(/^\d{4,12}$/, "El número de ruta debe contener solo dígitos."),
  }), request, response);
  if (!input) return;
  try {
    const digits = input.accountNumber.slice("TEST-".length);
    const last4 = digits.slice(-4);
    const fingerprint = bankFingerprint(input.bankName, digits, input.routingNumber);
    const account = await withTransaction(async (connection) => {
      const inserted = await connection.execute(
        `INSERT INTO cx_bank_accounts(owner_id, bank_name, last4, fingerprint, status)
         VALUES (:owner, :bankName, :last4, :fingerprint, 'active') RETURNING id INTO :id`,
        {
          owner: currentUser(request).id,
          bankName: input.bankName,
          last4,
          fingerprint,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );
      return {
        id: Number((inserted.outBinds as { id: number[] }).id[0]),
        bankName: input.bankName,
        last4,
        status: "active",
      };
    });
    response.status(201).json({ account, message: "Cuenta registrada; solo se conservan los últimos 4 dígitos." });
  } catch (error) { safeError(error, response); }
}));

router.patch("/bank-accounts/:id", requireUser, route(async (request, response) => {
  const id = idSchema.safeParse(request.params.id);
  if (!id.success) {
    badRequest(response, "Identificador inválido.");
    return;
  }
  const input = body(z.object({ status: z.literal("disabled") }), request, response);
  if (!input) return;
  try {
    const result = await withTransaction((connection) => connection.execute(
      "UPDATE cx_bank_accounts SET status = 'disabled' WHERE id = :id AND owner_id = :owner",
      { id: id.data, owner: currentUser(request).id }
    ));
    if (!result.rowsAffected) {
      notFound(response, "No se encontró la cuenta bancaria.");
      return;
    }
    response.json({ id: id.data, status: "disabled" });
  } catch (error) { safeError(error, response); }
}));

router.get("/notifications", requireUser, route(async (request, response) => {
  try {
    const userId = currentUser(request).id;
    const [notificationsResult, unreadResult] = await Promise.all([
      withConnection((connection) => connection.execute<{
        ID: string; TITLE: string; MESSAGE: string; REFERENCE_TYPE: string | null;
        REFERENCE_ID: string | null; IS_READ: string | number; CREATED_AT: string;
      }>(
        `SELECT id, title, message, reference_type, reference_id,
           CASE WHEN read_at IS NULL THEN 0 ELSE 1 END AS is_read,
           TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.FF9') || 'Z' AS created_at
         FROM cx_notifications
         WHERE recipient_id = :userId
         ORDER BY created_at DESC
         FETCH FIRST 100 ROWS ONLY`,
        { userId }
      )),
      withConnection((connection) => connection.execute<{ UNREAD: string | number }>(
        "SELECT COUNT(*) AS unread FROM cx_notifications WHERE recipient_id = :userId AND read_at IS NULL",
        { userId }
      )),
    ]);
    response.json({
      notifications: (notificationsResult.rows ?? []).map((row) => ({
        id: Number(row.ID),
        title: sanitizeUserVisibleCopy(row.TITLE),
        message: sanitizeUserVisibleCopy(row.MESSAGE),
        referenceType: row.REFERENCE_TYPE,
        referenceId: row.REFERENCE_ID === null ? null : Number(row.REFERENCE_ID),
        read: Number(row.IS_READ) === 1,
        createdAt: row.CREATED_AT,
      })),
      unreadCount: Number(unreadResult.rows?.[0]?.UNREAD ?? 0),
    });
  } catch (error) { safeError(error, response); }
}));

router.patch("/notifications/:id", requireUser, route(async (request, response) => {
  const id = idSchema.safeParse(request.params.id);
  if (!id.success) {
    badRequest(response, "Identificador inválido.");
    return;
  }
  const input = body(z.object({ read: z.literal(true) }), request, response);
  if (!input) return;
  try {
    const result = await withTransaction((connection) => connection.execute(
      `UPDATE cx_notifications SET read_at = COALESCE(read_at, SYSTIMESTAMP)
       WHERE id = :id AND recipient_id = :userId`,
      { id: id.data, userId: currentUser(request).id }
    ));
    if (!result.rowsAffected) {
      notFound(response, "No se encontró la notificación.");
      return;
    }
    response.json({ id: id.data, read: true });
  } catch (error) { safeError(error, response); }
}));

export default router;
