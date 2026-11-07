import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import oracledb from "oracledb";
import { withConnection, withTransaction } from "../db/oracle";
import { createQuote, createTransfer, parseMinor, validatedCurrency } from "../domain/payments";
import { IdempotencyConflictError, isValidIdempotencyKey, operationKey, runIdempotent } from "../domain/idempotency";
import { notify } from "../domain/notifications";
import { postJournal } from "../domain/ledger";
import { formatMinor } from "../domain/money";
import { sanitizeUserVisibleCopy } from "../domain/display-copy";
import { clearSessionCookie, currentUser, hashSessionToken, newSessionToken, requireUser, setSessionCookie } from "./auth";

const router = Router();
const idSchema = z.coerce.number().int().positive();
const passwordSchema = z.string().min(8).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
  message: "La contraseña supera el máximo de 72 bytes admitido.",
});
const authSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: passwordSchema,
});
const idempotencyKeySchema = z.string().refine(isValidIdempotencyKey, {
  message: "La clave de idempotencia debe tener de 8 a 80 caracteres alfanuméricos o . _ : -.",
});
const registerSchema = authSchema.extend({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.email().trim().max(254),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "La confirmación de la contraseña no coincide.",
  path: ["confirmPassword"],
});
const paymentSchema = z.object({
  recipientId: idSchema,
  amount: z.union([z.string(), z.number()]),
  currency: z.string(),
  quoteId: z.string().uuid().optional(),
  idempotencyKey: idempotencyKeySchema,
});
const quoteSchema = z.object({ amount: z.union([z.string(), z.number()]), fromCurrency: z.string(), toCurrency: z.string() });

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

function safeError(error: unknown, response: Response) {
  if (error instanceof Error && "status" in error && error.status === 404) {
    response.status(404).json({ message: "No se encontró la solicitud." });
    return;
  }
  if (error instanceof IdempotencyConflictError) {
    response.status(409).json({ message: error.message });
    return;
  }
  const oracleError = error as { errorNum?: number };
  if (typeof oracleError?.errorNum === "number") {
    if (oracleError.errorNum === 1) response.status(409).json({ message: "El usuario o la operación ya existe." });
    else if (oracleError.errorNum === 2291) response.status(404).json({ message: "No se encontró uno de los usuarios indicados." });
    else {
      console.error("Fallo Oracle en la API", error);
      response.status(500).json({ message: "No se pudo completar la operación." });
    }
    return;
  }
  response.status(400).json({ message: error instanceof Error ? error.message : "Solicitud inválida." });
}

router.get("/session", (request, response) => {
  response.json(request.cypressxUser ? { authenticated: true, user: request.cypressxUser } : { authenticated: false });
});

router.post("/auth/register", route(async (request, response) => {
  const input = body(registerSchema, request, response);
  if (!input) return;
  try {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const token = newSessionToken();
    const user = await withTransaction(async (connection) => {
      const result = await connection.execute(
        `INSERT INTO cx_users(username, email, password_hash, first_name, last_name)
         VALUES (:username, :email, :passwordHash, :firstName, :lastName) RETURNING id INTO :id`,
        {
          username: input.username.toLowerCase(),
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      );
      const userId = Number((result.outBinds as { id: number[] }).id[0]);
      const profile = { id: userId, username: input.username.toLowerCase(), email: input.email.toLowerCase(), firstName: input.firstName, lastName: input.lastName };
      await seedAccountAndSession(connection, userId, token);
      return profile;
    });
    setSessionCookie(response, token);
    response.status(201).json({ user, message: "Cuenta creada correctamente." });
  } catch (error) { safeError(error, response); }
}));

router.post("/auth/login", route(async (request, response) => {
  const input = body(authSchema, request, response);
  if (!input) return;
  const result = await withConnection((connection) => connection.execute<{
    ID: string; USERNAME: string; EMAIL: string; PASSWORD_HASH: string; FIRST_NAME: string; LAST_NAME: string;
  }>(
    `SELECT id, username, email, password_hash, first_name, last_name
     FROM cx_users WHERE username = :identity OR email = :identity`,
    { identity: input.username.toLowerCase() }
  ));
  const row = result.rows?.[0];
  if (!row || !(await bcrypt.compare(input.password, row.PASSWORD_HASH))) {
    response.status(401).json({ message: "Usuario o contraseña incorrectos." });
    return;
  }
  const token = newSessionToken();
  await withTransaction((connection) => insertSession(connection, Number(row.ID), token));
  setSessionCookie(response, token);
  response.json({ user: { id: Number(row.ID), username: row.USERNAME, email: row.EMAIL, firstName: row.FIRST_NAME, lastName: row.LAST_NAME } });
}));

router.post("/auth/logout", requireUser, route(async (request, response) => {
  const token = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("cypressx_sid="))?.slice("cypressx_sid=".length);
  if (token) await withTransaction((connection) => connection.execute("DELETE FROM cx_sessions WHERE token_hash = :hash", { hash: hashSessionToken(token) }).then(() => undefined));
  clearSessionCookie(response);
  response.status(204).end();
}));

