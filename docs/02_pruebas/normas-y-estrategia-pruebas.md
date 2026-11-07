# Normas y estrategia de pruebas

**Estado:** estrategia vigente; catálogo, criterios y resultados se distinguen en la matriz única y los artefactos de ejecución.
**Objetivo:** probar la aplicación web activa con Svelte 5, API Express/TypeScript, Oracle SQL y los flujos financieros definidos en la línea base del producto.
**Límite:** este documento define la ejecución de pruebas y no determina cumplimiento regulatorio.

## Normas y guías seleccionadas

| Referencia | Uso práctico en el proyecto | Límite |
|---|---|---|
| [ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html) | Redactar RF verificables, registrar supuestos, criterios de aceptación y trazabilidad requisito → CU → CP. La ficha ISO indica que esta edición se confirmó en 2024 y está en proceso de revisión; consultar su estado al iniciar otro ciclo documental. | Usar sus prácticas como guía de requisitos; no declarar cumplimiento formal de la norma. |
| [ISO/IEC/IEEE 29119 — serie](https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html), especialmente [Parte 2: procesos](https://www.iso.org/standard/79428.html), [Parte 3: documentación](https://www.iso.org/standard/79429.html) y [Parte 4: técnicas](https://www.iso.org/standard/79430.html) | Planificar pruebas basadas en riesgo, diseñar casos y registrar datos, pasos, resultados esperados/observados y evidencia. Aplicar partición de equivalencia, valores límite y transiciones de estado cuando corresponda. | Adaptar los artefactos a la escala de la materia; no implantar un sistema de certificación. |
| [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0) | Mantener una lista de verificación seleccionada para controles web/API: autenticación y sesión, autorización por objeto, validación de entradas, manejo de errores, protección de datos y registro seguro. Registrar cada requisito ASVS con la forma versionada `v5.0.0-<id>` si se utiliza en un caso. | ASVS es referencia de verificación técnica; la lista parcial no equivale a declarar que el producto cumple ASVS ni sustituye pruebas de seguridad independientes. |

Estas referencias cubren ingeniería de requisitos, proceso/documentación/técnicas de prueba y controles de seguridad de aplicaciones web. ISO indica que 29148:2018 es la edición publicada vigente al momento de consulta, con reemplazo en desarrollo. La página del comité para la serie 29119 describe las partes 2, 3 y 4; sus fichas individuales enlazadas son de ISO.

## Herramientas: conservar y adaptar

Configuración activa inspeccionada: `package.json`, `vite.config.ts`, `cypress.config.ts` y `pnpm-lock.yaml` usan Svelte 5, Vite 8, TypeScript, Express, Vitest, Cypress y pnpm. La suite activa de Vitest está en `web/src/lib`; incluye pruebas unitarias y una prueba de integración Oracle que se omite si falta `DB_CONNECT_STRING`. Cypress E2E está en `cypress/e2e` y usa `scripts/run-e2e.mjs`, que selecciona Edge en Windows y Chrome en Linux, sin Electron. Las suites heredadas `src/__tests__`, `src/utils/__tests__`, `cypress/tests/**` y los componentes `.cy.tsx` ya no son suites activas. La integración Oracle está en CI con Oracle Free; en la última revisión local no pudo ejecutarse porque Docker daemon estaba apagado. No se ejecutaron suites para esta actualización documental.

| Herramienta/capa | Propuesta |
|---|---|
| **Cypress** | Activo para E2E web en Edge/Chrome. `pnpm test:e2e` ejecuta `scripts/run-e2e.mjs`; el flujo de pagos intercepta API cuando corresponde. No se encontró configuración activa de Component Testing ni se usa Electron. |
| **Vitest** | Activo para lógica de dominio/UI en `web/src/lib`; `pnpm test` ejecuta Vitest. `oracle.integration.test.ts` requiere `DB_CONNECT_STRING` y no fue ejecutada en esta revisión. |
| **Oracle SQL** | Oracle Database Free y migraciones/seed están configurados en Compose. La prueba de integración usa Oracle real cuando se habilita; no sustituir restricciones/transacciones por SQLite ni mocks como evidencia suficiente. |
| **TypeScript, Vite, Express, pnpm** | Activos. `pnpm types`, `pnpm build`, `pnpm test` y `pnpm test:e2e` son comandos configurados; su existencia no implica que se hayan ejecutado o pasado. ESLint no es dependencia activa identificada en el manifiesto actual. |
| **Cobertura y CI** | CI prepara Oracle, pnpm y suites; cobertura es señal complementaria, no criterio único. Registrar resultados reales por commit y entorno; esta actualización documental no ejecuta la pipeline. |

Comandos configurados en el repositorio: `pnpm types`, `pnpm build`, `pnpm test` y `pnpm test:e2e`; `pnpm db:setup` prepara esquema y datos demo. Los scripts de CI también configuran pnpm y Oracle. Esta guía no afirma que un comando haya pasado: registrar salida, commit y entorno al ejecutar.

## Niveles y orden de prueba

1. **Unitarias (Vitest):** límites de monto, transiciones permitidas, partición de gastos y traducción de estados de operación, aislando reglas puras de la base de datos.
2. **Integración de persistencia Oracle (Vitest + Oracle de prueba):** constraints, queries, rollback, concurrencia e idempotencia en repositorios/transacciones reales. Cada suite usa datos propios y limpieza determinista.
3. **API (Cypress o cliente HTTP de prueba):** autorización, contrato HTTP, estados, idempotencia y fallos del adaptador. Validar persistencia y saldo desde consultas preparadas por el backend de pruebas, no editando archivos JSON.
4. **E2E web (Cypress):** flujos visibles de pago, solicitud, división y recurrentes cuando estén implementados; usar viewport móvil adaptable además del escritorio.
5. **Revisión estática y seguridad:** `pnpm types` y checklist ASVS seleccionado. No se documenta comando de lint activo; revisar tooling antes de incorporarlo. Esto no sustituye integración, E2E ni revisión especializada.

Orden sugerido por cambio: unitarias → integración Oracle → API → E2E del flujo afectado → suite relevante completa. Las pruebas financieras usan datos sintéticos y un entorno aislado; no requieren credenciales de proveedores externos.

## Casos de prueba prioritarios

Los IDs, escenarios, criterios y suites enlazadas se mantienen en [casos de prueba canónicos](casos-prueba.md), generados desde `catalogo.json`. La [matriz única](../01_requisitos/matriz-trazabilidad.md) sustituye las tablas de planificación previas. Los resultados actuales solo proceden de la ejecución con revisión y huella, no de la existencia de esta estrategia.

## Atomicidad, defectos reservados y evidencia

`CP-TX-15` se relaciona con DF-002 y `CP-TX-16` con DF-004. El registro actual mantiene DF-001/002 reservados y DF-003/004 como candidatos; diseñar un caso no equivale a reproducirlo ni autoriza a corregirlo. Para documentar reproducción o regresión, seguir `docs/03_mantenimiento/defectos-reservados.md`.

Por cada ejecución guardar: ID de CP, commit, entorno y versión Oracle, migración aplicada, fixtures sintéticos, actor/rol, pasos o comando, resultado esperado/observado, estado (Aprobado/Fallido/Bloqueado/No ejecutado), evidencia y defecto/requisito relacionado. No guardar contraseñas, tokens, números bancarios ni datos personales en logs/evidencias.

## Normativa de operaciones financieras reales

Fuera del alcance de esta guía: evaluar transferencias, custodia, liquidación o requisitos regulatorios por jurisdicción. Si el alcance cambia, identificar países, entidades operadoras y flujos primero y solicitar asesoría especializada antes de seleccionar cualquier normativa. Este documento no ofrece conclusiones jurídicas ni una lista legal de obligaciones.

## Fuentes oficiales consultadas

- [ISO/IEC/IEEE 29148:2018 — Requirements engineering](https://www.iso.org/standard/72089.html): ficha y resumen oficial; estado de edición consultado.
- [ISO/IEC/IEEE 29119 series — JTC 1/SC 7](https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html): resumen de relación entre procesos, documentación y técnicas.
- [ISO/IEC/IEEE 29119-2:2021](https://www.iso.org/standard/79428.html): procesos de prueba.
- [ISO/IEC/IEEE 29119-3:2021](https://www.iso.org/standard/79429.html): documentación de pruebas.
- [ISO/IEC/IEEE 29119-4:2021](https://www.iso.org/standard/79430.html): técnicas de diseño de pruebas.
- [OWASP ASVS, rama v5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0): versión estable y lista de requisitos de verificación seleccionable.
