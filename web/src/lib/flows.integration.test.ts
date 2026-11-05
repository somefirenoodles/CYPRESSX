import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../../../backend/app';
import { closePool, withConnection, withTransaction } from '../../../backend/db/oracle';
import { createTransfer } from '../../../backend/domain/payments';
import { postJournal, reconcileLedger, type LedgerEntry } from '../../../backend/domain/ledger';

async function fixture() {
  async function register() {
    const agent = request.agent(app), username = `u${randomUUID().replaceAll('-', '').slice(0, 16)}`;
    const response = await agent.post('/api/auth/register').send({ username, email: `${username}@example.test`, password: 'Sandbox-test-123', confirmPassword: 'Sandbox-test-123', firstName: 'Prueba', lastName: 'Sandbox' }).expect(201);
    return { agent, id: response.body.user.id as number };
  }
  return Promise.all([register(), register()]);
}
async function balance(agent: ReturnType<typeof request.agent>) { return (await agent.get('/api/dashboard').expect(200)).body.accounts.find((a: { currency: string }) => a.currency === 'USD').balance; }
const payment = (agent: ReturnType<typeof request.agent>, recipientId: number, amount: string, key = randomUUID()) => agent.post('/api/payments').send({ recipientId, amount, currency: 'USD', idempotencyKey: key });

