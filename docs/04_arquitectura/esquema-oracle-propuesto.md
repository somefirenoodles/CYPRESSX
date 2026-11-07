# Esquema Oracle activo — registro DAT-01

**Estado:** esquema SQL versionado e implementado; esta descripción es estática y no demuestra que la migración haya corrido en un entorno.
**Fuente de verdad:** la cadena versionada [`database/migrations/`](../../database/migrations/), aplicada por `pnpm db:migrate` y preparada junto con comercios iniciales por `pnpm db:setup`.

## Tablas y responsabilidades

| Tabla | Uso actual |
|---|---|
| `cx_users` | Cuenta, identificador, hash de contraseña, nombre y correo; username y email únicos. |
| `cx_accounts` | Proyección reconstruible de saldo por usuario/moneda en `balance_minor NUMBER(20,0)`; único por usuario/moneda, saldo no negativo. |
| `cx_sessions` | Hash SHA-256 del token opaco, propietario y expiración. El token claro vive en cookie HttpOnly. |
| `cx_fx_quotes` | Cotización de fixture: pares, importe en unidades menores, tasa `NUMBER(20,8)`, expiración y consumo. |
| `cx_merchants` | Comercios de demo activos; seed contiene Café Istmo (PA/USD), Pacific Market (US/USD), Mercado Andino (CO/COP), Pura Vida Shop (CR/CRC). No son comercios conectados. |
| `cx_operations` | Pago P2P, pago a comercio, ejecución recurrente o recarga; incluye clave idempotente, importes/monedas de origen y destino, estado y relación a usuario/destinatario/comercio. |
| `cx_ledger_entries` | Asientos firmados en unidades menores para cuenta y contrapartida de clearing, ligados a operación. |
| `cx_payment_requests` | Solicitante, pagador, importe, estado pendiente/aceptada/rechazada y operación de aceptación. |
| `cx_splits` | División de gasto por propietario, título, total y moneda. |
| `cx_split_participants` | Participaciones y solicitud asociada; único usuario por división. |
| `cx_recurrences` | Instrucción periódica, próximo vencimiento, estado y resultado/operación más reciente. |
| `cx_schema_migrations` | Tabla de control creada por el runner para registrar scripts aplicados. |

El runner ordena los `.sql` de `database/migrations/`, registra versión y tolera tablas ya existentes con ORA-00955. Oracle puede confirmar DDL automáticamente; cada migración nueva debe ser revisable y no depender de rollback DDL.

## Contrato monetario aplicado

`backend/domain/money.ts` acepta USD, COP y CRC, exige importes positivos con hasta dos decimales y los convierte a `bigint` de centavos. El código y columnas Oracle almacenan esos centavos como enteros; tasas FX se expresan con ocho decimales y redondeo entero determinista al calcular destino. Las tasas se mantienen como fixtures explícitas del código. No usar `Number` como unidad persistida o para sumar/restar balances.

## Integridad observada

- Claves foráneas ligan cuentas, operaciones, solicitudes, merchants, sesiones, divisiones y recurrencias con sus propietarios/actores.
- `cx_operations` impone unicidad de `(user_id, idempotency_key)`; el dominio bloquea cuentas y verifica saldo antes del débito.
- `cx_accounts` impide saldo negativo. `cx_payment_requests` restringe estados a `pending`, `accepted`, `rejected`; aceptación/rechazo bloquea la solicitud y comprueba que el usuario actual sea el pagador.
- Operaciones, cambios de balance y asientos se ejecutan mediante `withTransaction` en Oracle. Fallos SQL revierten la transacción DML.

## Límites conocidos que no deben ocultarse

- `cx_notifications` conserva eventos privados con clave única por destinatario/evento y fecha de lectura.
- `cx_idempotency_records` reserva cada intención por usuario/acción/clave y guarda hash y respuesta.
- `cx_contacts`, `cx_bank_accounts` y `cx_inbound_transfers` soportan contactos, cuentas enmascaradas y recepciones por referencia por referencia.
- `cx_ledger_journals` agrupa partidas; la migración 006 protege contabilización e inmutabilidad. `pnpm ledger:check` valida cuadre, proyecciones y ausencia de diarios pendientes.
- La migración 005 añade consentimiento, ocurrencia nominal, día ancla y reintentos acotados; las instrucciones anteriores sin consentimiento quedan pausadas.
- No hay tabla de intentos/respuestas de un proveedor externo: el código no integra un proveedor. Operaciones y cotizaciones son internas/deterministas.
- No hay proceso de migración de datos desde `data/database.json` o el seed legacy; `pnpm db:seed` solo carga/actualiza comercios demo. No asumir que usuarios, saldos o transacciones heredadas se copiaron.
- `cx_operations.status` se limita hoy a `completed` y `failed`; los estados inciertos de un proveedor no existen porque no hay llamada externa.
- La idempotencia de operaciones se aplica a pagos/transferencias con clave por usuario; alta de solicitudes, cotizaciones y creación de divisiones no reciben actualmente la misma clave en sus contratos.
- El esquema no implementa ledger de auditoría para cada transición de solicitud ni una política de reversas/chargebacks.

## Referencias de comportamiento y validación

Consultar [requisitos financieros](../01_requisitos/catalogo.json), [flujos financieros](./flujos-financieros.md), [requisitos transaccionales](../01_requisitos/requisitos-transacciones.md) y [normas de prueba](../02_pruebas/normas-y-estrategia-pruebas.md). `web/src/lib/oracle.integration.test.ts` contiene una integración Oracle condicionada a `DB_CONNECT_STRING`; esta auditoría no la ejecutó. Esta ficha no certifica restricciones dinámicas, concurrencia ni migración de datos.
