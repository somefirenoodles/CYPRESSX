import { randomUUID } from "node:crypto";
import oracledb, { type Connection } from "oracledb";
import { IdempotencyConflictError, operationKey, runIdempotent } from "./idempotency";
import { notify } from "./notifications";
import { postJournal, type LedgerEntry } from "./ledger";
import { currencyPair, formatMinor, isCurrency, multiplyMinor, parseMinor, type Currency } from "./money";

type TransferInput = {
  userId: number;
  recipientId?: number;
  merchantId?: number;
  amountMinor: bigint;
  fromCurrency: Currency;
  toCurrency: Currency;
  quoteId?: string;
  idempotencyKey: string;
  idempotencyScope?: string;
  description: string;
  operationType: "p2p" | "merchant" | "recurrence" | "sandbox_topup";
};

const IDEMPOTENCY_SCOPE_BY_OPERATION: Record<TransferInput["operationType"], string> = {
  p2p: "payments.p2p",
  merchant: "payments.merchant",
  recurrence: "recurrences.run",
  sandbox_topup: "payments.topup",
};

type Account = { ID: string; BALANCE_MINOR: string };

async function ensureAccount(connection: Connection, userId: number, currency: Currency) {
  try {
    await connection.execute(
      `MERGE INTO cx_accounts target
       USING (SELECT :userId user_id, :currency currency FROM dual) source
       ON (target.user_id = source.user_id AND target.currency = source.currency)
       WHEN NOT MATCHED THEN INSERT (user_id, currency, balance_minor)
       VALUES (source.user_id, source.currency, 0)`,
      { userId, currency }
    );
  } catch (error) {
    if ((error as { errorNum?: number }).errorNum !== 1) throw error;
  }
}

async function insertOperation(connection: Connection, input: TransferInput, toAmountMinor: bigint, rate: string) {
  const result = await connection.execute(
    `INSERT INTO cx_operations (
      user_id, operation_type, idempotency_key, recipient_id, merchant_id,
      from_currency, to_currency, from_amount_minor, to_amount_minor,
      fx_rate, status, description
    ) VALUES (
      :userId, :operationType, :idempotencyKey, :recipientId, :merchantId,
      :fromCurrency, :toCurrency, :fromAmount, :toAmount,
      :rate, 'completed', :description
    ) RETURNING id INTO :id`,
    {
      userId: input.userId,
      operationType: input.operationType,
      idempotencyKey: input.idempotencyKey,
      recipientId: input.recipientId ?? null,
      merchantId: input.merchantId ?? null,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      fromAmount: input.amountMinor.toString(),
      toAmount: toAmountMinor.toString(),
      rate,
      description: input.description,
      id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    },
    { autoCommit: false }
  );
  return Number((result.outBinds as { id: number[] }).id[0]);
}

export async function createTransfer(connection: Connection, input: TransferInput) {
  const scope = input.idempotencyScope ?? IDEMPOTENCY_SCOPE_BY_OPERATION[input.operationType];
  return runIdempotent(
    connection,
    {
      userId: input.userId,
      scope,
      key: input.idempotencyKey,
      payload: {
        recipientId: input.recipientId ?? null,
        merchantId: input.merchantId ?? null,
        amountMinor: input.amountMinor.toString(),
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        quoteId: input.quoteId ?? null,
        description: input.description,
        operationType: input.operationType,
      },
    },
    async () => {
      // Old operations have no payload hash; never risk replaying their money effects.
      const legacy = await connection.execute("SELECT id FROM cx_operations WHERE user_id = :userId AND idempotency_key = :key", { userId: input.userId, key: input.idempotencyKey });
      if (legacy.rows?.length) throw new IdempotencyConflictError();
      return performTransfer(connection, { ...input, idempotencyKey: operationKey(scope, input.idempotencyKey) });
    }
  );
}

