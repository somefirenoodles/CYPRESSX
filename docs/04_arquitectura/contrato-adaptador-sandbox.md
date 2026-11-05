# Operaciones sandbox actuales — registro PAG-01

**Estado:** operaciones locales implementadas en el camino activo; no hay adaptador ni proveedor externo conectado. Descripción por inspección estática, no certificación de ejecución.
**Límite:** todos los saldos, movimientos, comercios y tipos de cambio son de demostración; no representan pagos bancarios ni precios de mercado.

## Contratos HTTP activos

Las rutas de `backend/http/` se montan desde `backend/app.ts` bajo `/api`. Las rutas operativas con datos privados requieren sesión; salud, sesión, registro e inicio de sesión tienen acceso público según su contrato:

| Ruta | Comportamiento |
|---|---|
| `POST /api/fx/quotes` | Calcula y persiste cotización de fixture por moneda/importe. Tasas fijas en `backend/domain/money.ts`; expiry 10 min; respuesta indica “tasa fija de demostración; no es una cotización de mercado”. |
| `POST /api/payments` | Crea transferencia P2P sandbox, con clave idempotente, cuenta origen/destino, ledger y estado completado en Oracle. La UI pide y muestra la cotización/importes para revisión antes de confirmar; FX requiere cotización válida y no consumida cuando las monedas difieren. |
| `POST /api/payment-requests` | Crea solicitud pendiente sin cambios de saldo. El creador es solicitante; usuario destino es pagador. |
| `POST /api/payment-requests/:id/resolve` | Solo el pagador resuelve; bloquea fila y valida estado pendiente. Aceptar crea transferencia sandbox atómica; rechazar cambia estado sin asientos financieros. |
| `POST /api/splits` | Crea división y solicitudes de participaciones en Oracle; reparto equitativo a unidades menores; sin débito inicial. |
| `GET/POST/PATCH /api/recurrences` | Lista, crea o cambia estado active/paused/cancelled. El worker corre localmente en el proceso API, cada 30 segundos; vencimiento repetido usa clave por ocurrencia. Cada vencimiento registra una operación `completed` o `failed` y actualiza fecha/resultado/operación más reciente de la recurrencia dentro de la transacción. Saldo insuficiente marca ocurrencia failed. |
| `GET /api/merchants`, `POST /api/merchant-payments` | Lista comercios seed demo y procesa débito sandbox; la UI muestra cotización/importes para revisar antes de confirmar; admite cotización fixture a moneda del comercio. |
| `POST /api/sandbox/topups` | Agrega fondos ficticios a cuenta de prueba, con clave idempotente y asiento de clearing sandbox. |

Las rutas de salud, registro/login/logout y dashboard están en el mismo módulo. Sesión opaca se persiste en Oracle; autenticación no usa proveedor OAuth externo.

## Persistencia y semántica

`backend/domain/payments.ts` prepara la operación y delega su contabilización en `postJournal`. El ledger es autoritativo; autoriza desde las partidas y actualiza la proyección de saldo. La transacción corta conserva estado y notificación local de forma atómica; no abarca revisión del usuario ni llamadas externas. Ver [ADR-LED-001](ledger-interno.md).

La solicitud de FX lee tasas constantes para USD/COP/CRC, calcula en enteros y persiste monto, tasa, fecha de expiración y estado de consumo. Las tasas no se actualizan desde mercado ni de servicio externo. No fijan tarifas comerciales ni tasas aplicables fuera de esta demo.

## Límites y diferencias de producto

- No hay `quoteFx`/`submitPayment` como puerto externo, ni una tabla de provider attempts, callback, conciliación o settlement bancario. La antigua propuesta conceptual de adaptador no describe código implementado.
- `POST /api/sandbox/inbound-transfers` acredita fondos ficticios por referencia externa correlacionada e idempotente. No existe recepción bancaria real.
- `GET/PATCH /api/notifications` consulta y marca eventos privados durables; su inserción acompaña al comando financiero.
- La cancelación/chargeback/reversa de operaciones completadas no está implementada. Los errores no se deben rotular como rechazo de un proveedor externo.
- División no adelanta ni debita el total; cada participante recibe solicitud individual. El organizador queda fuera de las participaciones creadas por endpoint actual.
- La programación usa UTC anclado, consentimiento y un intento inicial más tres reintentos locales a 1 h, 24 h y 72 h. No acumula periodos perdidos y cancelar es terminal.

## Evidencia y trazabilidad

Implementación inspeccionada: `backend/http/routes.ts`, `backend/domain/payments.ts`, `backend/domain/money.ts`, `backend/domain/recurrence-worker.ts`, `backend/db/oracle.ts`, `database/migrations/001_initial.sql`, `backend/db/seed.ts` y `web/src/lib/api.ts`.

Relaciona RF-PROD-03/04/05/06/07/08/09/10, CU-PROD-01/02/03/04/05/06 y [invariantes sandbox](../01_requisitos/invariantes-financieros-sandbox.md). Las suites Oracle prueban API, rollback, concurrencia, inmutabilidad y proyecciones en una base desechable. Los resultados por revisión se conservan en los artefactos de CI.
