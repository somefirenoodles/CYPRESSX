# ADR-LED-001 — Ledger interno autoritativo de doble entrada

- **Estado:** aceptado e implementado en el camino activo.
- **Fecha:** 2026-11-04.
- **Alcance:** libro sandbox en USD, COP y CRC; no mueve dinero real ni certifica ISO.
- **Fuentes:** [ERS](../01_requisitos/ers.md) y [matriz de trazabilidad](../01_requisitos/matriz-trazabilidad.md).

## Resumen

1. El ledger interno en Oracle es la fuente autoritativa y registra doble entrada.
2. Cada asiento exige al menos dos partidas y suma cero por moneda.
3. El saldo visible es una proyección reconstruible y reconciliable.
4. La confirmación conserva una transacción SQL corta y no usa RPC.
5. Un microservicio futuro requerirá coordinación, deduplicación y conciliación.

## Decisión

El ledger interno es la fuente de verdad de los movimientos financieros y usa
doble entrada. La contabilización se mantiene dentro de transacciones Oracle
cortas, junto con los cambios de negocio que la originan. No se introduce ahora
un servicio externo de ledger, Kafka ni RPC.

La referencia conceptual es la publicación oficial de Stripe sobre su ledger:
<https://stripe.com/blog/ledger-stripe-system-for-tracking-and-validating-money-movement>.
Se toma como referencia de doble entrada y conciliación, no como afirmación de
que este diseño sea el ledger interno de Stripe, use su arquitectura exacta o
que Oracle sea el ledger de Stripe.

## Contexto

La aplicación es una demo académica y operable en sandbox. Pagos, FX, saldos,
comercios y top-ups son ficticios. El ledger actual vive en Oracle y conserva la
atomicidad SQL de la escritura; esta decisión no reemplaza la consistencia
transaccional con un libro eventualmente consistente.

La extracción a un microservicio es una posibilidad futura, no el diseño actual.
Si se realiza, debe conservar el mismo modelo lógico y un contrato de comandos
de posting e identificadores estables.

## Modelo e invariantes

- Cada `Entry` contiene `accountId` de usuario o `systemAccount`, moneda
  (`USD`, `COP` o `CRC`), `amountMinor` como `bigint` y `type`.
- Las cuentas de usuario usan `account:<id>`. Las cuentas de sistema son
  explícitas: `system:fx:<moneda>`, `system:merchant:<id>:<moneda>` y
  `system:sandbox_funding:<moneda>`.
- Cada asiento tiene al menos dos partidas y suma cero **por moneda**. Las
  partidas de una operación FX no se suman entre divisas distintas.
- `cx_ledger_journals` registra `operation_id` único, hash del payload y estado
  `draft/posted`. `cx_ledger_entries` referencia el journal y la cuenta lógica.
- Los asientos posteados y sus partidas son inmutables. Los triggers `006`
  impiden actualizar/eliminar journals posteados, agregar partidas a un journal
  posteado y sellar un asiento que no cumpla suma cero y mínimo de dos partidas.
- `cx_accounts.balance_minor` es una **proyección reconstruible**, no la fuente
  de verdad. Su corrupción no convierte el saldo en autoritativo.

## Posting y concurrencia

`postJournal(connection, operationId, entries)` valida el asiento y autoriza
calculando la suma del ledger posteado, bloqueando únicamente las cuentas
afectadas y en orden estable de identificadores. Así evita saldos negativos sin
serializar todas las operaciones del sistema.

La idempotencia se apoya en una reserva única por `(actor, scope, key)`. Un
competidor espera a que la operación complete o haga rollback; si el payload no
coincide con el hash registrado, responde `409`. Ya no se usa un mutex por
usuario. Repetir el mismo `operationId` con el mismo journal es un replay sin
efecto financiero adicional.

El ciclo de negocio (preparar, cotizar, revisar y confirmar) ocurre fuera de la
transacción. Al confirmar, el estado, los asientos, la proyección y la
notificación corta se persisten en **la misma transacción**. No se elimina la
atomicidad SQL porque el ledger no sustituye la consistencia de escritura.

## Validación y conciliación

`validateJournal`, `journalHash` y `reconcileLedger` comprueban estructura,
integridad del payload, suma cero por moneda y correspondencia entre ledger y
proyección. La conciliación es una comprobación derivada, no una segunda fuente
de verdad.

## Migración

La migración conserva las entradas legacy y las valida al cierre; no borra
datos. El DDL de Oracle puede confirmar parcialmente, por lo que cualquier
cambio de esquema debe probarse primero sobre una copia o entorno sandbox antes
de aplicarse al original.

## Escalado futuro

Antes de migrar se deben medir los RNF aplicables. Las cuentas muy activas
pueden contendir y la suma del ledger crece con el volumen. Los snapshots, la
proyección versionada y las particiones son experimentos posibles, no
componentes implementados.

Extraer un servicio exige outbox/inbox, entrega al menos una vez, deduplicación,
estados recuperables y conciliación para lograr efecto financiero exactly-once.
Sin esa coordinación no se debe prometer exactly-once. Se conservará el contrato
de comandos de posting e IDs, pero no se activará RPC en esta etapa.

## Evidencia preliminar

En esta sesión se ejecutaron 37 pruebas Vitest sobre un Oracle desechable: todas
aprobadas, incluidas cuatro de ledger y las integraciones `CP-IDEM04`
(concurrencia con la misma clave), `CP-TX17` (rollback), `CP-LED04`
(inmutabilidad/replay), `CP-LED05` (proyección corrupta) y 2×1500 operaciones
concurrentes con un solo éxito; la conciliación devolvió sus cuatro banderas en
`true`. Es evidencia preliminar de esta sesión, no un resultado final
versionado: los informes y la huella documental pueden cambiar. El comando
`pnpm ledger:check` está pendiente de registrar en `main`.

## Consecuencias

- Toda operación que mueva saldo debe pasar por un posting del ledger.
- La proyección se puede reconstruir y reconciliar; no se edita como si fuera el
  libro.
- La consistencia transaccional actual se conserva hasta que exista una
  migración medida y coordinada.
- La documentación no acredita certificación ISO, integración bancaria ni
  disponibilidad de un servicio externo de ledger.
