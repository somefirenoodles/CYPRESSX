import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const catalogPath = 'docs/01_requisitos/catalogo.json';
const list = (value) => Array.isArray(value) && value.length > 0;
const text = (value) => typeof value === 'string' && value.trim().length > 0;
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const readCatalog = () => JSON.parse(readFileSync(resolve(root, catalogPath), 'utf8'));

export function safePath(path, base = root) {
  if (!text(path) || isAbsolute(path) || path.includes('\\') || path.split('/').some((part) => (part.startsWith('.') && part !== '.github') || part === 'node_modules')) throw new Error(`Ruta no permitida: ${path}`);
  const result = resolve(base, path);
  if (relative(base, result).startsWith('..') || /(^|\/)\.env/.test(path)) throw new Error(`Ruta fuera del proyecto: ${path}`);
  return result;
}

export function validateCatalog(catalog, base = root) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(catalog.schemaVersion === 1, 'schemaVersion debe ser 1');
  check(text(catalog.baseline?.id) && text(catalog.baseline?.purpose) && /^\d{4}-\d{2}-\d{2}$/.test(catalog.baseline?.date ?? ''), 'Línea base incompleta');
  const names = ['sources', 'decisions', 'requirements', 'useCases', 'tests', 'groups', 'legacyMappings', 'businessRules', 'quality'];
  for (const name of names) check(Array.isArray(catalog[name]), `Falta colección ${name}`);
  if (errors.length) return errors;
  const ids = new Map();
  for (const name of names.filter((name) => name !== 'quality')) {
    for (const item of catalog[name]) {
      check(text(item.id), `ID vacío en ${name}`);
      check(!ids.has(item.id), `ID duplicado: ${item.id}`);
      ids.set(item.id, name);
    }
  }
  const refs = (values, collection, owner) => {
    check(Array.isArray(values), `${owner}: referencias inválidas`);
    for (const id of values ?? []) check(ids.get(id) === collection, `${owner}: referencia inexistente ${id} (${collection})`);
  };
  const criteria = new Map();
  for (const requirement of catalog.requirements) {
    const id = requirement.id;
    check(/^(RF|RNF)-[A-Z]+-\d{2}$/.test(id), `ID de requisito inválido: ${id}`);
    check(['functional', 'nonfunctional'].includes(requirement.kind), `${id}: tipo inválido`);
    check(text(requirement.statement) && text(requirement.title) && ['alta', 'media'].includes(requirement.priority), `${id}: definición incompleta`);
    check(list(requirement.acceptance) && list(requirement.useCases), `${id}: falta aceptación o CU`);
    refs(requirement.useCases, 'useCases', id);
    refs(requirement.sourceIds, 'sources', id);
    const impl = requirement.implementation;
    check(impl && ['present', 'partial', 'missing'].includes(impl.status) && Array.isArray(impl.paths) && Array.isArray(impl.gaps), `${id}: implementación incompleta`);
    if (impl) {
      check(impl.status === 'missing' || list(impl.paths), `${id}: implementación sin archivos`);
      check(impl.status === 'present' || list(impl.gaps), `${id}: brecha sin describir`);
      for (const path of impl.paths ?? []) {
        try { check(existsSync(safePath(path, base)), `${id}: archivo ausente ${path}`); } catch (error) { errors.push(error.message); }
      }
    }
    for (const criterion of requirement.acceptance ?? []) {
      check(criterion.id?.startsWith(`${id}-A`) && text(criterion.text), `${id}: criterio inválido`);
      check(!criteria.has(criterion.id), `Criterio duplicado: ${criterion.id}`);
      criteria.set(criterion.id, id);
    }
  }
  for (const useCase of catalog.useCases) {
    check(/^CU-[A-Z]+-\d{2}$/.test(useCase.id), `ID de CU inválido: ${useCase.id}`);
    check(['title', 'actor', 'trigger', 'success', 'failure'].every((key) => text(useCase[key])) && ['preconditions', 'flow', 'alternatives'].every((key) => list(useCase[key]) && useCase[key].every(text)), `${useCase.id}: CU incompleto`);
    check(catalog.requirements.some((r) => r.useCases.includes(useCase.id)), `${useCase.id}: CU sin requisito`);
  }
  const covered = new Set();
  const bindings = new Set();
  for (const test of catalog.tests) {
    check(/^CP-[A-Z]+-\d{2}$/.test(test.id) && text(test.title), `CP inválido: ${test.id}`);
    check(['unit', 'integration', 'e2e', 'inspection', 'user'].includes(test.level) && ['positive', 'negative', 'mixed'].includes(test.polarity), `${test.id}: nivel/polaridad inválidos`);
    check(['criteria', 'preconditions', 'steps', 'expected'].every((key) => list(test[key]) && test[key].every(text)) && text(test.data), `${test.id}: diseño incompleto`);
    for (const id of test.criteria ?? []) { check(criteria.has(id), `${test.id}: criterio inexistente ${id}`); covered.add(id); }
    if (test.automation !== null) {
      const binding = test.automation ?? {};
      check(['vitest', 'cypress', 'node'].includes(binding.runner) && text(binding.pattern), `${test.id}: enlace automático incompleto`);
      const key = `${binding.path}:${binding.pattern}`;
      check(!bindings.has(key), `${test.id}: prueba automatizada duplicada, reutilizar el CP existente`);
      bindings.add(key);
      try {
        const path = safePath(binding.path, base);
        check(existsSync(path), `${test.id}: suite ausente ${binding.path}`);
        if (existsSync(path)) check(readFileSync(path, 'utf8').includes(binding.pattern), `${test.id}: título no encontrado en ${binding.path}`);
      } catch (error) { errors.push(error.message); }
    }
  }
  for (const id of criteria.keys()) check(covered.has(id), `${id}: sin caso de prueba diseñado`);
  for (const requirement of catalog.requirements) {
    const tests = catalog.tests.filter((test) => test.criteria.some((id) => criteria.get(id) === requirement.id));
    check(tests.some((test) => ['positive', 'mixed'].includes(test.polarity)) && tests.some((test) => ['negative', 'mixed'].includes(test.polarity)), `${requirement.id}: falta escenario positivo o negativo`);
  }
  for (const group of catalog.groups) { check(text(group.title) && list(group.requirements), `${group.id}: grupo vacío`); refs(group.requirements, 'requirements', group.id); }
  for (const rule of catalog.businessRules) {
    check(/^RN-[A-Z]+-\d{2}$/.test(rule.id) && text(rule.title) && text(rule.statement) && list(rule.requirements), `${rule.id}: regla incompleta`);
    refs(rule.requirements, 'requirements', rule.id);
  }
  for (const alias of catalog.legacyMappings) {
    check(text(alias.reason) && Array.isArray(alias.targets), `${alias.id}: falta razón de migración/retiro`);
    for (const id of alias.targets ?? []) check(['requirements', 'useCases'].includes(ids.get(id)), `${alias.id}: destino inexistente ${id}`);
  }
  for (const decision of catalog.decisions) { check(['title', 'resolution', 'rationale'].every((key) => text(decision[key])), `${decision.id}: decisión incompleta`); refs(decision.sourceIds, 'sources', decision.id); }
  for (const source of catalog.sources) check(text(source.title) && /^https:\/\//.test(source.url ?? ''), `${source.id}: fuente incompleta`);
  const qualityIds = new Set();
  for (const plan of catalog.quality) {
    check(ids.get(plan.requirementId) === 'requirements' && catalog.requirements.find((r) => r.id === plan.requirementId)?.kind === 'nonfunctional', `${plan.requirementId}: plan sin RNF`);
    check(!qualityIds.has(plan.requirementId), `${plan.requirementId}: plan duplicado`);
    qualityIds.add(plan.requirementId);
    check(['standard', 'characteristic', 'metric', 'threshold', 'method', 'context', 'contextId', 'owner', 'reevaluate', 'unit'].every((key) => text(plan[key])), `${plan.requirementId}: medición incompleta`);
    check(['>=', '<=', '=='].includes(plan.operator) && Number.isFinite(plan.target) && Number.isSafeInteger(plan.minSamples) && plan.minSamples > 0 && ['min', 'max', 'mean'].includes(plan.aggregation), `${plan.requirementId}: umbral inválido`);
    check(list(plan.evaluatorKinds) && plan.evaluatorKinds.every((kind) => ['automation', 'agent', 'user'].includes(kind)), `${plan.requirementId}: evaluadores inválidos`);
  }
  for (const r of catalog.requirements.filter((r) => r.kind === 'nonfunctional')) check(qualityIds.has(r.id), `${r.id}: RNF sin medición`);
  return errors;
}