async function performTransfer(connection: Connection, input: TransferInput) {
  if (input.recipientId === input.userId) throw new Error("No puedes enviarte dinero a ti mismo.");
  if (input.fromCurrency !== input.toCurrency && !input.quoteId) throw new Error("Necesitas una cotización para convertir moneda.");
  if (input.recipientId == null && input.merchantId == null && input.operationType !== "sandbox_topup") {
    throw new Error("Debes indicar un destinatario o comercio.");
  }

  const expected = currencyPair(input.fromCurrency, input.toCurrency);
  let toAmount = input.amountMinor;
  let rate = expected.displayRate;
  if (input.quoteId) {
    const quoteResult = await connection.execute<{
      USER_ID: string; FROM_CURRENCY: Currency; TO_CURRENCY: Currency; FROM_AMOUNT_MINOR: string;
      TO_AMOUNT_MINOR: string; RATE: string; EXPIRES_AT: Date; CONSUMED_AT: Date | null;
    }>(
      `SELECT user_id, from_currency, to_currency, from_amount_minor, to_amount_minor, rate, expires_at, consumed_at
       FROM cx_fx_quotes WHERE id = :id FOR UPDATE`,
      { id: input.quoteId }
    );
    const quote = quoteResult.rows?.[0];
    if (!quote || Number(quote.USER_ID) !== input.userId || quote.CONSUMED_AT) throw new Error("La cotización no es válida o ya fue utilizada.");
    if (new Date(quote.EXPIRES_AT).getTime() <= Date.now()) throw new Error("La cotización expiró. Solicita una nueva.");
    if (quote.FROM_CURRENCY !== input.fromCurrency || quote.TO_CURRENCY !== input.toCurrency || BigInt(quote.FROM_AMOUNT_MINOR) !== input.amountMinor) {
      throw new Error("La cotización no corresponde a los datos de esta operación.");
    }
    toAmount = BigInt(quote.TO_AMOUNT_MINOR);
    rate = quote.RATE;
  }

  await ensureAccount(connection, input.userId, input.fromCurrency);
  if (input.recipientId != null) await ensureAccount(connection, input.recipientId, input.toCurrency);

  const accountIds = await connection.execute<{ ID: string; USER_ID: string; CURRENCY: Currency; BALANCE_MINOR: string }>(
    `SELECT id, user_id, currency, balance_minor FROM cx_accounts
     WHERE (user_id = :owner AND currency = :fromCurrency)
        OR (:recipient IS NOT NULL AND user_id = :recipient AND currency = :toCurrency)
     ORDER BY id`,
    {
      owner: input.userId,
      fromCurrency: input.fromCurrency,
      recipient: input.recipientId ?? null,
      toCurrency: input.toCurrency,
    }
  );
  const rows = accountIds.rows ?? [];
  const fromAccount = rows.find((row) => Number(row.USER_ID) === input.userId && row.CURRENCY === input.fromCurrency);
  const toAccount = input.recipientId == null ? undefined : rows.find((row) => Number(row.USER_ID) === input.recipientId && row.CURRENCY === input.toCurrency);
  if (!fromAccount) throw new Error("No se encontró la cuenta de origen.");
  if (input.recipientId != null && !toAccount) throw new Error("No se encontró la cuenta del destinatario.");

  if (input.merchantId != null) {
    const merchant = await connection.execute<{ ID: string; NAME: string; CURRENCY: Currency }>(
      "SELECT id, name, currency FROM cx_merchants WHERE id = :id AND active = 'Y'",
      { id: input.merchantId }
    );
    const selectedMerchant = merchant.rows?.[0];
    if (!selectedMerchant) throw new Error("El comercio no está disponible.");
    if (selectedMerchant.CURRENCY !== input.toCurrency) throw new Error("La moneda de destino debe coincidir con la del comercio.");
  }

  const operationId = await insertOperation(connection, input, toAmount, rate);
  const entries: LedgerEntry[] = [{ accountId: Number(fromAccount.ID), currency: input.fromCurrency, amountMinor: -input.amountMinor, type: 'debit' }];
  if (input.fromCurrency !== input.toCurrency) {
    entries.push({ accountId: null, systemAccount: `system:fx:${input.fromCurrency}`, currency: input.fromCurrency, amountMinor: input.amountMinor, type: 'fx_clearing' });
    entries.push({ accountId: null, systemAccount: `system:fx:${input.toCurrency}`, currency: input.toCurrency, amountMinor: -toAmount, type: 'fx_clearing' });
  }
  if (toAccount) {
    entries.push({ accountId: Number(toAccount.ID), currency: input.toCurrency, amountMinor: toAmount, type: 'credit' });
  } else if (input.merchantId != null) entries.push({ accountId: null, systemAccount: `system:merchant:${input.merchantId}:${input.toCurrency}`, currency: input.toCurrency, amountMinor: toAmount, type: 'merchant_settlement' });
  else throw new Error('No se encontró la contrapartida del pago.');
  await postJournal(connection, operationId, entries);
  if (input.quoteId) {
    await connection.execute("UPDATE cx_fx_quotes SET consumed_at = SYSTIMESTAMP WHERE id = :id", { id: input.quoteId });
  }
  await notify(connection, { userId: input.userId, eventKey: `operation:${operationId}:sent`, title: "Pago sandbox completado", message: `${formatMinor(input.amountMinor)} ${input.fromCurrency}. No se movió dinero real.`, referenceType: "operation", referenceId: operationId });
  if (input.recipientId != null) {
    await notify(connection, { userId: input.recipientId, eventKey: `operation:${operationId}:received`, title: input.idempotencyScope === "payment_requests.resolve" ? "Solicitud pagada" : "Pago sandbox recibido", message: `${formatMinor(toAmount)} ${input.toCurrency}. Fondos ficticios.`, referenceType: "operation", referenceId: operationId });
  }
  return {
    id: operationId,
    amount: formatMinor(input.amountMinor),
    currency: input.fromCurrency,
    receivedAmount: formatMinor(toAmount),
    receivedCurrency: input.toCurrency,
    status: "completed",
    description: input.description,
    message: "Operación completada en el sandbox; no se movió dinero real.",
  };
}

