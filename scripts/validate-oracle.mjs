import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { root } from './traceability.mjs';
import { productionSmoke } from './production-smoke.mjs';

// This disposable database never reads the developer's .env or reuses application data.
const containerName = `superpay-validation-${Date.now()}`;
const password = randomBytes(24).toString('hex');
const image = 'gvenzl/oracle-free:23.26.3-slim-faststart';
let containerId;
const docker = (args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function run(file, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd: root, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Falló ${file} (código ${code}).`)));
  });
}

try {
  console.log('Creando Oracle desechable de validación, con datos y credenciales sintéticos.');
  containerId = docker(['run', '--detach', '--name', containerName, '--publish', '127.0.0.1::1521',
    '--env', `ORACLE_PASSWORD=${password}`, '--env', 'APP_USER=SUPERPAY_VALIDATION', '--env', `APP_USER_PASSWORD=${password}`,
    '--health-cmd', 'healthcheck.sh', '--health-interval', '5s', '--health-timeout', '5s', '--health-retries', '40', image]);
  const deadline = Date.now() + 240_000;
  while (docker(['inspect', '--format', '{{.State.Health.Status}}', containerId]) !== 'healthy') {
    if (Date.now() >= deadline) throw new Error('Oracle no estuvo saludable dentro del plazo de validación.');
    await delay(3_000);
  }
  const port = docker(['port', containerId, '1521/tcp']).split(':').at(-1);
  if (!/^\d+$/.test(port)) throw new Error('No se pudo identificar el puerto aislado de Oracle.');
  const env = { ...process.env, NODE_ENV: 'test', COOKIE_SECURE: 'false', SUPERPAY_TEST_DATABASE: 'disposable',
    DOTENV_CONFIG_PATH: process.platform === 'win32' ? 'NUL' : '/dev/null',
    DB_USER: 'SUPERPAY_VALIDATION', DB_PASSWORD: password, DB_CONNECT_STRING: `127.0.0.1:${port}/FREEPDB1` };
  await run('scripts/evidence.mjs', ['start'], env);
  await run('node_modules/tsx/dist/cli.mjs', ['backend/db/prepare-upgrade-fixture.ts'], env);
  await run('node_modules/tsx/dist/cli.mjs', ['backend/db/migrate.ts'], env);
  await run('node_modules/tsx/dist/cli.mjs', ['backend/db/seed.ts'], env);
  await run('node_modules/vitest/vitest.mjs', ['run', '--reporter=default', '--reporter=json', '--outputFile=../reports/vitest.json'], env);
  if (process.env.SUPERPAY_TEST_IMAGE) {
    await productionSmoke(process.env.SUPERPAY_TEST_IMAGE, { DB_USER: env.DB_USER, DB_PASSWORD: password, port });
  }
  await run('node_modules/tsx/dist/cli.mjs', ['backend/db/reconcile.ts'], env);
} catch (error) {
  // Docker errors may contain the invocation environment; print only our controlled message.
  console.error(error?.message?.startsWith('Falló ') || error?.message?.startsWith('Oracle ') ? error.message : 'No se pudo completar la validación Oracle aislada.');
  process.exitCode = 1;
} finally {
  if (containerId && /^[a-f0-9]{64}$/.test(containerId)) {
    try { docker(['rm', '--force', '--volumes', containerId]); console.log('Oracle desechable retirado; no se conservaron datos ni credenciales de prueba.'); }
    catch { console.error(`No se pudo retirar el contenedor de validación ${containerName}.`); process.exitCode = 1; }
  }
}
