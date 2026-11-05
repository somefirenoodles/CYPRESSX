import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readCatalog, renderDocuments, safePath, validateCatalog } from './traceability.mjs';
import { evaluateMeasurement, normalizedVitest, requirementResult, resultFor, validateEvaluation } from './evidence.mjs';

test('el catálogo tiene referencias completas y vistas deterministas', () => {
  const catalog = readCatalog();
  assert.deepEqual(validateCatalog(catalog), []);
  assert.deepEqual([...renderDocuments(catalog)], [...renderDocuments(structuredClone(catalog))]);
});
test('rechaza IDs repetidos, criterios sin prueba, CU incompletos y referencias rotas', () => {
  const catalog = readCatalog();
  catalog.tests.push(structuredClone(catalog.tests[0]));
  catalog.requirements[0].acceptance.push({ id: `${catalog.requirements[0].id}-A99`, text: 'Nuevo criterio sin prueba.' });
  catalog.requirements[0].useCases.push('CU-NO-99');
  catalog.useCases[0].failure = '';
  const errors = validateCatalog(catalog).join('\n');
  for (const expected of ['ID duplicado', 'sin caso de prueba', 'referencia inexistente', 'CU incompleto']) assert.ok(errors.includes(expected), expected);
});
test('no permite leer secretos, escapar del proyecto ni enlazar suites ficticias', () => {
  for (const path of ['.env', '../secret', 'backend/../../secret', 'C:\\secret', '/secret', 'node_modules/secret']) assert.throws(() => safePath(path));
  const catalog = readCatalog();
  catalog.tests[0].automation = { runner: 'vitest', path: 'web/src/lib/money.test.ts', pattern: 'UN_TITULO_INEXISTENTE' };
  assert.ok(validateCatalog(catalog).some((error) => error.includes('título no encontrado')));
});
test('distingue pruebas omitidas, fallidas, no ejecutadas y diseños sin automatizar', () => {
  const testCase = { automation: { runner: 'vitest', path: 'web/test.ts', pattern: '[CP-01]' } };
  const result = { runner: 'vitest', path: 'C:/project/web/test.ts', title: 'suite [CP-01] ejemplo', status: 'passed' };
  assert.equal(resultFor(testCase, [result]), 'passed');
  assert.equal(resultFor(testCase, [{ ...result, status: 'skipped' }]), 'skipped');
  assert.equal(resultFor(testCase, [{ ...result, status: 'failed' }]), 'failed');
  assert.equal(resultFor(testCase, []), 'not_run');
  assert.equal(resultFor({ automation: null }, [result]), 'designed');
  assert.equal(resultFor(testCase, [{ ...result, path: 'web/another.ts' }]), 'not_run');
});
test('ningún requisito se verifica con brechas o escenarios sin ejecutar', () => {
  const req = { acceptance: [{ id: 'A' }], implementation: { status: 'present', gaps: [] } };
  const tests = [{ id: 'positive', criteria: ['A'] }, { id: 'negative', criteria: ['A'] }];
  assert.equal(requirementResult(req, tests, { positive: 'passed', negative: 'not_run' }), 'unverified');
  assert.equal(requirementResult(req, tests, { positive: 'passed', negative: 'passed' }), 'verified');
  assert.equal(requirementResult({ ...req, implementation: { status: 'partial', gaps: ['Pendiente'] } }, tests, { positive: 'passed', negative: 'passed' }), 'unverified');
  assert.equal(requirementResult(req, tests, { positive: 'passed', negative: 'failed' }), 'failed');
});
test('normaliza resultados Vitest y conserva las pruebas omitidas', () => {
  const results = normalizedVitest({ testResults: [{ name: 'C:\\project\\web\\test.ts', assertionResults: [{ fullName: '[CP-01] prueba', status: 'pending' }] }] });
  assert.equal(results[0].status, 'skipped');
  assert.equal(results[0].path, 'C:/project/web/test.ts');
});
test('una evaluación de agente jamás sustituye a una muestra de usuarios finales', () => {
  const plan = { requirementId: 'RNF-USO-01', contextId: 'usuarios-v1', evaluatorKinds: ['user'], minSamples: 10, aggregation: 'min', operator: '>=', target: 90, unit: '%' };
  const entry = { requirementId: plan.requirementId, sourceDigest: 'current', contextId: plan.contextId, evaluatorKind: 'agent', sampleSize: 100, value: 100 };
  assert.equal(evaluateMeasurement(plan, [entry], 'current').status, 'insufficient_evidence');
  assert.equal(evaluateMeasurement(plan, [{ ...entry, evaluatorKind: 'user', sampleSize: 10, value: 95 }], 'current').status, 'passed');
  assert.equal(evaluateMeasurement(plan, [{ ...entry, evaluatorKind: 'user', sampleSize: 10, value: 80 }], 'current').status, 'failed');
  assert.equal(evaluateMeasurement(plan, [{ ...entry, evaluatorKind: 'user', sampleSize: 9 }], 'current').status, 'insufficient_evidence');
  assert.equal(evaluateMeasurement(plan, [entry], 'different').status, 'stale');
  assert.equal(evaluateMeasurement(plan, [], 'current').status, 'not_evaluated');
});
test('rechaza mediciones sin contexto, artefacto o valores numéricos válidos', () => {
  const catalog = readCatalog();
  const errors = validateEvaluation({ requirementId: 'RNF-USO-01', evaluatorKind: 'robot', value: NaN, sampleSize: -1 }, catalog);
  assert.ok(errors.length >= 5);
});

test('conserva evaluaciones históricas como obsoletas al cambiar el contexto', () => {
  const catalog = readCatalog();
  const plan = catalog.quality.find((p) => p.requirementId === 'RNF-USO-01');
  const entry = { id: 'EVAL-OLD', requirementId: plan.requirementId, sourceDigest: 'a'.repeat(64), contextId: 'contexto-previo-v1', evaluatorKind: 'user', evaluator: 'equipo', measuredAt: '2026-10-29T10:00:00Z', value: 95, unit: '%', sampleSize: 10, evidencePath: 'docs/02_pruebas/evaluaciones/README.md', observations: 'Fixture de validación de evidencia histórica.' };
  assert.deepEqual(validateEvaluation(entry, catalog, 'b'.repeat(64)), []);
  assert.equal(evaluateMeasurement(plan, [entry], 'b'.repeat(64)).status, 'stale');
  assert.ok(validateEvaluation({ ...entry, sourceDigest: 'b'.repeat(64) }, catalog, 'b'.repeat(64)).some((error) => error.includes('Contexto')));
});
