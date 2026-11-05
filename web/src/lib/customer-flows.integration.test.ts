import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../../../backend/app';
import { closePool, withTransaction } from '../../../backend/db/oracle';
import { processDueRecurrences } from '../../../backend/domain/recurrence-worker';

const key = () => randomUUID();
async function user() {
  const agent = request.agent(app);
  const username = `u${key().replaceAll('-', '').slice(0, 18)}`;
  const payload = { username, email: `${username}@example.test`, password: 'Sandbox-test-123', confirmPassword: 'Sandbox-test-123', firstName: 'Prueba', lastName: username };
  const result = await agent.post('/api/auth/register').send(payload).expect(201);
  return { agent, id: result.body.user.id as number, payload };
}
async function balance(agent: ReturnType<typeof request.agent>) {
  return (await agent.get('/api/dashboard').expect(200)).body.accounts.find((account: { currency: string }) => account.currency === 'USD').balance;
}
describe.skipIf(!process.env.DB_CONNECT_STRING)('Flujos personales con Oracle', () => {
  afterAll(closePool);
  it('[CP-AUT-04] valida confirmación y rechaza duplicados sin crear cuentas parciales', async () => {
    const owner = await user();
    await request(app).post('/api/auth/register').send({ ...owner.payload, username: `new${key().slice(0, 8)}`, confirmPassword: 'Diferente' }).expect(400);
    await request(app).post('/api/auth/register').send(owner.payload).expect(409);
    await request(app).get('/api/transactions').expect(401);
  });
  it('[CP-CTA-01] limita cuentas ficticias al propietario y descarta el número completo', async () => {
    const [owner, stranger] = await Promise.all([user(), user()]);
    const result = await owner.agent.post('/api/bank-accounts').send({ bankName: 'Banco demo', accountNumber: 'TEST-12345678', routingNumber: '123456789' }).expect(201);
    expect(result.body.account.last4).toBe('5678');
    expect(JSON.stringify(result.body)).not.toContain('12345678');
    await stranger.agent.patch(`/api/bank-accounts/${result.body.account.id}`).send({ status: 'disabled' }).expect(404);
    await owner.agent.patch(`/api/bank-accounts/${result.body.account.id}`).send({ status: 'disabled' }).expect(200);
    await owner.agent.post('/api/bank-accounts').send({ bankName: 'Banco demo', accountNumber: '12345678', routingNumber: '123456789' }).expect(400);
  });
  it('[CP-CON-01] crea y elimina contactos propios sin borrar usuarios', async () => {
    const [owner, contact, stranger] = await Promise.all([user(), user(), user()]);
    const result = await owner.agent.post('/api/contacts').send({ userId: contact.id }).expect(201);
    await owner.agent.post('/api/contacts').send({ userId: contact.id }).expect(409);
    await stranger.agent.delete(`/api/contacts/${result.body.contact.id}`).expect(404);
    const users = await owner.agent.get(`/api/users?search=${contact.payload.username}`).expect(200);
    expect(users.body.users.some((item: { email?: string }) => item.email !== undefined)).toBe(false);
    await owner.agent.delete(`/api/contacts/${result.body.contact.id}`).expect(204);
    await contact.agent.get('/api/dashboard').expect(200);
  });
  it('[CP-TX-09] pagina y filtra actividad propia y oculta detalle ajeno', async () => {
    const [owner, recipient, stranger] = await Promise.all([user(), user(), user()]);
    const payment = await owner.agent.post('/api/payments').send({ recipientId: recipient.id, amount: '1.00', currency: 'USD', idempotencyKey: key() }).expect(201);
    await owner.agent.post('/api/payment-requests').send({ recipientId: recipient.id, amount: '2.00', currency: 'USD', note: 'Historial', idempotencyKey: key() }).expect(201);
    const first = await owner.agent.get('/api/transactions?limit=1').expect(200);
    expect(first.body.nextCursor).toBeTypeOf('string');
    const second = await owner.agent.get(`/api/transactions?limit=1&cursor=${encodeURIComponent(first.body.nextCursor)}`).expect(200);
    expect(`${first.body.transactions[0].kind}:${first.body.transactions[0].id}`).not.toBe(`${second.body.transactions[0].kind}:${second.body.transactions[0].id}`);
    const pending = await owner.agent.get('/api/transactions?status=pending').expect(200);
    expect(pending.body.transactions).toHaveLength(1);
    expect(pending.body.transactions[0].kind).toBe('request');
    await recipient.agent.get(`/api/transactions/${payment.body.id}`).expect(200);
    const denied = await stranger.agent.get(`/api/transactions/${payment.body.id}`).expect(404);
    const absent = await stranger.agent.get('/api/transactions/999999999').expect(404);
    expect(denied.body).toEqual(absent.body);
    await owner.agent.get('/api/transactions?cursor=invalid').expect(400);
  });
  it('[CP-NOT-01] persiste eventos propios, marca lectura y no repite resoluciones', async () => {
    const [owner, payer, stranger] = await Promise.all([user(), user(), user()]);
    const created = await owner.agent.post('/api/payment-requests').send({ recipientId: payer.id, amount: '3.00', currency: 'USD', note: '', idempotencyKey: key() }).expect(201);
    const inbox = await payer.agent.get('/api/notifications').expect(200);
    const notification = inbox.body.notifications.find((item: { referenceId: number }) => item.referenceId === created.body.id);
    expect(notification.read).toBe(false);
    await stranger.agent.patch(`/api/notifications/${notification.id}`).send({ read: true }).expect(404);
    await payer.agent.patch(`/api/notifications/${notification.id}`).send({ read: true }).expect(200);
    await payer.agent.post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'reject' }).expect(200);
    const before = await owner.agent.get('/api/notifications').expect(200);
    await payer.agent.post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'accept' }).expect(400);
    expect((await owner.agent.get('/api/notifications').expect(200)).body.notifications).toEqual(before.body.notifications);
    expect(await balance(payer.agent)).toBe('2500.00');
    await stranger.agent.post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'accept' }).expect(404);
  });
  it('[CP-GAS-04] confirma reparto revisado, incluye organizador y conserva saldo', async () => {
    const [owner, first, second] = await Promise.all([user(), user(), user()]);
    const payload = { title: 'Cena', total: '30.00', currency: 'USD', participantIds: [first.id, second.id], includeOwner: false };
    const preview = await owner.agent.post('/api/splits/preview').send(payload).expect(200);
    expect(preview.body.participants.map((item: { amount: string }) => item.amount)).toEqual(['15.00', '15.00']);
    const withOwner = await owner.agent.post('/api/splits/preview').send({ ...payload, includeOwner: true }).expect(200);
    expect(withOwner.body.participants.map((item: { amount: string }) => item.amount)).toEqual(['10.00', '10.00', '10.00']);
    const command = { ...payload, idempotencyKey: key() };
    const created = await owner.agent.post('/api/splits').send(command).expect(201);
    expect(created.body.requestIds).toHaveLength(2);
    expect((await owner.agent.post('/api/splits').send(command).expect(201)).body.id).toBe(created.body.id);
    const ownerIncluded = await owner.agent.post('/api/splits').send({ ...payload, includeOwner: true, idempotencyKey: key() }).expect(201);
    expect(ownerIncluded.body.participants.find((item: { isOwner: boolean }) => item.isOwner)).toBeTruthy();
    expect(ownerIncluded.body.requestIds).toHaveLength(2);
    expect(await balance(owner.agent)).toBe('2500.00');
    await owner.agent.post('/api/splits/preview').send({ ...payload, shares: [{ userId: owner.id, amount: '1.00' }] }).expect(400);
  });
  it('[CP-GAS-05] rechaza participantes duplicados y cuotas de cero', async () => {
    const [owner, participant] = await Promise.all([user(), user()]);
    await owner.agent.post('/api/splits').send({ title: 'Inválida', total: '30.00', currency: 'USD', participantIds: [participant.id, participant.id], idempotencyKey: key() }).expect(400);
    await owner.agent.post('/api/splits/preview').send({ title: 'Inválida', total: '0.01', currency: 'USD', participantIds: [participant.id], includeOwner: true }).expect(400);
  });
  it('[CP-ING-01] recibe fondos simulados una vez por referencia externa', async () => {
    const owner = await user();
    const payload = { amount: '10.25', currency: 'USD', externalReference: key(), sourceCountry: 'US', idempotencyKey: key() };
    const first = await owner.agent.post('/api/sandbox/inbound-transfers').send(payload).expect(201);
    const replay = await owner.agent.post('/api/sandbox/inbound-transfers').send({ ...payload, idempotencyKey: key() }).expect(201);
    expect(replay.body.id).toBe(first.body.id);
    expect(first.body.mode).toBe('sandbox');
    await owner.agent.post('/api/sandbox/inbound-transfers').send({ ...payload, amount: '11.00', idempotencyKey: key() }).expect(409);
    expect(await balance(owner.agent)).toBe('2510.25');
  });
  it('[CP-REC-04] limita reintentos, exige consentimiento y mantiene cancelación terminal', async () => {
    const [owner, recipient] = await Promise.all([user(), user()]);
    const payload = { recipientId: recipient.id, amount: '999999.00', currency: 'USD', frequency: 'weekly', idempotencyKey: key() };
    await owner.agent.post('/api/recurrences').send(payload).expect(400);
    const created = await owner.agent.post('/api/recurrences').send({ ...payload, consent: true }).expect(201);
    const id = created.body.recurrence.id;
    await recipient.agent.patch(`/api/recurrences/${id}`).send({ status: 'paused' }).expect(404);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await withTransaction((connection) => connection.execute("UPDATE cx_recurrences SET next_run_at = SYSTIMESTAMP - INTERVAL '1' MINUTE WHERE id = :id", { id }));
      await processDueRecurrences();
      const row = (await owner.agent.get('/api/recurrences').expect(200)).body.recurrences.find((item: { id: number }) => item.id === id);
      expect(row.lastRunStatus).toBe('failed');
      expect(row.retryCount).toBe(attempt < 3 ? attempt + 1 : 0);
    }
    await owner.agent.patch(`/api/recurrences/${id}`).send({ amount: '1.00' }).expect(400);
    await owner.agent.patch(`/api/recurrences/${id}`).send({ status: 'cancelled' }).expect(200);
    await owner.agent.patch(`/api/recurrences/${id}`).send({ status: 'active', consent: true }).expect(409);
    expect(await balance(owner.agent)).toBe('2500.00');
  });
});
