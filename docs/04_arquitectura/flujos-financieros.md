# Flujos financieros activos — PAG-01

**Estado:** descripción estática de las rutas y módulos activos. Ver [arquitectura implementada](./arquitectura-objetivo.md), [esquema Oracle](./esquema-oracle-propuesto.md) y [ledger](./ledger-interno.md).

## Contratos HTTP

Las rutas bajo `backend/http/` se montan en `backend/app.ts`. Las operaciones privadas requieren sesión. Las entradas se validan con Zod y las escrituras se ejecutan mediante una transacción Oracle.

| Ruta | Flujo |
|---|---|
| `POST /api/fx/quotes` | Calcula y persiste una cotización para importe y par de monedas; vence a los 10 minutos. |
| `POST /api/payments` | Crea pago P2P con clave idempotente, cuenta origen/destino, asiento y estado. La cotización se valida antes de contabilizar. |
| `POST /api/payment-requests` | Crea solicitud pendiente sin afectar saldos. |
| `POST /api/payment-requests/:id/resolve` | El pagador acepta o rechaza una solicitud pendiente; aceptación crea la transferencia dentro de la misma transacción. |
| `POST /api/splits/preview` y `/api/splits` | Calcula el reparto y crea la división con solicitudes individuales. |
| `GET/POST/PATCH /api/recurrences` | Consulta, crea, pausa, reactiva, cambia el importe o cancela una programación. |
| `GET /api/merchants`, `POST /api/merchant-payments` | Lista comercios habilitados y registra el pago correspondiente. |
| Recarga de saldo | Registra el abono y su asiento contable. |
| Recepción de fondos | Registra el abono con referencia e idempotencia. |
| `GET/PATCH /api/notifications` | Consulta notificaciones privadas y marca eventos como leídos. |

## Secuencia de contabilización

El endpoint valida la entrada y el usuario. El caso de uso obtiene o crea el estado necesario, valida la clave idempotente y prepara la operación. `postJournal` bloquea las cuentas afectadas, calcula balances desde las partidas publicadas, inserta y publica el asiento y actualiza las proyecciones. La notificación se guarda dentro de la misma transacción. El servidor confirma y devuelve el resultado; ante error se revierte el conjunto.

Las solicitudes y divisiones no generan débito al crearse. La resolución de solicitudes y la ejecución recurrente sí pueden generar un pago. La política de recurrencias está en `backend/domain/recurrence-policy.ts`; el worker de `backend/domain/recurrence-worker.ts` procesa vencimientos en el proceso API.

Las tasas permitidas, saldos iniciales y demás fixtures de ejecución se mantienen en código/seed y no se actualizan desde una fuente externa. Para la definición del alcance financiero, consultar la [nota cerrada](./alcance-financiero-cerrado.md).
