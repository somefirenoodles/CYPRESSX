import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { join } from 'node:path';
import { root } from './traceability.mjs';

// Called only by the disposable Oracle runner. Never receives the developer's .env.
export async function productionSmoke(image, database) {
  if (!/^[a-z0-9][a-z0-9./:_-]+$/.test(image)) throw new Error('Imagen de validación inválida.');
  const docker = (args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  let containerId;
  const checks = [];
  const startedAt = new Date().toISOString();
  const imageId = docker(['image', 'inspect', '--format', '{{.Id}}', image]);
  try {
    containerId = docker(['run', '--detach', '--publish', '127.0.0.1::3001',
      '--add-host', 'host.docker.internal:host-gateway',
      '--env', `DB_USER=${database.DB_USER}`, '--env', `DB_PASSWORD=${database.DB_PASSWORD}`,
      '--env', `DB_CONNECT_STRING=host.docker.internal:${database.port}/FREEPDB1`,
      '--env', 'DOTENV_CONFIG_PATH=/dev/null', '--env', 'COOKIE_SECURE=true', image]);
    const port = docker(['port', containerId, '3001/tcp']).split(':').at(-1);
    assert.match(port, /^\d+$/);
    const base = `http://127.0.0.1:${port}`;
    async function call(path, body, cookie) {
      return fetch(`${base}${path}`, { method: body ? 'POST' : 'GET',
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10_000) });
    }
    const deadline = Date.now() + 90_000;
    while (true) {
      try { if ((await call('/api/health')).status === 200) break; } catch { /* Startup has a fixed deadline. */ }
      if (Date.now() >= deadline) throw new Error('La imagen no inició dentro del plazo.');
      await delay(2_000);
    }
    checks.push('API conectada a Oracle y migraciones de arranque repetibles');
    const html = await call('/');
    assert.equal(html.status, 200);
    const page = await html.text();
    const assets = [...page.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map((match) => match[1]);
    assert.ok(assets.length > 0);
    for (const asset of assets) assert.equal((await call(asset)).status, 200);
    checks.push('HTML y assets del build Svelte servidos desde Express');
    async function register() {
      const username = `u${randomUUID().replaceAll('-', '').slice(0, 18)}`;
      const password = 'Sandbox-image-test-123';
      const response = await call('/api/auth/register', { username, email: `${username}@example.test`,
        password, confirmPassword: password, firstName: 'Prueba', lastName: 'Imagen' });
      assert.equal(response.status, 201);
      const header = response.headers.get('set-cookie') ?? '';
      assert.ok(header.includes('HttpOnly') && header.includes('SameSite=Lax') && header.includes('Secure'));
      return { cookie: header.split(';')[0], id: (await response.json()).user.id };
    }
    const [payer, recipient] = await Promise.all([register(), register()]);
    checks.push('Registro real y cookie con Secure/HttpOnly/SameSite en producción');
    const command = { recipientId: recipient.id, amount: '2.50', currency: 'USD', idempotencyKey: randomUUID() };
    const payment = await call('/api/payments', command, payer.cookie);
    assert.equal(payment.status, 201);
    const operationId = (await payment.json()).id;
    const replay = await call('/api/payments', command, payer.cookie);
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).id, operationId);
    for (const [user, expected] of [[payer, '2497.50'], [recipient, '2502.50']]) {
      const dashboard = await call('/api/dashboard', undefined, user.cookie);
      assert.equal(dashboard.status, 200);
      assert.equal((await dashboard.json()).accounts.find((account) => account.currency === 'USD').balance, expected);
    }
    checks.push('Pago HTTP real y replay sin doble débito, saldos exactos en Oracle');
    assert.equal((await call('/api/dashboard')).status, 401);
    assert.equal((await call('/api/no-existe')).status, 404);
    checks.push('Rutas privadas protegidas y 404 API separado del fallback SPA');
    writeFileSync(join(root, 'reports/production-smoke.json'), `${JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), image, imageId, status: 'passed', checks }, null, 2)}\n`);
    console.log(`Smoke de imagen de producción: ${checks.length} comprobaciones aprobadas.`);
  } catch {
    writeFileSync(join(root, 'reports/production-smoke.json'), `${JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), image, status: 'failed', checks }, null, 2)}\n`);
    throw new Error('Falló la prueba HTTP de la imagen de producción; no se imprimen credenciales ni cookies.');
  } finally {
    if (containerId && /^[a-f0-9]{64}$/.test(containerId)) docker(['rm', '--force', '--volumes', containerId]);
  }
}
