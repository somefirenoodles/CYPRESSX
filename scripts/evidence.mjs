import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogPath, digest, readCatalog, renderDocuments, root, safePath, validateCatalog } from './traceability.mjs';

const reportDir = join(root, 'reports');
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const save = (file, value) => writeFileSync(join(reportDir, file), `${JSON.stringify(value, null, 2)}\n`);
export function sourceDigest() {
  const files = [catalogPath, 'package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'cypress.config.ts', 'tsconfig.json', '.node-version', 'Dockerfile', 'docker-compose.yml', '.github/workflows/main.yml'];
  function walk(directory) {
    for (const item of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${item.name}`;
      if (item.name.startsWith('.') || item.isSymbolicLink()) continue;
      if (item.isDirectory()) walk(path);
      else if (/\.(ts|svelte|css|sql|mjs|json)$/.test(path)) files.push(path);
    }
  }
  for (const directory of ['backend', 'database', 'web/src', 'cypress/e2e', 'scripts']) walk(directory);
  return digest(files.sort().map((path) => `${path}\0${readFileSync(join(root, path), 'utf8').replaceAll('\r\n', '\n')}\0`).join(''));
}

export function normalizedVitest(report) {
  return (report.testResults ?? []).flatMap((suite) => (suite.assertionResults ?? []).map((test) => ({
    runner: 'vitest', path: suite.name.replaceAll('\\', '/'),
    title: test.fullName ?? [...(test.ancestorTitles ?? []), test.title].join(' '),
    status: ({ passed: 'passed', failed: 'failed', pending: 'skipped', skipped: 'skipped', todo: 'skipped', disabled: 'skipped' })[test.status] ?? 'not_run',
  })));
}

export function resultFor(test, results) {
  if (!test.automation) return 'designed';
  const { runner, path, pattern } = test.automation;
  const matching = results.filter((result) => result.runner === runner &&
    (result.path === path || result.path.endsWith(`/${path}`)) && result.title.includes(pattern));
  if (!matching.length) return 'not_run';
  if (matching.some((result) => result.status === 'failed')) return 'failed';
  if (matching.some((result) => result.status !== 'passed')) return 'skipped';
  return 'passed';
}

export function requirementResult(requirement, tests, states) {
  const relevant = tests.filter((test) => test.criteria.some((id) => requirement.acceptance.some((criterion) => criterion.id === id)));
  if (relevant.some((test) => states[test.id] === 'failed')) return 'failed';
  const allCovered = requirement.acceptance.every((criterion) => relevant.some((test) => test.criteria.includes(criterion.id) && states[test.id] === 'passed'));
  if (allCovered && relevant.every((test) => states[test.id] === 'passed') && requirement.implementation.status === 'present' && !requirement.implementation.gaps.length) return 'verified';
  return requirement.implementation.status === 'missing' ? 'blocked' : 'unverified';
}

export function evaluateMeasurement(plan, entries, currentDigest) {
  const current = entries.filter((entry) => entry.requirementId === plan.requirementId && entry.sourceDigest === currentDigest && entry.contextId === plan.contextId);
  if (!current.length) return { status: entries.some((entry) => entry.requirementId === plan.requirementId) ? 'stale' : 'not_evaluated', samples: 0 };
  const eligible = current.filter((entry) => plan.evaluatorKinds.includes(entry.evaluatorKind));
  const samples = eligible.reduce((sum, entry) => sum + entry.sampleSize, 0);
  if (samples < plan.minSamples || plan.evaluatorKinds.some((kind) => !eligible.some((entry) => entry.evaluatorKind === kind))) return { status: 'insufficient_evidence', samples };
  const values = eligible.map((entry) => entry.value);
  const value = plan.aggregation === 'min' ? Math.min(...values) : plan.aggregation === 'max' ? Math.max(...values) : eligible.reduce((sum, entry) => sum + entry.value * entry.sampleSize, 0) / samples;
  const passed = plan.operator === '>=' ? value >= plan.target : plan.operator === '<=' ? value <= plan.target : value === plan.target;
  return { status: passed ? 'passed' : 'failed', samples, value, unit: plan.unit, evaluatorKinds: [...new Set(eligible.map((entry) => entry.evaluatorKind))] };
}

export function validateEvaluation(entry, catalog, currentDigest) {
  const plan = catalog.quality.find((item) => item.requirementId === entry.requirementId);
  const errors = [];
  if (!plan) errors.push('RNF sin plan');
  if (!['automation', 'agent', 'user'].includes(entry.evaluatorKind)) errors.push('Evaluador inválido');
  if (!/^[a-f0-9]{64}$/.test(entry.sourceDigest ?? '')) errors.push('Huella de fuentes inválida');
  if (!Number.isFinite(entry.value) || !Number.isSafeInteger(entry.sampleSize) || entry.sampleSize < 1) errors.push('Medición inválida');
  if (!entry.id || !entry.contextId || !entry.evaluator || !entry.observations || !Number.isFinite(Date.parse(entry.measuredAt))) errors.push('Contexto, fecha o responsable incompleto');
  if (plan && currentDigest === entry.sourceDigest && (entry.contextId !== plan.contextId || entry.unit !== plan.unit)) errors.push('Contexto o unidad distintos al plan');
  try { if (!existsSync(safePath(entry.evidencePath))) errors.push('Artefacto de evidencia ausente'); } catch (error) { errors.push(error.message); }
  return errors;
}

export function start() {
  const catalog = readCatalog();
  const errors = validateCatalog(catalog);
  if (errors.length) throw new Error(errors.join('\n'));
  mkdirSync(reportDir, { recursive: true });
  for (const name of ['vitest.json', 'cypress.json', 'traceability.json', 'traceability.md']) {
    const path = join(reportDir, name);
    if (existsSync(path)) unlinkSync(path);
  }
  save('run.json', {
    schemaVersion: 1, revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    sourceDigest: sourceDigest(), catalogDigest: digest(readFileSync(join(root, catalogPath))), startedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, ci: process.env.CI === 'true' },
  });
  console.log('Inicio de evidencia registrado. Las pruebas omitidas permanecen sin verificar.');
}

export function finish() {
  const run = json(join(reportDir, 'run.json'));
  if (run.sourceDigest !== sourceDigest()) throw new Error('Las fuentes cambiaron durante la ejecución; repite pnpm evidence:start y las pruebas.');
  const catalog = readCatalog();
  const results = [];
  if (existsSync(join(reportDir, 'vitest.json'))) {
    const report = json(join(reportDir, 'vitest.json'));
    if (!Number.isFinite(report.startTime) || report.startTime < Date.parse(run.startedAt)) throw new Error('Reporte Vitest anterior a la ejecución actual');
    results.push(...normalizedVitest(report));
  }
  if (existsSync(join(reportDir, 'cypress.json'))) {
    const report = json(join(reportDir, 'cypress.json'));
    if (Date.parse(report.startedAt) < Date.parse(run.startedAt)) throw new Error('Reporte Cypress anterior a la ejecución actual');
    results.push(...report.tests);
  }
  const states = Object.fromEntries(catalog.tests.map((test) => [test.id, resultFor(test, results)]));
  const measurements = [];
  const evaluationsDir = join(root, 'docs/02_pruebas/evaluaciones');
  if (existsSync(evaluationsDir)) {
    for (const file of readdirSync(evaluationsDir).filter((name) => name.endsWith('.json') && !name.endsWith('.example.json'))) {
      const entries = json(join(evaluationsDir, file));
      if (!Array.isArray(entries)) throw new Error(`${file}: se esperaba lista de mediciones`);
      for (const entry of entries) {
        const errors = validateEvaluation(entry, catalog, run.sourceDigest);
        if (errors.length) throw new Error(`${file}/${entry.id}: ${errors.join(', ')}`);
        if (measurements.some((item) => item.id === entry.id)) throw new Error(`Medición duplicada: ${entry.id}`);
        measurements.push(entry);
      }
    }
  }
  const integrityPlan = catalog.quality.find((plan) => plan.requirementId === 'RNF-MAN-01');
  if (integrityPlan) {
    const coherent = !validateCatalog(catalog).length && [...renderDocuments(catalog)].every(([path, expected]) => existsSync(join(root, path)) && readFileSync(join(root, path), 'utf8').replaceAll('\r\n', '\n') === expected);
    measurements.push({ requirementId: integrityPlan.requirementId, contextId: integrityPlan.contextId, sourceDigest: run.sourceDigest, evaluatorKind: 'automation', value: coherent ? 100 : 0, sampleSize: 1 });
  }
  const requirements = catalog.requirements.map((requirement) => ({ id: requirement.id, implementation: requirement.implementation.status, verification: requirementResult(requirement, catalog.tests, states) }));
  const quality = catalog.quality.map((plan) => ({ id: plan.requirementId, ...evaluateMeasurement(plan, measurements, run.sourceDigest) }));
  const report = { ...run, finishedAt: new Date().toISOString(), tests: states, requirements, quality };
  save('traceability.json', report);
  const markdown = `# Evidencia de trazabilidad\n\nRevisión: ${run.revision}. Huella de fuentes: ${run.sourceDigest}.\n\n| Requisito | Implementación | Verificación de esta ejecución |\n| --- | --- | --- |\n${requirements.map((item) => `| ${item.id} | ${item.implementation} | ${item.verification} |`).join('\n')}\n\n| RNF | Evaluación | Muestra |\n| --- | --- | --- |\n${quality.map((item) => `| ${item.id} | ${item.status} | ${item.samples} |`).join('\n')}\n`;
  writeFileSync(join(reportDir, 'traceability.md'), markdown);
  console.log(`Evidencia: ${Object.values(states).filter((state) => state === 'passed').length}/${catalog.tests.length} CP aprobados en esta ejecución; ${requirements.filter((item) => item.verification === 'verified').length} requisitos verificados.`);
  if (results.some((result) => result.status === 'failed') || quality.some((item) => item.status === 'failed')) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'start') start();
    else if (process.argv[2] === 'finish') finish();
    else throw new Error('Uso: node scripts/evidence.mjs start|finish');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