const cell = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const bullets = (values) => values.map((value) => `- ${value}`).join('\n');
const numbered = (values) => values.map((value, index) => `${index + 1}. ${value}`).join('\n');
const notice = '<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->\n';
const implLabels = { present: 'Presente en código', partial: 'Parcial', missing: 'Sin implementación' };

export function renderDocuments(catalog) {
  const requirements = catalog.requirements.filter((r) => r.kind === 'functional');
  const nonfunctional = catalog.requirements.filter((r) => r.kind === 'nonfunctional');
  const renderRequirements = (items) => items.map((r) => `## ${r.id} — ${r.title}\n\n${r.statement}\n\n**Prioridad:** ${r.priority}. **Implementación:** ${implLabels[r.implementation.status]}. **CU:** ${r.useCases.join(', ')}.\n\n${bullets(r.acceptance.map((a) => `**${a.id}:** ${a.text}`))}\n\n**Archivos:** ${r.implementation.paths.map((p) => `\`${p}\``).join(', ') || 'Ninguno identificado'}.\n\n**Brechas:** ${r.implementation.gaps.join(' ') || 'Sin brechas estáticas registradas; requiere evidencia dinámica.'}\n`).join('\n');
  const ers = `${notice}# ERS de Superpay — ${catalog.baseline.id}\n\n**Línea base:** ${catalog.baseline.date}; ${catalog.baseline.status}. La especificación está consolidada; su vigencia no certifica aceptación ni pruebas.\n\n${catalog.baseline.purpose}\n\n## Alcance\n\n${bullets(catalog.baseline.scope)}\n\n## Fuera de alcance\n\n${bullets(catalog.baseline.outOfScope)}\n\n${renderRequirements(requirements)}\n## Decisiones de producto\n\n${catalog.decisions.map((d) => `### ${d.id} — ${d.title}\n\n${d.resolution}\n\n**Razón:** ${d.rationale}\n\n**Fuentes:** ${d.sourceIds.join(', ') || 'Decisión local del proyecto'}.\n`).join('\n')}\n## Fuentes\n\n${bullets(catalog.sources.map((s) => `${s.id}: [${s.title}](${s.url})`))}\n`;
  const useCases = `${notice}# Casos de uso de Superpay\n\nLínea base ${catalog.baseline.id}. Los flujos definen el contrato objetivo; consultar la matriz para implementación y evidencia.\n\n${catalog.useCases.map((u) => `## ${u.id} — ${u.title}\n\n**Actor:** ${u.actor}. **Requisitos:** ${catalog.requirements.filter((r) => r.useCases.includes(u.id)).map((r) => r.id).join(', ')}.\n\n**Precondiciones:**\n\n${bullets(u.preconditions)}\n\n**Disparador:** ${u.trigger}\n\n**Flujo principal:**\n\n${numbered(u.flow)}\n\n**Alternativas y excepciones:**\n\n${bullets(u.alternatives)}\n\n**Éxito:** ${u.success}\n\n**Fallo:** ${u.failure}\n`).join('\n')}`;
  const matrix = `${notice}# Matriz única de trazabilidad\n\nUna fila por requisito canónico. RF-PROD y CU históricos se relacionan por equivalencias, sin duplicar trabajo. Presente en código no significa verificado. Los resultados por ejecución se publican como artefactos de CI.\n\n| Requisito | CU | Criterios | CP | Implementación | Automatización |\n| --- | --- | --- | --- | --- | --- |\n${catalog.requirements.map((r) => {
    const tests = catalog.tests.filter((t) => t.criteria.some((a) => r.acceptance.some((c) => c.id === a)));
    return `| ${r.id} — ${cell(r.title)} | ${r.useCases.join(', ')} | ${r.acceptance.map((a) => a.id).join(', ')} | ${tests.map((t) => t.id).join(', ')} | ${implLabels[r.implementation.status]} | ${tests.filter((t) => t.automation).length}/${tests.length} CP con enlace |`;
  }).join('\n')}\n\n## Equivalencias de producto\n\n| ID | Requisitos canónicos |\n| --- | --- |\n${catalog.groups.map((g) => `| ${g.id} — ${cell(g.title)} | ${g.requirements.join(', ')} |`).join('\n')}\n\n## IDs anteriores\n\n| ID anterior | Destinos vigentes | Razón |\n| --- | --- | --- |\n${catalog.legacyMappings.map((a) => `| ${a.id} | ${a.targets.join(', ') || 'Retirado'} | ${cell(a.reason)} |`).join('\n')}\n`;
  const tests = `${notice}# Casos de prueba canónicos\n\nLos resultados esperados son criterios de diseño. Los resultados observados se guardan por ejecución, con revisión y huella de fuentes.\n\n${catalog.tests.map((t) => `## ${t.id} — ${t.title}\n\n**Nivel:** ${t.level}. **Tipo:** ${t.polarity}. **Criterios:** ${t.criteria.join(', ')}.\n\n**Precondiciones:**\n\n${bullets(t.preconditions)}\n\n**Datos:** ${t.data}\n\n**Pasos:**\n\n${numbered(t.steps)}\n\n**Resultado esperado:**\n\n${bullets(t.expected)}\n\n**Automatización:** ${t.automation ? `${t.automation.runner}: \`${t.automation.path}\` — \`${t.automation.pattern}\`` : 'Diseñado; automatización pendiente o evaluación humana'}.\n`).join('\n')}`;
  const quality = `${notice}# RNF y evaluación SQuaRE\n\nGuía de evaluación del proyecto; no busca certificación. Los umbrales son decisiones locales, no valores impuestos por ISO. ISO/IEC 25010:2023 orienta calidad del producto, 25019:2023 calidad en uso y 25040:2024 el marco de evaluación.\n\nLas mediciones se versionan: cambiar contexto, muestra, umbral o implementación obliga a reevaluar. Se conserva por separado evidencia de pruebas, revisión de agentes y observación de usuarios finales. Una evaluación de agente nunca se contabiliza como usuario final.\n\n${renderRequirements(nonfunctional)}\n## Plan de medición\n\n${catalog.quality.map((q) => `### ${q.requirementId} — ${q.characteristic}\n\n**Modelo:** ${q.standard}. **Métrica:** ${q.metric}. **Umbral local:** ${q.threshold}.\n\n**Método:** ${q.method}. **Contexto:** ${q.context}. **Responsable:** ${q.owner}. **Reevaluar:** ${q.reevaluate}.\n`).join('\n')}`;
  const view = (title, link = 'ers.md') => `${notice}# ${title}\n\nLa línea base vigente se mantiene en [la ERS](${link}), los [CU canónicos](casos-uso.md) y la [matriz única](matriz-trazabilidad.md). Editar \`catalogo.json\` y ejecutar \`pnpm docs:generate\`; esta vista no tiene un proceso independiente de aprobación o formato.\n`;
  const outputs = new Map([
    ['docs/01_requisitos/ers.md', ers], ['docs/01_requisitos/casos-uso.md', useCases],
    ['docs/01_requisitos/matriz-trazabilidad.md', matrix], ['docs/02_pruebas/casos-prueba.md', tests],
    ['docs/01_requisitos/rnf-square.md', quality],
    ['docs/01_requisitos/requisitos-transacciones.md', `${view('Requisitos del núcleo transaccional') }\n${renderRequirements(requirements.filter((r) => /^RF-TX-0[1-8]$/.test(r.id)))}`],
    ['docs/01_requisitos/requisitos-ampliacion.md', `${view('Requisitos funcionales de ampliación')}\n${renderRequirements(requirements.filter((r) => !/^RF-TX-0[1-8]$/.test(r.id)))}`],
    ['docs/01_requisitos/casos-uso-ampliacion.md', `${view('CU de ampliación')}\n${bullets(catalog.useCases.filter((u) => !/^CU-TX-0[1-3]$/.test(u.id)).map((u) => `${u.id} — ${u.title}; especificación completa en [CU canónicos](casos-uso.md).`))}\n`],
    ['docs/01_requisitos/alcance-producto-revisado.md', `${view('Alcance de producto consolidado')}\n${catalog.baseline.purpose}\n\n## Incluye\n\n${bullets(catalog.baseline.scope)}\n\n## Fuera de alcance\n\n${bullets(catalog.baseline.outOfScope)}\n\n## Equivalencias de producto\n\n${bullets(catalog.groups.map((g) => `**${g.id} — ${g.title}:** ${g.requirements.join(', ')}.`))}\n`],
  ]);
  const rules = catalog.businessRules.map((rule) => `## ${rule.id} — ${rule.title}\n\n${rule.statement}\n\n**Requisitos relacionados:** ${rule.requirements.join(', ')}.\n`).join('\n');
  outputs.set('docs/01_requisitos/ers.md', `${ers}\n## Reglas de negocio\n\n${rules}`);
  outputs.set('docs/01_requisitos/invariantes-financieros.md', `${notice}# Invariantes financieros\n\nEl ledger interno es la fuente de verdad. Cada asiento suma cero por moneda, se contabiliza atómicamente y no admite mutaciones posteriores. Los saldos son proyecciones conciliables. Consultar [ADR-LED-001](../04_arquitectura/ledger-interno.md).\n\n${renderRequirements(catalog.requirements.filter((r) => ['RF-LED-01', 'RF-TX-07', 'RF-TX-06'].includes(r.id)))}\nLas solicitudes y divisiones no mueven fondos al crearse. Rechazar tampoco mueve fondos. Los estados, recorridos y reglas se mantienen en la [ERS](ers.md) y los [CU canónicos](casos-uso.md). Los resultados observados se publican por revisión/huella en artefactos de CI.\n`);
  return outputs;
}

export function run(mode) {
  if (!['check', 'generate'].includes(mode)) throw new Error('Uso: node scripts/traceability.mjs check|generate');
  const catalog = readCatalog();
  const errors = validateCatalog(catalog);
  if (errors.length) throw new Error(errors.join('\n'));
  const canonical = `${JSON.stringify(catalog, null, 2)}\n`;
  if (mode === 'generate') writeFileSync(resolve(root, catalogPath), canonical);
  else if (readFileSync(resolve(root, catalogPath), 'utf8').replaceAll('\r\n', '\n') !== canonical) throw new Error('Formato de catalogo.json distinto al generado; ejecuta pnpm docs:generate.');
  for (const [path, value] of renderDocuments(catalog)) {
    const file = resolve(root, path);
    if (mode === 'generate') { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); }
    else if (!existsSync(file) || readFileSync(file, 'utf8').replaceAll('\r\n', '\n') !== value) throw new Error(`${path} desactualizado. Ejecuta pnpm docs:generate.`);
  }
  console.log(`${catalog.requirements.length} requisitos, ${catalog.useCases.length} CU y ${catalog.tests.length} CP: referencias y documentos coherentes.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { run(process.argv[2]); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