router.get("/dashboard", requireUser, route(async (request, response) => {
  const user = currentUser(request);
  const [accountsResult, operationsResult, usersResult, requestsResult] = await Promise.all([
    withConnection((connection) => connection.execute<{ BALANCE_MINOR: string; CURRENCY: string }>(
      "SELECT balance_minor, currency FROM cx_accounts WHERE user_id = :id ORDER BY currency", { id: user.id }
    )),
    withConnection((connection) => connection.execute<{
      ID: string; DESCRIPTION: string; OPERATION_TYPE: string; STATUS: string; FROM_AMOUNT_MINOR: string;
      TO_AMOUNT_MINOR: string; FROM_CURRENCY: string; TO_CURRENCY: string; CREATED_AT: Date; OWNER_ID: string; MERCHANT_NAME: string | null;
    }>(
      `SELECT o.id, o.description, o.operation_type, o.status, o.from_amount_minor, o.to_amount_minor,
        o.from_currency, o.to_currency, o.created_at, o.user_id owner_id, m.name merchant_name
       FROM cx_operations o LEFT JOIN cx_merchants m ON m.id = o.merchant_id
       WHERE o.user_id = :id OR o.recipient_id = :id
       ORDER BY o.created_at DESC FETCH FIRST 100 ROWS ONLY`,
      { id: user.id }
    )),
    withConnection((connection) => connection.execute<{ ID: string; USERNAME: string; FIRST_NAME: string; LAST_NAME: string }>(
      "SELECT id, username, first_name, last_name FROM cx_users WHERE id <> :id ORDER BY first_name, last_name FETCH FIRST 100 ROWS ONLY",
      { id: user.id }
    )),
    withConnection((connection) => connection.execute<{
      ID: string; NOTE: string; AMOUNT_MINOR: string; CURRENCY: string; STATUS: string; CREATED_AT: Date;
      REQUESTER_ID: string; REQUESTER_NAME: string; PAYER_NAME: string;
    }>(
      `SELECT r.id, r.note, r.amount_minor, r.currency, r.status, r.created_at, r.requester_id,
        CASE WHEN r.requester_id = :id THEN p.first_name || ' ' || p.last_name ELSE q.first_name || ' ' || q.last_name END requester_name,
        CASE WHEN r.payer_id = :id THEN q.first_name || ' ' || q.last_name ELSE p.first_name || ' ' || p.last_name END payer_name
       FROM cx_payment_requests r JOIN cx_users p ON p.id = r.requester_id JOIN cx_users q ON q.id = r.payer_id
       WHERE r.requester_id = :id OR r.payer_id = :id ORDER BY r.created_at DESC`,
      { id: user.id }
    )),
  ]);
  const accounts = accountsResult.rows ?? [];
  const transactions = (operationsResult.rows ?? []).map((row) => {
    const outgoing = Number(row.OWNER_ID) === user.id;
    const amount = outgoing ? row.FROM_AMOUNT_MINOR : row.TO_AMOUNT_MINOR;
    const currency = outgoing ? row.FROM_CURRENCY : row.TO_CURRENCY;
    const type = ["sandbox_topup", "sandbox_inbound"].includes(row.OPERATION_TYPE) ? "funding" : row.OPERATION_TYPE === "merchant" ? "merchant" : row.OPERATION_TYPE === "recurrence" ? "recurring" : outgoing ? "sent" : "received";
    return { id: Number(row.ID), description: sanitizeUserVisibleCopy(row.DESCRIPTION), type, status: row.STATUS, amount: formatMinor(amount), currency, createdAt: row.CREATED_AT, merchantName: row.MERCHANT_NAME };
  });
  const paymentRequests = (requestsResult.rows ?? []).map((row) => ({
    id: Number(row.ID), note: row.NOTE, amount: formatMinor(row.AMOUNT_MINOR), currency: row.CURRENCY,
    status: row.STATUS, createdAt: row.CREATED_AT,
    direction: Number(row.REQUESTER_ID) === user.id ? "outgoing" : "incoming",
    counterparty: Number(row.REQUESTER_ID) === user.id ? row.PAYER_NAME : row.REQUESTER_NAME,
  }));
  const primary = accounts.find((account) => account.CURRENCY === "USD") ?? accounts[0];
  response.json({
    balance: primary ? formatMinor(primary.BALANCE_MINOR) : "0.00",
    currency: primary?.CURRENCY ?? "USD",
    accounts: accounts.map((account) => ({ currency: account.CURRENCY, balance: formatMinor(account.BALANCE_MINOR) })),
    transactions,
    paymentRequests,
    users: (usersResult.rows ?? []).map((row) => ({ id: Number(row.ID), username: row.USERNAME, firstName: row.FIRST_NAME, lastName: row.LAST_NAME })),
    transactionCount: transactions.length,
  });
}));

