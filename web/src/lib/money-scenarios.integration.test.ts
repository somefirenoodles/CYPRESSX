import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../../../backend/app';
import { closePool, withConnection, withTransaction } from '../../../backend/db/oracle';

type Agent = ReturnType<typeof request.agent>;

const key = () => randomUUID();

async function registerUser() {
  const agent = request.agent(app);
  const username = `u${key().replaceAll('-', '').slice(0, 18)}`;
  const result = await agent.post('/api/auth/register').send({
    username,
    email: `${username}@example.test`,
    password: 'Sandbox-test-123',
    confirmPassword: 'Sandbox-test-123',
    firstName: 'Prueba',
    lastName: 'Flujo',
  }).expect(201);
  return { agent, id: result.body.user.id as number };
}

async function balance(agent: Agent) {
  return (await agent.get('/api/dashboard').expect(200)).body.accounts.find((account: { currency: string }) => account.currency === 'USD').balance as string;
}

function countOperations(userId: number) {
  return withConnection(async (connection) => (await connection.execute<{ TOTAL: string }>(
    'SELECT COUNT(*) total FROM cx_operations WHERE user_id = :id', { id: userId }
  )).rows?.[0]?.TOTAL);
}

function resolveRequest(agent: Agent, id: number, action: 'accept' | 'reject') {
  return agent.post(`/api/payment-requests/${id}/resolve`).send({ action });
}

describe.skipIf(!process.env.DB_CONNECT_STRING)('Escenarios monetarios con Oracle', () => {
  afterAll(closePool);

  it('[CP-FX-02] rechaza par inválido y cotización vencida sin mover saldos', async () => {
    const [payer, recipient] = await Promise.all([registerUser(), registerUser()]);
    expect(await balance(payer.agent)).toBe('2500.00');
    expect(await balance(recipient.agent)).toBe('2500.00');

    const invalid = await payer.agent.post('/api/fx/quotes').send({ amount: '10.00', fromCurrency: 'USD', toCurrency: 'XXX' }).expect(400);
    expect(invalid.body.message).toMatch(/Moneda no soportada/);

    const quote = await payer.agent.post('/api/fx/quotes').send({ amount: '10.00', fromCurrency: 'USD', toCurrency: 'COP' }).expect(200);
    expect(quote.body).toMatchObject({ fromAmount: '10.00', fromCurrency: 'USD', toCurrency: 'COP' });
    expect(quote.body.quoteId).toBeTruthy();
    expect(quote.body.rate).toBeTruthy();
    expect(quote.body.expiresAt).toBeTruthy();
    expect(quote.body.source).toMatch(/demostración/);

    const operationsBefore = await countOperations(payer.id);
    await withTransaction((connection) => connection.execute(
      "UPDATE cx_fx_quotes SET expires_at = SYSTIMESTAMP - INTERVAL '1' SECOND WHERE id = :id",
      { id: quote.body.quoteId }
    ));

    const expired = await payer.agent.post('/api/payments').send({
      recipientId: recipient.id,
      amount: '10.00',
      currency: 'USD',
      quoteId: quote.body.quoteId,
      idempotencyKey: key(),
    }).expect(400);
    expect(expired.body.message).toMatch(/expiró/);

    expect(await balance(payer.agent)).toBe('2500.00');
    expect(await balance(recipient.agent)).toBe('2500.00');
    expect(await countOperations(payer.id)).toBe(operationsBefore);

    const stored = await withConnection(async (connection) => (await connection.execute<{ CONSUMED_AT: Date | null }>(
      'SELECT consumed_at FROM cx_fx_quotes WHERE id = :id', { id: quote.body.quoteId }
    )).rows?.[0]);
    expect(stored?.CONSUMED_AT).toBeNull();
  });

  it('[CP-TX-15] resuelve solicitudes de forma única, consistente y sin duplicar notificaciones', async () => {
    const [requester, payer] = await Promise.all([registerUser(), registerUser()]);

    async function createRequest(amount: string) {
      const result = await requester.agent.post('/api/payment-requests').send({
        recipientId: payer.id,
        amount,
        currency: 'USD',
        note: 'Prueba',
        idempotencyKey: key(),
      }).expect(201);
      return result.body.id as number;
    }

    const acceptedId = await createRequest('5.00');
    const rejectedId = await createRequest('3.00');

    const concurrent = await Promise.all([
      resolveRequest(payer.agent, acceptedId, 'accept'),
      resolveRequest(payer.agent, acceptedId, 'accept'),
    ]);
    expect(concurrent.map((response) => response.status).sort()).toEqual([200, 400]);
    expect(concurrent.find((response) => response.status === 400)?.body.message).toMatch(/ya fue resuelta/);

    await resolveRequest(payer.agent, acceptedId, 'accept').expect(400);
    await resolveRequest(payer.agent, acceptedId, 'reject').expect(400);

    const rejected = await resolveRequest(payer.agent, rejectedId, 'reject').expect(200);
    expect(rejected.body.status).toBe('rejected');
    await resolveRequest(payer.agent, rejectedId, 'reject').expect(400);
    await resolveRequest(payer.agent, rejectedId, 'accept').expect(400);

    expect(await balance(payer.agent)).toBe('2495.00');
    expect(await balance(requester.agent)).toBe('2505.00');

    const rows = await withConnection(async (connection) => (await connection.execute<{ ID: string; STATUS: string; OPERATION_ID: string | null }>(
      'SELECT id, status, operation_id FROM cx_payment_requests WHERE id IN (:accepted, :rejected)',
      { accepted: acceptedId, rejected: rejectedId }
    )).rows ?? []);
    const acceptedRow = rows.find((row) => Number(row.ID) === acceptedId);
    const rejectedRow = rows.find((row) => Number(row.ID) === rejectedId);
    expect(acceptedRow?.STATUS).toBe('accepted');
    expect(acceptedRow?.OPERATION_ID).toBeTruthy();
    expect(rejectedRow?.STATUS).toBe('rejected');
    expect(rejectedRow?.OPERATION_ID).toBeNull();

    const operationId = Number(acceptedRow?.OPERATION_ID);
    const operationCount = await withConnection(async (connection) => (await connection.execute<{ TOTAL: string }>(
      'SELECT COUNT(*) total FROM cx_operations WHERE id = :id', { id: operationId }
    )).rows?.[0]?.TOTAL);
    const journalCount = await withConnection(async (connection) => (await connection.execute<{ TOTAL: string }>(
      'SELECT COUNT(*) total FROM cx_ledger_journals WHERE operation_id = :id', { id: operationId }
    )).rows?.[0]?.TOTAL);
    expect(operationCount).toBe('1');
    expect(journalCount).toBe('1');

    const requestEvents = (id: number) => withConnection(async (connection) => (await connection.execute<{ EVENT_KEY: string }>(
      "SELECT event_key FROM cx_notifications WHERE reference_type = 'request' AND reference_id = :id", { id }
    )).rows?.map((row) => row.EVENT_KEY) ?? []);
    expect((await requestEvents(acceptedId)).sort()).toEqual([`request:${acceptedId}:created`]);
    expect((await requestEvents(rejectedId)).sort()).toEqual([`request:${rejectedId}:created`, `request:${rejectedId}:rejected`]);

    const operationEvents = await withConnection(async (connection) => (await connection.execute<{ TOTAL: string }>(
      "SELECT COUNT(*) total FROM cx_notifications WHERE reference_type = 'operation' AND reference_id = :id", { id: operationId }
    )).rows?.[0]?.TOTAL);
    expect(operationEvents).toBe('2');
  });
});