export async function createQuote(
  connection: Connection,
  input: { userId: number; amount: bigint; fromCurrency: Currency; toCurrency: Currency }
) {
  const pair = currencyPair(input.fromCurrency, input.toCurrency);
  const toAmount = multiplyMinor(input.amount, pair.numerator, pair.denominator);
  if (toAmount <= 0n) throw new Error("El importe es demasiado pequeño para esta conversión.");
  const quoteId = randomUUID();
  await connection.execute(
    `INSERT INTO cx_fx_quotes(id, user_id, from_currency, to_currency, from_amount_minor, to_amount_minor, rate, expires_at)
     VALUES (:id, :userId, :fromCurrency, :toCurrency, :fromAmount, :toAmount, :rate, SYSTIMESTAMP + INTERVAL '10' MINUTE)`,
    {
      id: quoteId,
      userId: input.userId,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      fromAmount: input.amount.toString(),
      toAmount: toAmount.toString(),
      rate: pair.displayRate,
    }
  );
  const timestamps = await connection.execute<{ CREATED_AT: Date; EXPIRES_AT: Date }>("SELECT created_at, expires_at FROM cx_fx_quotes WHERE id = :quoteId", { quoteId });
  return {
    quoteId,
    fromAmount: formatMinor(input.amount),
    fromCurrency: input.fromCurrency,
    toAmount: formatMinor(toAmount),
    toCurrency: input.toCurrency,
    rate: pair.displayRate,
    expiresInSeconds: 600,
    createdAt: timestamps.rows?.[0]?.CREATED_AT.toISOString(),
    expiresAt: timestamps.rows?.[0]?.EXPIRES_AT.toISOString(),
    source: "tasa fija de demostración; no es una cotización de mercado",
  };
}

export function validatedCurrency(value: unknown): Currency {
  if (!isCurrency(value)) throw new Error("Moneda no soportada por el sandbox.");
  return value;
}

export { parseMinor };

export async function seedOpeningBalance(connection: Connection, userId: number) {
  const seedKey = `welcome-funds:${userId}`;
  const existing = await connection.execute("SELECT 1 FROM cx_operations WHERE user_id = :userId AND idempotency_key = :key", {
    userId,
    key: seedKey,
  });
  if (existing.rows?.length) return;
  await ensureAccount(connection, userId, "USD");
  const accountResult = await connection.execute<Account>(
    "SELECT id, balance_minor FROM cx_accounts WHERE user_id = :userId AND currency = 'USD' FOR UPDATE",
    { userId }
  );
  const account = accountResult.rows?.[0];
  if (!account) throw new Error("No se pudo crear la cuenta sandbox.");
  const amount = 250000n;
  const operationId = await insertOperation(connection, {
    userId,
    amountMinor: amount,
    fromCurrency: "USD",
    toCurrency: "USD",
    idempotencyKey: seedKey,
    description: "Fondos iniciales de demostración",
    operationType: "sandbox_topup",
  }, amount, "1.00000000");
  await postJournal(connection, operationId, [
    { accountId: Number(account.ID), currency: 'USD', amountMinor: amount, type: 'sandbox_funding' },
    { accountId: null, systemAccount: 'system:sandbox_funding:USD', currency: 'USD', amountMinor: -amount, type: 'sandbox_clearing' },
  ]);
}