router.post("/fx/quotes", requireUser, route(async (request, response) => {
  const input = body(quoteSchema, request, response);
  if (!input) return;
  try {
    const quote = await withTransaction((connection) => createQuote(connection, {
      userId: currentUser(request).id,
      amount: parseMinor(input.amount),
      fromCurrency: validatedCurrency(input.fromCurrency),
      toCurrency: validatedCurrency(input.toCurrency),
    }));
    response.json(quote);
  } catch (error) { safeError(error, response); }
}));

router.post("/payments", requireUser, route(async (request, response) => {
  const input = body(paymentSchema, request, response);
  if (!input) return;
  try {
    const result = await withTransaction(async (connection) => {
      const fromCurrency = validatedCurrency(input.currency);
      let toCurrency = fromCurrency;
      if (input.quoteId) {
        const quote = await connection.execute<{ TO_CURRENCY: string }>(
          "SELECT to_currency FROM cx_fx_quotes WHERE id = :id AND user_id = :userId",
          { id: input.quoteId, userId: currentUser(request).id }
        );
        if (!quote.rows?.[0]) throw new Error("No se encontró la cotización.");
        toCurrency = validatedCurrency(quote.rows[0].TO_CURRENCY);
      }
      return createTransfer(connection, {
        userId: currentUser(request).id,
        recipientId: input.recipientId,
        amountMinor: parseMinor(input.amount),
        fromCurrency,
        toCurrency,
        quoteId: input.quoteId,
        idempotencyKey: input.idempotencyKey,
        description: "Pago a usuario",
        operationType: "p2p",
      });
    });
    response.status(201).json(result);
  } catch (error) { safeError(error, response); }
}));

router.post("/payment-requests", requireUser, route(async (request, response) => {
  const schema = z.object({ recipientId: idSchema, amount: z.union([z.string(), z.number()]), currency: z.string(), note: z.string().trim().max(160).default(""), idempotencyKey: idempotencyKeySchema });
  const input = body(schema, request, response);
  if (!input) return;
  try {
    const ownerId = currentUser(request).id;
    const amount = parseMinor(input.amount);
    const currency = validatedCurrency(input.currency);
    if (input.recipientId === ownerId) throw new Error("No puedes solicitarte dinero a ti mismo.");
    const result = await withTransaction((connection) => runIdempotent(
      connection,
      {
        userId: ownerId,
        scope: "payment_requests.create",
        key: input.idempotencyKey,
        payload: { requesterId: ownerId, payerId: input.recipientId, amountMinor: amount.toString(), currency, note: input.note },
      },
      async () => {
        const inserted = await connection.execute(
          `INSERT INTO cx_payment_requests(requester_id, payer_id, amount_minor, currency, note)
           VALUES (:requester, :payer, :amount, :currency, :note) RETURNING id INTO :id`,
          {
            requester: ownerId, payer: input.recipientId, amount: amount.toString(), currency,
            note: input.note || "Solicitud de pago", id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          }
        );
        const requestId = Number((inserted.outBinds as { id: number[] }).id[0]);
        await notify(connection, { userId: input.recipientId, eventKey: `request:${requestId}:created`, title: "Nueva solicitud de pago", message: `${formatMinor(amount)} ${currency}. ${input.note || "Solicitud de pago"}`, referenceType: "request", referenceId: requestId });
        return { id: requestId, amount: formatMinor(amount), currency, status: "pending" };
      }
    ));
    response.status(201).json({ ...result, message: "Solicitud creada." });
  } catch (error) { safeError(error, response); }
}));

