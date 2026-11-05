import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../../../backend/app';
import { closePool, withConnection, withTransaction } from '../../../backend/db/oracle';
import { hashSessionToken } from '../../../backend/http/auth';

type Agent = ReturnType<typeof request.agent>;
const password = 'Sandbox-test-123';

function sessionCookie(response: request.Response): string {
  const headers = response.headers['set-cookie'];
  const cookies: string[] = Array.isArray(headers) ? headers : headers ? [headers] : [];
  const cookie = cookies.find((value) => value.startsWith('cypressx_sid='));
  if (!cookie) throw new Error('No se emitió la cookie de sesión.');
  return cookie.split(';')[0];
}

function cookieToken(cookie: string): string {
  return cookie.slice('cypressx_sid='.length);
}

async function register(agent: Agent = request.agent(app)) {
  const username = `u${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  const response = await agent.post('/api/auth/register').send({
    username,
    email: `${username}@example.test`,
    password,
    confirmPassword: password,
    firstName: 'Prueba',
    lastName: 'Seguridad',
  }).expect(201);
  return { agent, username, id: response.body.user.id as number, cookie: sessionCookie(response) };
}

async function fixture(count = 3) {
  return Promise.all(Array.from({ length: count }, () => register()));
}

async function balance(agent: Agent): Promise<string> {
  const response = await agent.get('/api/dashboard').expect(200);
  return response.body.accounts.find((account: { currency: string }) => account.currency === 'USD').balance;
}

async function userCount(username: string): Promise<number> {
  return withConnection(async (connection) => {
    const result = await connection.execute<{ TOTAL: string }>('SELECT COUNT(*) total FROM cx_users WHERE username = :username', { username });
    return Number(result.rows?.[0]?.TOTAL ?? '0');
  });
}

async function operationCount(userId: number): Promise<number> {
  return withConnection(async (connection) => {
    const result = await connection.execute<{ TOTAL: string }>('SELECT COUNT(*) total FROM cx_operations WHERE user_id = :id', { id: userId });
    return Number(result.rows?.[0]?.TOTAL ?? '0');
  });
}

function expectNoInternals(response: request.Response) {
  expect(response.text).not.toMatch(/ORA-\d{4,}|SyntaxError|\bstack\b|\bparser\b|\bbody\b|\bquery\b|SELECT\s|INSERT\s|UPDATE\s|DELETE\s/i);
}

describe.skipIf(!process.env.DB_CONNECT_STRING)('Regresiones de seguridad Oracle/Supertest', () => {
  afterAll(closePool);

  it('[CP-SEC-01] aplica headers defensivos y exige sesión en rutas privadas', async () => {
    const session = await request(app).get('/api/session').expect(200);
    expect(session.headers['x-powered-by']).toBeUndefined();
    expect(session.headers['x-content-type-options']).toBe('nosniff');
    expect(session.headers['content-security-policy']).toBeTruthy();
    expect(session.headers['x-frame-options']).toBeTruthy();
    expect(session.body).toEqual({ authenticated: false });

    for (const path of ['/api/dashboard', '/api/transactions', '/api/contacts', '/api/bank-accounts', '/api/notifications', '/api/recurrences']) {
      await request(app).get(path).expect(401);
    }
  });

  it('[CP-SEC-02] emite cookie opaca HttpOnly y persiste solo el hash de la sesión', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: `u${randomUUID().replaceAll('-', '').slice(0, 18)}`,
      email: `${randomUUID()}@example.test`,
      password,
      confirmPassword: password,
      firstName: 'Prueba',
      lastName: 'Seguridad',
    }).expect(201);
    const cookie = sessionCookie(response);
    const raw = cookieToken(cookie);
    expect(cookie.includes('cypressx_sid=')).toBe(true);
    const attributes = String(response.headers['set-cookie']);
    expect(attributes.includes('HttpOnly')).toBe(true);
    expect(attributes.includes('SameSite=Lax')).toBe(true);
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.password_hash).toBeUndefined();
    expect(response.body.user.passwordHash).toBeUndefined();

    const stored = await withConnection(async (connection) => {
      const result = await connection.execute<{ TOKEN_HASH: string; VALID: number | string; USER_ID: string }>(
        'SELECT token_hash, CASE WHEN expires_at > SYSTIMESTAMP THEN 1 ELSE 0 END valid, user_id FROM cx_sessions WHERE token_hash = :hash',
        { hash: hashSessionToken(raw) },
      );
      return result.rows?.[0];
    });
    expect(stored?.TOKEN_HASH === hashSessionToken(raw)).toBe(true);
    expect(stored?.TOKEN_HASH === raw).toBe(false);
    expect(Number(stored?.VALID)).toBe(1);
    expect(Number(stored?.USER_ID)).toBe(response.body.user.id);
  });

  it('[CP-SEC-03] rota tokens, revoca al cerrar sesión, expira y rechaza cookies inválidas', async () => {
    const user = await register();
    const login = await request.agent(app).post('/api/auth/login').send({ username: user.username, password }).expect(200);
    const loginCookie = sessionCookie(login);
    expect(cookieToken(loginCookie) === cookieToken(user.cookie)).toBe(false);

    const loggedAgent = request.agent(app);
    const logged = await loggedAgent.post('/api/auth/login').send({ username: user.username, password }).expect(200);
    const secondCookie = sessionCookie(logged);
    expect(cookieToken(secondCookie) === cookieToken(user.cookie)).toBe(false);
    await loggedAgent.post('/api/auth/logout').expect(204);
    await request(app).get('/api/dashboard').set('Cookie', secondCookie).expect(401);

    await withTransaction((connection) => connection.execute(
      "UPDATE cx_sessions SET expires_at = SYSTIMESTAMP - INTERVAL '1' SECOND WHERE user_id = :id",
      { id: user.id },
    ));
    await user.agent.get('/api/dashboard').expect(401);

    await request(app).get('/api/dashboard').set('Cookie', `cypressx_sid=${'x'.repeat(43)}`).expect(401);
    await request(app).get('/api/dashboard').set('Cookie', 'cypressx_sid=short').expect(401);

    const unknown = await request(app).post('/api/auth/login').send({ username: `u${randomUUID()}`, password }).expect(401);
    const wrong = await request(app).post('/api/auth/login').send({ username: user.username, password: 'Incorrecta-123' }).expect(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('[CP-SEC-04] neutraliza inyección en identidad, identificador y cursor', async () => {
    const user = await register();
    const injection = await request(app).post('/api/auth/login')
      .send({ username: "nobody' OR '1'='1", password: 'Incorrecta-123' })
      .expect(401);
    expectNoInternals(injection);

    const identifier = await user.agent.get('/api/transactions/1%20OR%201=1').expect(400);
    expectNoInternals(identifier);
    const cursor = await user.agent.get('/api/transactions').query({ cursor: 'no-es-json' }).expect(400);
    expectNoInternals(cursor);
  });

  it('[CP-TX-16] restringe la resolución de solicitudes al pagador y evita dobles efectos', async () => {
    const [requester, payer, third] = await fixture();
    const created = await requester.agent.post('/api/payment-requests').send({
      recipientId: payer.id,
      amount: '5.00',
      currency: 'USD',
      note: 'Roles',
      idempotencyKey: randomUUID(),
    }).expect(201);

    const detail = `/api/transactions/${created.body.id}?kind=request`;
    await requester.agent.get(detail).expect(200);
    await payer.agent.get(detail).expect(200);
    await third.agent.get(detail).expect(404);
    await request(app).get(detail).expect(401);
    await request(app).post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'accept' }).expect(401);
    await third.agent.post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'accept' }).expect(404);
    await requester.agent.post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'accept' }).expect(404);
    await payer.agent.post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'accept' }).expect(200);
    await payer.agent.post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'accept' }).expect(400);
    await payer.agent.post(`/api/payment-requests/${created.body.id}/resolve`).send({ action: 'reject' }).expect(400);

    expect(await balance(payer.agent)).toBe('2495.00');
    expect(await balance(requester.agent)).toBe('2505.00');
    expect(await balance(third.agent)).toBe('2500.00');
  });

  it('[CP-SEC-05] limita contraseñas y campos, e ignora identidades ajenas en el pago', async () => {
    const username = `u${randomUUID().replaceAll('-', '').slice(0, 18)}`;
    await request(app).post('/api/auth/register').send({
      username,
      email: `${username}@example.test`,
      password: 'ñ'.repeat(37),
      confirmPassword: 'ñ'.repeat(37),
      firstName: 'Prueba',
      lastName: 'Seguridad',
    }).expect(400);
    expect(await userCount(username)).toBe(0);

    await request(app).post('/api/auth/register').send({
      username: `u${randomUUID().replaceAll('-', '').slice(0, 18)}`.padEnd(41, 'x'),
      email: `${randomUUID()}@example.test`,
      password,
      confirmPassword: password,
      firstName: 'Prueba',
      lastName: 'Seguridad',
    }).expect(400);
    await request(app).post('/api/auth/register').send({
      username: `u${randomUUID().replaceAll('-', '').slice(0, 18)}`,
      email: `${randomUUID()}@example.test`,
      password,
      confirmPassword: password,
      firstName: 'a'.repeat(81),
      lastName: 'Seguridad',
    }).expect(400);
    await request(app).post('/api/auth/register').send({
      username: `u${randomUUID().replaceAll('-', '').slice(0, 18)}`,
      email: 'correo-invalido',
      password,
      confirmPassword: password,
      firstName: 'Prueba',
      lastName: 'Seguridad',
    }).expect(400);

    const [actor, recipient, third] = await fixture();
    await actor.agent.post('/api/payments').send({
      recipientId: recipient.id,
      amount: '1.00',
      currency: 'USD',
      idempotencyKey: randomUUID(),
      userId: third.id,
      ownerId: third.id,
    }).expect(201);
    expect(await balance(actor.agent)).toBe('2499.00');
    expect(await balance(recipient.agent)).toBe('2501.00');
    expect(await balance(third.agent)).toBe('2500.00');
  });

  it('[CP-SEC-06] rechaza importes y claves inválidas sin efectos laterales', async () => {
    const [actor, recipient] = await fixture(2);
    const before = await operationCount(actor.id);
    for (const amount of ['0', '-1', '1.001', '1e3', '1000000000000']) {
      await actor.agent.post('/api/payments').send({
        recipientId: recipient.id,
        amount,
        currency: 'USD',
        idempotencyKey: randomUUID(),
      }).expect(400);
    }
    await actor.agent.post('/api/payment-requests').send({
      recipientId: actor.id,
      amount: '1.00',
      currency: 'USD',
      note: 'Autor ajeno',
      idempotencyKey: randomUUID(),
    }).expect(400);
    await actor.agent.post('/api/payments').send({
      recipientId: recipient.id,
      amount: '1.00',
      currency: 'USD',
      idempotencyKey: 'corta',
    }).expect(400);

    expect(await operationCount(actor.id)).toBe(before);
    expect(await balance(actor.agent)).toBe('2500.00');
    expect(await balance(recipient.agent)).toBe('2500.00');
  });

  it('[CP-SEC-07] responde 400/413 ante JSON malformado o sobredimensionado sin filtrar internals', async () => {
    const malformed = await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"invalid":')
      .expect(400);
    expectNoInternals(malformed);

    const oversizedBody = JSON.stringify({ username: 'a'.repeat(40000), password });
    const oversized = await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(oversizedBody)
      .expect(413);
    expectNoInternals(oversized);
  });
});
