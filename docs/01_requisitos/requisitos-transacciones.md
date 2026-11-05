<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Requisitos del núcleo transaccional

La línea base vigente se mantiene en [la ERS](ers.md), los [CU canónicos](casos-uso.md) y la [matriz única](matriz-trazabilidad.md). Editar `catalogo.json` y ejecutar `pnpm docs:generate`; esta vista no tiene un proceso independiente de aprobación o formato.

## RF-TX-01 — Realizar pago entre usuarios

El sistema debe permitir a un usuario autenticado transferir un importe exacto a otro usuario existente, con débito, crédito y registro en el ledger dentro de una sola transacción.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-TX-01.

- **RF-TX-01-A1:** Se valida sesión, destinatario existente, importe positivo, saldo suficiente y moneda soportada antes de ejecutar.
- **RF-TX-01-A2:** El débito al pagador y el crédito al destinatario son exactos, atómicos y quedan registrados en el ledger.
- **RF-TX-01-A3:** La clave idempotente se persiste; repetir la misma clave con el mismo payload no duplica el pago y con payload distinto se rechaza.
- **RF-TX-01-A4:** Un usuario no puede debitar cuentas ajenas ni pagar sin autorización de la cuenta origen.
- **RF-TX-01-A5:** La respuesta y los errores no exponen saldos, identificadores ni movimientos de terceros.
- **RF-TX-01-A6:** El pago confirmado genera una notificación persistida al destinatario en la misma transacción; reintentos no la duplican.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-TX-02 — Crear solicitud de pago

El sistema debe permitir crear una solicitud de pago pendiente dirigida a un usuario existente, sin modificar saldos al crearla.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-TX-02.

- **RF-TX-02-A1:** Se validan sesión, destinatario existente, importe positivo y moneda soportada.
- **RF-TX-02-A2:** La solicitud se crea en estado pendiente y no produce débito ni crédito.
- **RF-TX-02-A3:** Una clave idempotente repetida con el mismo payload no crea solicitudes duplicadas.
- **RF-TX-02-A4:** Los errores de validación no generan solicitudes ni notificaciones parciales.
- **RF-TX-02-A5:** La creación genera una notificación persistida al pagador, sin modificar los saldos.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-TX-03 — Consultar solicitudes y estado

El sistema debe permitir al usuario autorizado consultar sus solicitudes de pago y el estado actual de cada una.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-TX-03.

- **RF-TX-03-A1:** Solo el pagador, el destinatario o un participante autorizado puede consultar la solicitud.
- **RF-TX-03-A2:** La consulta devuelve importe, tipo, fecha, participantes y estado.
- **RF-TX-03-A3:** Un identificador inexistente o ajeno se rechaza sin revelar su existencia.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-TX-04 — Aceptar solicitud de pago

El destinatario de una solicitud pendiente debe poder aceptarla, ejecutando el pago exacto una sola vez.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-TX-04.

- **RF-TX-04-A1:** Solo el destinatario puede aceptar una solicitud pendiente y debe tener saldo suficiente.
- **RF-TX-04-A2:** La aceptación debita, acredita, registra el ledger y cambia el estado a aceptada de forma atómica.
- **RF-TX-04-A3:** Repetir la aceptación no vuelve a debitar y devuelve un conflicto o el resultado idempotente.
- **RF-TX-04-A4:** Aceptar genera una notificación persistida al solicitante de forma atómica con el pago y la resolución.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-TX-05 — Rechazar solicitud de pago

El destinatario de una solicitud pendiente debe poder rechazarla sin que se mueva dinero.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-TX-05.

- **RF-TX-05-A1:** Solo el destinatario puede rechazar una solicitud pendiente.
- **RF-TX-05-A2:** El rechazo cambia el estado a rechazada sin débito, crédito ni asiento financiero.
- **RF-TX-05-A3:** Repetir el rechazo no produce efectos adicionales ni notificaciones duplicadas.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

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

## RF-TX-08 — Autorización de operaciones

El sistema debe autorizar en servidor cada operación privada o mutadora según el actor y el recurso.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-TX-01, CU-TX-02, CU-TX-03, CU-TX-04, CU-TX-05, CU-CTA-01, CU-CON-01, CU-GAS-01, CU-NOT-01, CU-REC-01, CU-COM-01, CU-ING-01.

- **RF-TX-08-A1:** Todo endpoint privado o mutador exige sesión y verifica la titularidad o participación del actor.
- **RF-TX-08-A2:** Las respuestas 401 y 403 son genéricas y no revelan la existencia de recursos ajenos.
- **RF-TX-08-A3:** Ocultar una opción en la interfaz no sustituye la autorización del servidor.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.