router.post("/payment-requests/:id/resolve", requireUser, route(async (request, response) => {
  const id = idSchema.safeParse(request.params.id);
  const input = body(z.object({ action: z.enum(["accept", "reject"]) }), request, response);
  if (!id.success) { response.status(400).json({ message: "Identificador inválido." }); return; }
  if (!input) return;
  try {
    const resolved = await withTransaction(async (connection) => {
      const result = await connection.execute<{
        ID: string; REQUESTER_ID: string; PAYER_ID: string; AMOUNT_MINOR: string; CURRENCY: string; STATUS: string; NOTE: string;
      }>("SELECT id, requester_id, payer_id, amount_minor, currency, status, note FROM cx_payment_requests WHERE id = :id FOR UPDATE", { id: id.data });
      const req = result.rows?.[0];
      if (!req || Number(req.PAYER_ID) !== currentUser(request).id) {
        throw Object.assign(new Error("No se encontró la solicitud."), { status: 404 });
      }
      if (req.STATUS !== "pending") throw new Error("La solicitud ya fue resuelta.");
      if (input.action === "reject") {
        await connection.execute("UPDATE cx_payment_requests SET status = 'rejected', resolved_at = SYSTIMESTAMP WHERE id = :id", { id: id.data });
        await notify(connection, { userId: Number(req.REQUESTER_ID), eventKey: `request:${id.data}:rejected`, title: "Solicitud rechazada", message: "La solicitud fue rechazada; no se modificaron saldos.", referenceType: "request", referenceId: id.data });
        return { status: "rejected", message: "Solicitud rechazada; los saldos no cambiaron." };
      }
      const payment = await createTransfer(connection, {
        userId: currentUser(request).id,
        recipientId: Number(req.REQUESTER_ID),
        amountMinor: BigInt(req.AMOUNT_MINOR),
        fromCurrency: validatedCurrency(req.CURRENCY),
        toCurrency: validatedCurrency(req.CURRENCY),
        idempotencyKey: `payment-request:${id.data}`,
        idempotencyScope: "payment_requests.resolve",
        description: req.NOTE || "Solicitud de pago aceptada",
        operationType: "p2p",
      });
      await connection.execute(
        "UPDATE cx_payment_requests SET status = 'accepted', operation_id = :operationId, resolved_at = SYSTIMESTAMP WHERE id = :id",
        { operationId: payment.id, id: id.data }
      );
      return { status: "accepted", message: "Solicitud pagada." };
    });
    response.json(resolved);
  } catch (error) { safeError(error, response); }
}));

router.get("/merchants", requireUser, route(async (_request, response) => {
  const result = await withConnection((connection) => connection.execute<{ ID: string; NAME: string; CATEGORY: string; CURRENCY: string; COUNTRY_CODE: string }>(
    "SELECT id, name, category, currency, country_code FROM cx_merchants WHERE active = 'Y' ORDER BY name"
  ));
  response.json({ merchants: (result.rows ?? []).map((row) => ({ id: Number(row.ID), name: row.NAME, category: row.CATEGORY, currency: row.CURRENCY, countryCode: row.COUNTRY_CODE })) });
}));

router.post("/merchant-payments", requireUser, route(async (request, response) => {
  const input = body(z.object({ merchantId: idSchema, amount: z.union([z.string(), z.number()]), currency: z.string(), quoteId: z.string().uuid().optional(), idempotencyKey: idempotencyKeySchema }), request, response);
  if (!input) return;
  try {
    const result = await withTransaction(async (connection) => {
      const merchant = await connection.execute<{ NAME: string; CURRENCY: string }>("SELECT name, currency FROM cx_merchants WHERE id = :id AND active = 'Y'", { id: input.merchantId });
      const row = merchant.rows?.[0];
      if (!row) throw new Error("El comercio no está disponible.");
      let toCurrency = validatedCurrency(row.CURRENCY);
      if (input.quoteId) {
        const quote = await connection.execute<{ TO_CURRENCY: string }>("SELECT to_currency FROM cx_fx_quotes WHERE id = :id AND user_id = :actorId", { id: input.quoteId, actorId: currentUser(request).id });
        const quoted = quote.rows?.[0];
        if (!quoted) throw new Error("No se encontró la cotización.");
        toCurrency = validatedCurrency(quoted.TO_CURRENCY);
      }
      return createTransfer(connection, {
        userId: currentUser(request).id,
        merchantId: input.merchantId,
        amountMinor: parseMinor(input.amount),
        fromCurrency: validatedCurrency(input.currency),
        toCurrency,
        quoteId: input.quoteId,
        idempotencyKey: input.idempotencyKey,
        description: `Pago a ${row.NAME}`,
        operationType: "merchant",
      });
    });
    response.status(201).json(result);
  } catch (error) { safeError(error, response); }
}));

