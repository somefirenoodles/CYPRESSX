<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Invariantes financieros del sandbox

El ledger interno es la fuente de verdad. Cada asiento suma cero por moneda, se contabiliza atómicamente y no admite mutaciones posteriores. Los saldos son proyecciones conciliables. Consultar [ADR-LED-001](../04_arquitectura/ledger-interno.md).

## RF-TX-06 — No repetir operaciones financieras

El sistema debe impedir que reintentos de pagos, solicitudes, aceptaciones o rechazos produzcan efectos financieros duplicados.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-TX-01, CU-TX-02, CU-TX-04, CU-TX-05.

- **RF-TX-06-A1:** Las operaciones financieras aceptan una clave idempotente persistida y la asocian a su efecto.
- **RF-TX-06-A2:** Repetir la misma clave con el mismo payload devuelve el resultado original sin nuevo asiento en el ledger.
- **RF-TX-06-A3:** Repetir la misma clave con payload distinto se rechaza sin ejecutar la nueva operación.
- **RF-TX-06-A4:** Una solicitud aceptada o rechazada nunca vuelve a producir efectos, aunque se use otra clave o se intente otra acción.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-TX-07 — Dinero exacto

El sistema debe representar y calcular importes en unidades menores exactas, sin pérdidas por punto flotante.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-TX-01, CU-GAS-01, CU-FX-01, CU-REC-01.

- **RF-TX-07-A1:** Los importes se persisten como enteros en unidades menores con dos decimales para USD, COP y CRC.
- **RF-TX-07-A2:** Los cálculos de saldo, débito, crédito y conversión no usan aritmética binaria de punto flotante.
- **RF-TX-07-A3:** La suma de participaciones y movimientos iguala exactamente el total declarado.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-LED-01 — Contabilizar sobre ledger autoritativo de doble entrada

Toda operación con efecto monetario debe contabilizarse a través del ledger interno, con asientos inmutables, claves idempotentes y proyecciones de saldo derivadas.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-LED-01, CU-TX-01, CU-TX-03, CU-COM-01, CU-SBX-01, CU-ING-01.

- **RF-LED-01-A1:** Cada asiento contiene al menos dos partidas no nulas y su suma es cero por moneda; FX utiliza contrapartidas explícitas por divisa.
- **RF-LED-01-A2:** Oracle impide modificar o eliminar asientos contabilizados y añadirles partidas; un fallo revierte asiento, proyección y efectos locales.
- **RF-LED-01-A3:** Repetir una operación con las mismas partidas devuelve el mismo asiento sin nuevos efectos; partidas distintas para la misma operación producen conflicto.
- **RF-LED-01-A4:** El saldo disponible se autoriza desde las partidas contabilizadas; la proyección se reconcilia, no hay sobregiro concurrente y las intenciones distintas no utilizan un bloqueo global por usuario.

**Archivos:** `backend/domain/ledger.ts`, `backend/domain/idempotency.ts`, `database/migrations/006_authoritative_ledger.sql`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

Las solicitudes y divisiones no mueven fondos al crearse. Rechazar tampoco mueve fondos. Los estados, recorridos y reglas se mantienen en la [ERS](ers.md) y los [CU canónicos](casos-uso.md). Los resultados observados se publican por revisión/huella en artefactos de CI.
