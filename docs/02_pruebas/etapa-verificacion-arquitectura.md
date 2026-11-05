# Etapa de verificación de la arquitectura

Actividades secuenciales acotadas. No crea RF/CU/CP ni matrices alternativas: reutiliza `docs/01_requisitos/catalogo.json` y `docs/01_requisitos/matriz-trazabilidad.md`. Las decisiones vigentes permanecen en ARQ-001 y ADR-LED-001; aquí solo se verifica su validez contra código y límites.

## Reglas de evidencia

- Estados posibles: **reutilizable** (baseline con huella de fuentes idéntica), **pendiente** (simulación/modelado), **no ejecutada** (prueba dinámica).
- Baseline local previo aprobado: 38 Vitest (15 Oracle) + 5 Cypress + 9 tooling. Solo se reutiliza si la huella de fuentes coincide; no se repite como resultado nuevo.
- RNF SQuaRE de rendimiento por usuarios/carga: sin medir; no se declara cumplido ni se extrapola.
- Simular/modelar **no** equivale a prueba dinámica ejecutada.

## EV-ARQ-01 — Validación de decisiones contra código

Objetivo: contrastar ledger interno autoritativo (Oracle, atomicidad corta), balances como proyección, asientos por moneda inmutables, idempotencia única `(user, scope, key)` sin mutex por usuario, locks de `accountIds` ordenados, y frontend Svelte sobre API monolito modular sin microservicio ni proveedor real.
Criterios de salida: cada decisión mapeada a archivo/límite verificable; desviaciones registradas con evidencia; sin proponer arquitectura nueva.
Responsable: agente (revisión) / humano (acepta límites). **Revisión estática iniciada:** `ledger.ts` y `idempotency.ts` confirman fuente autoritativa, suma cero por moneda, reserva por intención y bloqueo ordenado de cuentas. Se corrigieron nombres de componentes, tabla contable y columna de alcance en ARQ-001; no se cambió el runtime. Límites operativos y carga siguen pendientes.

## EV-SIM-01 — Simulación y modelado

Objetivo: recorrer entradas → decisión → estado/asientos → notificación → recuperación para cada escenario, sin ejecutarlo como prueba.
Criterios de salida: los 11 escenarios modelados y vinculados a CP existentes; supuestos y huecos explícitos.
Responsable: agente. Estado inicial: **pendiente** (modelado, no prueba).

| Escenario | CP de referencia |
| --- | --- |
| Pago USD normal | CP-TX-01, CP-IDEM-04 |
| Saldo insuficiente | CP-LED-05 |
| Reintentos de la misma intención | CP-IDEM-04 |
| Intenciones que compiten por fondos y transferencias opuestas | CP-IDEM-04, CP-LED-05 |
| FX con cotización vencida | CP-FX-02 |
| Rechazo y aceptación repetida de solicitudes | CP-TX-15, CP-NOT-02 |
| División personalizada y organizador | CP-GAS-04/05, CP-SPLIT-02/03 |
| Recurrencia UTC, tres reintentos y cancelación | CP-REC-04, CP-CAL-01..03 |
| Fallo antes del commit | CP-TX-17 |
| Respuesta perdida después del commit | CP-IDEM-04; falta inyección real de la pérdida de respuesta |
| Privacidad, paginación e interfaz | CP-TX-09, CP-WEB-01..05 |

**Modelo revisado (unidades menores USD; no es una ejecución nueva):** con A=B=250000, un pago de 2000 deja A=248000 y B=252000; repetir la clave conserva esos saldos. Dos pagos de 150000 que compiten por A solo permiten uno: A=100000 y B=400000. Un fallo antes del commit conserva los saldos iniciales; si se pierde la respuesta después del commit, el reintento de la misma intención recupera el resultado persistido. Los CP anteriores aportan evidencia parcial o casos diseñados; no se declara que todos estén ejecutados.

## EV-PRU-01 — Pruebas

Objetivo: re-ejecutar las suites aplicables sobre la huella vigente.
Criterios de salida: CP-IDEM-04 (concurrencia/replay), CP-TX-17 (rollback), CP-LED-01..06 (balance, inmutabilidad, saldo proyectado, upgrade fixture) y CP-TX-09 aprobados; resto de CP listados según alcance; evidencia nueva o reutilización declarada por huella.
Responsable: agente (ejecuta) / humano (valida evidencia). **Nueva campaña ejecutada el 2026-11-04:** 48 Vitest aprobadas (23 unitarias y 25 integraciones con Oracle desechable), 5 Cypress con API interceptada y 9 pruebas de tooling. Se automatizaron además CP-FX-02, CP-TX-15, CP-TX-16 y CP-SEC-01..07; se verificó rollback, doble asiento, concurrencia acotada, autorización y expiración. El catálogo conserva 43 CP aprobados y 52 diseñados. Las métricas de carga y usuarios finales siguen sin evaluar. Resultados y límites en [el informe de ejecución](informe-verificacion-2026-11-04.md).

## EV-CI-01 — CI y CD

CI (`.github/workflows/main.yml`): gate de docs, Node 22.20, pnpm frozen, Oracle Free y migración/fixture previos, reporte de pruebas, ledger check, E2E con API interceptada, build y artefacto con hash de fuentes. Se añadieron auditorías de dependencias (sin avisos en producción; herramientas sin avisos moderados o superiores), construcción Docker y smoke HTTP real entre imagen y Oracle. La imagen sirve el build Svelte; esta comprobación no conduce la interfaz en un navegador.
Criterios de salida CI: ejecución remota exitosa sobre el SHA actual y artefactos verificables.
CD: **no implementado**. Antes de habilitarlo se exige UI + API + Oracle enlazados, manteniendo las operaciones sandbox, rollback de despliegue y prueba de respaldos. Sin push ni cambios de configuración de cuenta.
Responsable: humano (habilita CD) / agente (evidencia CI). Verificación local aprobada; **CI remoto pendiente**: la consulta a GitHub devolvió una lista vacía de ejecuciones, con un workflow activo. El árbol de trabajo local contiene cambios sin publicar y no se realizó push. CD continúa sin implementar.

## Pendientes observables y cierre

- Funcionalidades nuevas solo tras cerrar esta validación; cerrar no es aprobación ISO.
- Cada criterio de salida deja pendiente observable con dueño y evidencia esperada.