router.post("/sandbox/topups", requireUser, route(async (request, response) => {
  const input = body(z.object({ amount: z.union([z.string(), z.number()]), currency: z.string(), idempotencyKey: idempotencyKeySchema }), request, response);
  if (!input) return;
  try {
    const ownerId = currentUser(request).id;
    const amountMinor = parseMinor(input.amount);
    const currency = validatedCurrency(input.currency);
    const result = await withTransaction((connection) => runIdempotent(
      connection,
      {
        userId: ownerId,
        scope: "sandbox.topups",
        key: input.idempotencyKey,
        payload: { userId: ownerId, amountMinor: amountMinor.toString(), currency },
      },
      async () => {
        const legacy = await connection.execute("SELECT id FROM cx_operations WHERE user_id = :userId AND idempotency_key = :key", { userId: ownerId, key: input.idempotencyKey });
        if (legacy.rows?.length) throw new IdempotencyConflictError();
        await connection.execute(
          `MERGE INTO cx_accounts target USING (SELECT :userId user_id, :currency currency FROM dual) source
           ON (target.user_id = source.user_id AND target.currency = source.currency)
           WHEN NOT MATCHED THEN INSERT (user_id, currency, balance_minor) VALUES (source.user_id, source.currency, 0)`,
          { userId: ownerId, currency }
        );
        const accountResult = await connection.execute<{ ID: string }>("SELECT id FROM cx_accounts WHERE user_id = :userId AND currency = :currency FOR UPDATE", { userId: ownerId, currency });
        const accountId = Number(accountResult.rows?.[0]?.ID);
        if (!accountId) throw new Error("No se encontró la cuenta.");
        const operation = await connection.execute(
          `INSERT INTO cx_operations(user_id, operation_type, idempotency_key, from_currency, to_currency,
            from_amount_minor, to_amount_minor, status, description)
           VALUES (:actorId, 'sandbox_topup', :key, :currency, :currency, :amount, :amount, 'completed', 'Recarga de saldo')
           RETURNING id INTO :id`,
          { actorId: ownerId, key: operationKey("sandbox.topups", input.idempotencyKey), currency, amount: amountMinor.toString(), id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }
        );
        const operationId = Number((operation.outBinds as { id: number[] }).id[0]);
        await postJournal(connection, operationId, [
          { accountId, currency, amountMinor, type: 'sandbox_funding' },
          { accountId: null, systemAccount: `system:sandbox_funding:${currency}`, currency, amountMinor: -amountMinor, type: 'sandbox_clearing' },
        ]);
        await notify(connection, { userId: ownerId, eventKey: `operation:${operationId}:funding`, title: "Recarga de saldo", message: `${formatMinor(amountMinor)} ${currency} añadidos.`, referenceType: "operation", referenceId: operationId });
        return { id: operationId, amount: formatMinor(amountMinor), currency, message: "Recarga completada." };
      }
    ));
    response.status(201).json(result);
  } catch (error) { safeError(error, response); }
}));

async function seedAccountAndSession(connection: oracledb.Connection, userId: number, token: string) {
  const { seedOpeningBalance } = await import("../domain/payments");
  await seedOpeningBalance(connection, userId);
  await insertSession(connection, userId, token);
}

async function insertSession(connection: oracledb.Connection, userId: number, token: string) {
  await connection.execute(
    "INSERT INTO cx_sessions(token_hash, user_id, expires_at) VALUES (:hash, :userId, SYSTIMESTAMP + INTERVAL '30' DAY)",
    { hash: hashSessionToken(token), userId }
  );
}

export default router;
