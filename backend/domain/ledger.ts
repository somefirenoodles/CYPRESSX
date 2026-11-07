import oracledb, { type Connection } from 'oracledb';
import { hashIdempotencyPayload, IdempotencyConflictError } from './idempotency';
import { isCurrency, type Currency } from './money';

export type LedgerEntry = {
  accountId: number | null;
  systemAccount?: string;
  currency: Currency;
  amountMinor: bigint;
  type: string;
};

export function validateJournal(entries: readonly LedgerEntry[]) {
  if (entries.length < 2 || entries.length > 100) throw new Error('El asiento requiere entre 2 y 100 partidas.');
  const totals = new Map<string, bigint>();
  for (const entry of entries) {
    if (!isCurrency(entry.currency) || typeof entry.amountMinor !== 'bigint' || entry.amountMinor === 0n || !/^[a-z_]{1,24}$/.test(entry.type)) throw new Error('Partida contable inválida.');
    if (entry.accountId !== null && (!Number.isSafeInteger(entry.accountId) || entry.accountId <= 0 || entry.systemAccount)) throw new Error('Cuenta de usuario inválida.');
    if (entry.accountId === null && (!/^system:[a-z0-9_:-]+$/i.test(entry.systemAccount ?? '') || !entry.systemAccount?.endsWith(`:${entry.currency}`))) throw new Error('La contrapartida requiere una cuenta de sistema explícita en la misma moneda.');
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0n) + entry.amountMinor);
  }
  if ([...totals.values()].some((total) => total !== 0n)) throw new Error('El asiento debe cuadrar por cada moneda.');
}

const accountKey = (entry: LedgerEntry) => entry.accountId === null ? entry.systemAccount! : `account:${entry.accountId}`;
export function journalHash(entries: readonly LedgerEntry[]) {
  validateJournal(entries);
  const normalized = entries.map((entry) => ({ accountKey: accountKey(entry), currency: entry.currency, amount: entry.amountMinor.toString(), type: entry.type }));
  normalized.sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
  return hashIdempotencyPayload(normalized);
}

/** Atomic posting inside the caller's short transaction; never spans user interaction or network calls. */
export async function postJournal(connection: Connection, operationId: number, entries: readonly LedgerEntry[]) {
  if (!Number.isSafeInteger(operationId) || operationId <= 0) throw new Error('Operación contable inválida.');
  const hash = journalHash(entries);
  let journalId: number;
  try {
    const inserted = await connection.execute(
      'INSERT INTO cx_ledger_journals(operation_id, request_hash) VALUES (:operationId, :requestHash) RETURNING id INTO :journalId',
      { operationId, requestHash: hash, journalId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
    );
    journalId = Number((inserted.outBinds as { journalId: number[] }).journalId[0]);
  } catch (error) {
    if ((error as { errorNum?: number }).errorNum !== 1) throw error;
    const existing = await connection.execute<{ ID: string; REQUEST_HASH: string; STATUS: string }>('SELECT id, request_hash, status FROM cx_ledger_journals WHERE operation_id = :operationId', { operationId });
    const row = existing.rows?.[0];
    if (!row || row.REQUEST_HASH !== hash || row.STATUS !== 'posted') throw new IdempotencyConflictError();
    return { id: Number(row.ID), replay: true };
  }

  const deltas = new Map<number, { currency: Currency; delta: bigint }>();
  for (const entry of entries) {
    if (entry.accountId === null) continue;
    const prior = deltas.get(entry.accountId);
    if (prior && prior.currency !== entry.currency) throw new Error('Una cuenta no puede mezclar monedas.');
    deltas.set(entry.accountId, { currency: entry.currency, delta: (prior?.delta ?? 0n) + entry.amountMinor });
  }
  // Only accounts touched by this journal contend. Stable order prevents opposite-transfer deadlocks.
  for (const [id, posting] of [...deltas].sort(([a], [b]) => a - b)) {
    const account = await connection.execute<{ CURRENCY: string }>('SELECT currency FROM cx_accounts WHERE id = :accountId FOR UPDATE', { accountId: id });
    if (account.rows?.[0]?.CURRENCY !== posting.currency) throw new Error('Cuenta o moneda contable inválida.');
  }
  const projected = new Map<number, bigint>();
  for (const [id, posting] of deltas) {
    const actual = await connection.execute<{ BALANCE: string }>(`SELECT COALESCE(SUM(e.amount_minor), 0) AS balance FROM cx_ledger_entries e
      JOIN cx_ledger_journals j ON j.id = e.journal_id WHERE e.account_id = :accountId AND j.status = 'posted'`, { accountId: id });
    const balance = BigInt(actual.rows?.[0]?.BALANCE ?? '0') + posting.delta;
    if (balance < 0n) throw new Error('Saldo insuficiente.');
    projected.set(id, balance);
  }
  for (const entry of entries) {
    await connection.execute(
      `INSERT INTO cx_ledger_entries(journal_id, operation_id, account_id, ledger_account_key, currency, amount_minor, entry_type)
       VALUES (:journalId, :operationId, :accountId, :accountKey, :currency, :amountMinor, :entryType)`,
      { journalId, operationId, accountId: entry.accountId, accountKey: accountKey(entry), currency: entry.currency, amountMinor: entry.amountMinor.toString(), entryType: entry.type },
    );
  }
  await connection.execute("UPDATE cx_ledger_journals SET status = 'posted' WHERE id = :journalId", { journalId });
  // A rebuildable projection: never an independent source of money.
  for (const [id, balance] of projected) await connection.execute('UPDATE cx_accounts SET balance_minor = :balance, version = version + 1 WHERE id = :accountId', { balance: balance.toString(), accountId: id });
  return { id: journalId, replay: false };
}

export async function reconcileLedger(connection: Connection) {
  const unbalanced = await connection.execute(`SELECT operation_id, currency FROM cx_ledger_entries GROUP BY operation_id, currency HAVING SUM(amount_minor) <> 0`);
  const drift = await connection.execute(`SELECT a.id FROM cx_accounts a LEFT JOIN
    (SELECT account_id, SUM(amount_minor) balance FROM cx_ledger_entries WHERE account_id IS NOT NULL GROUP BY account_id) e
    ON e.account_id = a.id WHERE a.balance_minor <> COALESCE(e.balance, 0)`);
  const missing = await connection.execute(`SELECT o.id FROM cx_operations o WHERE o.status = 'completed'
    AND NOT EXISTS (SELECT 1 FROM cx_ledger_journals j WHERE j.operation_id = o.id AND j.status = 'posted')`);
  const pending = await connection.execute("SELECT id FROM cx_ledger_journals WHERE status <> 'posted'");
  return { balanced: !(unbalanced.rows?.length), projectionsMatch: !(drift.rows?.length), allCompletedPosted: !(missing.rows?.length), noPendingJournals: !(pending.rows?.length) };
}
