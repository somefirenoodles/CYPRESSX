# Arquitectura implementada — registro ARQ-001

**Estado:** registro actual del camino activo `web/` + `backend/http/`. Describe código inspeccionado; solo lo indicado en *Verificación* se ejecutó.
**Producto:** aplicación académica de pagos sandbox. Saldos, comercios, FX e ingresos son ficticios; no se mueve dinero real ni se usan tasas de mercado.

## Stack y runtime activo

- **Web:** Svelte 5.57.1 + TypeScript 5.9.3 + Vite 8.3.0 en `web/`; entrada `web/src/main.ts`, flujos en `web/src/App.svelte` y componentes `AccountTools`, `History` y `SplitForm`.
- **API:** Express 4.21.2 + TypeScript; montaje en `backend/app.ts` y `backend/server.ts`, rutas en `backend/http/` (`customer-routes`, `money-workflow-routes`, `recurrence-routes`).
- **Persistencia:** Oracle Database Free 23 vía Docker Compose, `node-oracledb` 7 en modo Thin con pool (`backend/db/oracle.ts`); DML agrupado con commit/rollback explícito. Esquema base en `database/migrations/001_initial.sql`.
- **Sesión:** token opaco; se persiste solo su hash SHA en Oracle, con usuario y expiración, y se entrega en cookie HttpOnly/SameSite.
- **Entornos:** desarrollo con cliente en 3000 y proxy a la API en 3001; producción con imagen multi-stage donde Express sirve el build; Compose levanta `app` y Oracle.
- **Herramientas:** Node 22.20.0 (referencia), pnpm 10.12.1, Vitest y Cypress (Edge/Chrome, sin Electron). `tsx` es dependencia de runtime.

## Dominio financiero

El ledger interno es la fuente autoritativa de saldos; los balances son proyección, no dato primario. Detalle en [ledger-interno.md](ledger-interno.md).

- `backend/domain/ledger.ts` implementa doble entrada: cada asiento suma cero por divisa, usa cuentas fuente para FX y cuentas contrapartida de comercios demo.
- `cx_ledger_journals` tiene unicidad por `operation_id` y conserva `request_hash`; los asientos pasan de `draft` a `posted` y son inmutables tras contabilizarse (migración 006).
- Montos en unidades menores enteras (`bigint` en dominio, `balance_minor` en base); USD, COP y CRC a dos decimales, sin aritmética binaria.
- Idempotencia por restricción única `(user_id, scope_name, idempotency_key)` y reservas de ejecución sin mutex por usuario.
- Anti-overspend: bloqueo de cuentas afectadas en orden estable y verificación contra la suma del ledger publicado.

## Transacciones y comandos

Los comandos locales usan transacción corta y devuelven estado, asiento y proyección; la notificación se registra en la misma unidad atómica. Preparación, cotización y revisión ocurren fuera de SQL, sin RPC entre módulos. Cobros, solicitudes, recurrencias y comercios demo comparten ese flujo.

## Brechas cubiertas en el camino activo

Estas capacidades existen en código; su cobertura de casos de prueba se rastrea en [casos-prueba.md](../02_pruebas/casos-prueba.md).

- Contactos con CRUD y bancos ficticios, solo ambiente de prueba, con últimos cuatro dígitos y hash como datos privados.
- Historial con detalle por keyset y marca de tiempo completa.
- Notificaciones durables con lectura atómica.
- División con vista previa, montos personalizados y organizador.
- Recurrencias con consentimiento, ancla UTC, reintentos a 1 h/24 h/72 h, cancelación terminal y sin backlog pendiente.
- Ingresos externos simulados con referencia idempotente.

## Límites y datos ficticios

- No hay proveedor de pagos real, FX de mercado, SDK de Stripe ni liquidación bancaria; todo efecto se resuelve en el libro sandbox.
- No se debe interpretar el ledger interno como integración financiera ni como evidencia de cumplimiento regulatorio.
- React, lowdb y GraphQL fueron eliminados del árbol actual; solo persisten en el historial Git, no como runtime ni código de referencia.
- Se conservan licencia y atribución original (MIT).

## Futuro, no implementado

La extracción a un servicio de ledger separado queda como diseño: mantendría el contrato de flujo con outbox/inbox al separarse. No se añade infraestructura adicional en el estado actual; esta ficha no autoriza ese cambio.

## Documentación y verificación

- Fuente única: `docs/01_requisitos/catalogo.json`; `pnpm docs:generate` produce ERS, CU, CP, RNF y matriz, y `pnpm docs:check` los valida en el mismo CI que pruebas y tooling. Estado declarado: 22 RF, 11 RNF, 17 CU.
- Enlaces: [ers.md](../01_requisitos/ers.md), [casos-uso.md](../01_requisitos/casos-uso.md), [matriz-trazabilidad.md](../01_requisitos/matriz-trazabilidad.md), [rnf-square.md](../01_requisitos/rnf-square.md).
- SQuaRE es guía de evaluación local, sin objetivo de certificación.
- Verificación de esta sesión (evidencia preliminar): Vitest 37 pruebas aprobadas, incluida la suite Oracle aislada; Cypress 5 pruebas en Edge con API interceptada aprobadas. Los artefactos con el hash actual se consolidan al cierre; no se afirma que los 87 CP diseñados estén aprobados.
- Pendiente: estudio de usuarios y umbrales de carga de los RNF. La inspección estática de esta ficha no sustituye esas ejecuciones.
