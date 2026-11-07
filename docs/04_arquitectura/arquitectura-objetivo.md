# Arquitectura implementada — ARQ-001

**Estado:** descripción estática del camino activo `web/` + `backend/`. La evidencia dinámica se conserva por fecha y huella en los informes de verificación.

## Stack activo

| Capa | Tecnología | Punto de entrada |
|---|---|---|
| Cliente web | Svelte 5.57.1, TypeScript 5.9.3, Vite 8.3.3 | `web/src/main.ts`, `web/src/App.svelte` |
| API | Express 4.22.3, TypeScript, Zod 4.6.7 | `backend/server.ts`, `backend/app.ts`, `backend/http/` |
| Persistencia | Oracle Database Free 23, `node-oracledb` 7.0.1 Thin | `backend/db/oracle.ts`, `database/migrations/` |
| Compilación | Node 22.20.0, pnpm 10.12.1 | `package.json`, `pnpm-lock.yaml`, `Dockerfile` |
| Calidad | Vitest, Cypress, Node test runner | `vite.config.ts`, `cypress.config.ts`, `scripts/` |

## Módulos y dependencias

- `web/src/` contiene la SPA, componentes Svelte y cliente HTTP `lib/api.ts`. En desarrollo Vite sirve el cliente en 3000 y redirige `/api` a Express en 3001.
- `backend/app.ts` compone Helmet, JSON, sesión, rutas y manejo de errores. En producción sirve el build estático de Vite desde Express.
- `backend/http/` valida solicitudes, aplica middleware de sesión y traduce resultados a HTTP. Los routers todavía contienen SQL y parte de la orquestación del caso de uso.
- `backend/domain/` concentra políticas de dinero, ledger, pagos, idempotencia, divisiones, notificaciones y recurrencias. Varios métodos reciben una conexión Oracle, por lo que las reglas de dominio mantienen acoplamiento explícito a la transacción y el driver.
- `backend/db/` administra pool, conexión, transacción, migraciones, seed y conciliación.
- `database/migrations/` versiona seis etapas del esquema, desde tablas iniciales hasta el ledger autoritativo.
- `scripts/` contiene generación de requisitos, captura de evidencia, validación de Oracle y orquestación E2E.

## Secuencia de una operación de dinero

El navegador envía una solicitud a Express. La ruta valida el contrato con Zod y obtiene la identidad de sesión. El handler inicia una transacción Oracle, aplica idempotencia y llama la operación de dominio. El ledger inserta y publica el asiento, actualiza la proyección y registra notificaciones dentro de la misma transacción. El servidor confirma y devuelve el DTO; si falla, revierte los cambios.

Las transacciones son cortas y no se mantienen abiertas durante interacciones de pantalla. Las cotizaciones se leen antes de confirmar la operación y se consumen de forma controlada al contabilizar.

## Contabilidad y concurrencia

`backend/domain/ledger.ts` exige al menos dos partidas no nulas y suma cero por moneda. Los importes usan `bigint` en unidades menores. El posting persiste un hash de intención, asegura una sola bitácora por operación, bloquea cuentas afectadas en orden estable y actualiza saldos como proyecciones reconciliables. Las migraciones protegen los asientos publicados contra cambios posteriores. El detalle está en [ADR-LED-001](./ledger-interno.md).

`backend/domain/recurrence-policy.ts` contiene reglas temporales deterministas. `recurrence-worker.ts` consulta vencimientos y ejecuta cada operación en una transacción; la coordinación local impide solapamiento dentro del proceso. El código no define elección de líder entre varias instancias.

## Pruebas y evidencia

Vitest cubre funciones de dominio e integraciones de API con Oracle/Supertest; Cypress ejecuta flujos web configurados con interceptación de API; Node test runner cubre utilidades de trazabilidad. `pnpm types`, `pnpm build` y los artefactos por ejecución complementan las suites. La cobertura y los límites se documentan en [estrategia de pruebas](../02_pruebas/normas-y-estrategia-pruebas.md) y en el [informe de verificación](../02_pruebas/informe-verificacion-2026-11-04.md).

El alcance de fondos se explica una sola vez en la [nota financiera cerrada](./alcance-financiero-cerrado.md). React, lowdb, GraphQL y Amplify forman parte del árbol retirado; no están en el runtime activo.