describe.skipIf(!process.env.DB_CONNECT_STRING)('Garantías Oracle del ledger', () => {
  afterAll(closePool);
  it('[CP-LED-06] conserva saldo y partidas anteriores al actualizar el esquema', async (context) => {
    const result = await withConnection((connection) => connection.execute<{ STATUS: string; ENTRY_COUNT: string; SUM_MINOR: string; BALANCE_MINOR: string }>(`SELECT j.status, COUNT(e.id) entry_count, SUM(e.amount_minor) sum_minor, a.balance_minor
      FROM cx_users u JOIN cx_accounts a ON a.user_id=u.id JOIN cx_operations o ON o.user_id=u.id
      JOIN cx_ledger_journals j ON j.operation_id=o.id JOIN cx_ledger_entries e ON e.journal_id=j.id
      WHERE u.username='legacy_upgrade_fixture' GROUP BY j.status,a.balance_minor`));
    if (!result.rows?.length) { context.skip(); return; }
    expect(result.rows[0]).toMatchObject({ STATUS: 'posted', ENTRY_COUNT: '2', SUM_MINOR: '0', BALANCE_MINOR: '12345' });
  });
  it('[CP-IDEM-04] deduplica una intención y permite intenciones concurrentes distintas', async () => {
    const [payer, recipient] = await fixture(), key = randomUUID();
    const responses = await Promise.all([payment(payer.agent, recipient.id, '20.00', key), payment(payer.agent, recipient.id, '20.00', key)]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    expect(responses[0].body.id).toBe(responses[1].body.id);
    expect(await balance(payer.agent)).toBe('2480.00');
    await payment(payer.agent, recipient.id, '21.00', key).expect(409);
    await payer.agent.post('/api/sandbox/topups').send({ amount: '5.00', currency: 'USD', idempotencyKey: key }).expect(201);
    const separate = await Promise.all([payment(payer.agent, recipient.id, '1.00'), payment(payer.agent, recipient.id, '2.00')]);
    expect(separate.map((r) => r.status)).toEqual([201, 201]);
    expect(await balance(payer.agent)).toBe('2482.00');
    expect(await balance(recipient.agent)).toBe('2523.00');
    const opposite = await Promise.all([payment(payer.agent, recipient.id, '1.00'), payment(recipient.agent, payer.id, '2.00')]);
    expect(opposite.map((response) => response.status)).toEqual([201, 201]);
    expect(await balance(payer.agent)).toBe('2483.00');
    expect(await balance(recipient.agent)).toBe('2522.00');
  });
  it('[CP-TX-17] revierte asientos, proyecciones, claves y notificaciones al fallar', async () => {
    const [payer, recipient] = await fixture();
    const notificationCount = () => withConnection(async (c) => (await c.execute<{ TOTAL: string }>('SELECT COUNT(*) total FROM cx_notifications WHERE recipient_id = :id', { id: recipient.id })).rows?.[0]?.TOTAL);
    const before = await notificationCount();
    await expect(withTransaction(async (c) => {
      await createTransfer(c, { userId: payer.id, recipientId: recipient.id, amountMinor: 100n, fromCurrency: 'USD', toCurrency: 'USD', idempotencyKey: randomUUID(), description: 'Rollback fixture', operationType: 'p2p' });
      throw new Error('falloinyectado');
    })).rejects.toThrow('falloinyectado');
    expect(await balance(payer.agent)).toBe('2500.00');
    expect(await balance(recipient.agent)).toBe('2500.00');
    expect(await notificationCount()).toBe(before);
    expect(Object.values(await withConnection(reconcileLedger)).every(Boolean)).toBe(true);
  });
  it('[CP-LED-04] impide mutar o ampliar asientos contabilizados y verifica replay', async () => {
    const [payer, recipient] = await fixture();
    const result = await payment(payer.agent, recipient.id, '1.00').expect(201), operationId = result.body.id;
    const journal = await withConnection(async (c) => (await c.execute<{ ID: string }>('SELECT id FROM cx_ledger_journals WHERE operation_id = :id', { id: operationId })).rows![0]);
    await expect(withTransaction((c) => c.execute('UPDATE cx_ledger_entries SET amount_minor = amount_minor + 1 WHERE operation_id = :id', { id: operationId }))).rejects.toThrow(/ORA-20001/);
    await expect(withTransaction((c) => c.execute('DELETE FROM cx_ledger_journals WHERE id = :id', { id: journal.ID }))).rejects.toThrow(/ORA-20001/);
    await expect(withTransaction((c) => c.execute("INSERT INTO cx_ledger_entries(journal_id,operation_id,ledger_account_key,currency,amount_minor,entry_type) VALUES (:journalId,:operationId,'system:test:USD','USD',1,'test')", { journalId: journal.ID, operationId }))).rejects.toThrow(/ORA-20001/);
    const rows = await withConnection(async (c) => (await c.execute<{ ID: string; USER_ID: string }>("SELECT id,user_id FROM cx_accounts WHERE currency='USD' AND user_id IN (:payer,:recipient)", { payer: payer.id, recipient: recipient.id })).rows!);
    const entries: LedgerEntry[] = rows.map((row) => ({ accountId: Number(row.ID), currency: 'USD', amountMinor: Number(row.USER_ID) === payer.id ? -100n : 100n, type: Number(row.USER_ID) === payer.id ? 'debit' : 'credit' }));
    expect((await withTransaction((c) => postJournal(c, operationId, entries))).replay).toBe(true);
    await expect(withTransaction((c) => postJournal(c, operationId, entries.map((e) => ({ ...e, amountMinor: e.amountMinor * 2n }))))).rejects.toThrow('idempotencia');
    expect(Object.values(await withConnection(reconcileLedger)).every(Boolean)).toBe(true);
  });
  it('[CP-LED-05] autoriza con el ledger y evita sobregiro concurrente', async () => {
    const [payer, recipient] = await fixture();
    await withTransaction((c) => c.execute("UPDATE cx_accounts SET balance_minor=0 WHERE user_id=:id AND currency='USD'", { id: payer.id }));
    const responses = await Promise.all([payment(payer.agent, recipient.id, '1500.00'), payment(payer.agent, recipient.id, '1500.00')]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await balance(payer.agent)).toBe('1000.00');
    expect(await balance(recipient.agent)).toBe('4000.00');
    expect(Object.values(await withConnection(reconcileLedger)).every(Boolean)).toBe(true);
  });
});
