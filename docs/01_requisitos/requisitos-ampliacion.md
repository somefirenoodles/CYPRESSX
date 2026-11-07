<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Requisitos funcionales de ampliación

La línea base vigente se mantiene en [la ERS](ers.md), los [CU canónicos](casos-uso.md) y la [matriz única](matriz-trazabilidad.md). Editar `catalogo.json` y ejecutar `pnpm docs:generate`; esta vista no tiene un proceso independiente de aprobación o formato.

## RF-AUT-01 — Autenticación segura

El sistema debe permitir iniciar sesión a un usuario registrado únicamente con credenciales válidas.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-AUT-01.

- **RF-AUT-01-A1:** Las credenciales se validan en el servidor y la sesión queda asociada al usuario correcto.
- **RF-AUT-01-A2:** Los recursos privados rechazan el acceso sin sesión válida y exigen nuevo acceso tras la expiración.
- **RF-AUT-01-A3:** Las credenciales incorrectas producen una respuesta no autenticada sin revelar si el usuario existe.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-AUT-02 — Registro de cuenta

El sistema debe registrar usuarios con identificadores únicos y datos obligatorios válidos.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-AUT-02.

- **RF-AUT-02-A1:** Se comprueba la coincidencia de contraseña y confirmación y se rechazan campos obligatorios inválidos.
- **RF-AUT-02-A2:** Se impiden identificadores duplicados y no quedan registros parciales si falla la operación.
- **RF-AUT-02-A3:** La contraseña se almacena con un mecanismo no reversible adecuado y nunca se devuelve en claro.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-TX-09 — Historial personal de transacciones

El sistema debe permitir consultar los movimientos permitidos al usuario autenticado.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-TX-03.

- **RF-TX-09-A1:** Se recuperan pagos y solicitudes propios sin incluir movimientos privados ajenos.
- **RF-TX-09-A2:** Se muestra importe, tipo, fecha, participantes y estado.
- **RF-TX-09-A3:** Cuando hay paginación, el orden es estable y no se repiten registros.

**Archivos:** `backend/http/customer-routes.ts`, `web/src/lib/History.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-TX-10 — Consulta de detalle y visibilidad

El sistema debe permitir consultar el detalle de transacciones existentes cuando el actor tenga permiso.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-TX-03.

- **RF-TX-10-A1:** El servidor permite el detalle personal únicamente a participantes; las vistas públicas o de contactos del legado quedan retiradas de esta línea base.
- **RF-TX-10-A2:** Se rechazan identificadores inexistentes y accesos no autorizados sin revelar datos.
- **RF-TX-10-A3:** Las opciones de aceptar o rechazar aparecen solo según actor y estado, sin sustituir la autorización del servidor.

**Archivos:** `backend/http/customer-routes.ts`, `web/src/lib/History.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-CTA-01 — Administración de cuentas vinculadas

El sistema debe permitir a cada usuario listar, asociar y deshabilitar las cuentas vinculadas a su perfil.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-CTA-01.

- **RF-CTA-01-A1:** El usuario puede listar, asociar y deshabilitar solo sus propias cuentas.
- **RF-CTA-01-A2:** Los datos de asociación se validan antes de persistir y no se permite modificar cuentas ajenas.
- **RF-CTA-01-A3:** Se minimiza la exposición de identificadores bancarios y una falla no deja estado parcial.
- **RF-CTA-01-A4:** La asociación permite administrar únicamente datos propios y protege la exposición de identificadores.

**Archivos:** `backend/http/customer-routes.ts`, `web/src/lib/AccountTools.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-CON-01 — Búsqueda y gestión de contactos

El sistema debe permitir buscar usuarios visibles y administrar la lista de contactos propios sin duplicados ni cambios sobre usuarios o movimientos históricos.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-CON-01.

- **RF-CON-01-A1:** La búsqueda muestra solo información permitida por las reglas de privacidad.
- **RF-CON-01-A2:** No se crean relaciones de contacto duplicadas y la eliminación no borra usuarios ni transacciones históricas.
- **RF-CON-01-A3:** La interfaz permite altas y bajas de contactos persistidas y muestra estado vacío y errores sin alterar usuarios ni historial.

**Archivos:** `backend/http/customer-routes.ts`, `web/src/lib/AccountTools.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-GAS-01 — División de gastos

El sistema debe permitir repartir un gasto entre participantes y crear solicitudes de pago individuales exactas.

**Prioridad:** alta. **Implementación:** Presente en código. **CU:** CU-GAS-01.

- **RF-GAS-01-A1:** Se validan importe positivo, participantes únicos y distribución exacta en centavos.
- **RF-GAS-01-A2:** El reparto igual distribuye el remanente de forma determinista y muestra el desglose antes de confirmar.
- **RF-GAS-01-A3:** La creación de solicitudes pendientes es coherente y no modifica saldos.
- **RF-GAS-01-A4:** El reintento no duplica solicitudes y se respetan las reglas de aceptación, rechazo y autorización.
- **RF-GAS-01-A5:** La inclusión del organizador es configurable y puede participar sin autogenerar una solicitud contra sí mismo.

**Archivos:** `backend/http/money-workflow-routes.ts`, `backend/domain/splits.ts`, `web/src/lib/SplitForm.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-NOT-01 — Notificaciones de eventos

El sistema debe mostrar notificaciones de eventos relevantes solo al destinatario autorizado.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-NOT-01.

- **RF-NOT-01-A1:** El servidor filtra por destinatario y no expone eventos de terceros.
- **RF-NOT-01-A2:** Se presenta un estado vacío cuando no existen notificaciones.
- **RF-NOT-01-A3:** Resoluciones inválidas o repetidas no crean eventos financieros duplicados.

**Archivos:** `backend/http/customer-routes.ts`, `web/src/lib/AccountTools.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-FX-01 — Cotización de divisas

El sistema debe permitir obtener una cotización FX y aplicarla opcionalmente a un pago.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-FX-01.

- **RF-FX-01-A1:** La cotización indica importes, par de monedas, tasa, fecha y vigencia.
- **RF-FX-01-A2:** Cuando hay conversión, la cotización propia, vigente y no consumida es obligatoria; el importe debitado y recibido coincide con la cotización persistida.
- **RF-FX-01-A3:** Pares inválidos o cotizaciones vencidas se rechazan sin mover dinero.
- **RF-FX-01-A4:** La cotización presenta importe, par de monedas, tasa aplicada y vigencia.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-REC-01 — Recurrencias de pago

El sistema debe permitir programar pagos recurrentes semanales, mensuales o trimestrales y procesarlos según su calendario.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-REC-01.

- **RF-REC-01-A1:** La recurrencia se crea con periodicidad weekly, monthly o quarterly y próxima fecha anclada en UTC.
- **RF-REC-01-A2:** El propietario puede pausar, reanudar, cambiar el importe y cancelar definitivamente; otro usuario no puede hacerlo. Una recurrencia cancelada no se reactiva.
- **RF-REC-01-A3:** El worker de 30 segundos procesa vencimientos; con saldo insuficiente marca failed y aplica como máximo tres reintentos visibles a 1, 24 y 72 horas antes de avanzar.
- **RF-REC-01-A4:** Cada ocurrencia genera como máximo un pago y un asiento, sin duplicados por reintento o ejecución concurrente.
- **RF-REC-01-A5:** Crear o cambiar el importe exige consentimiento explícito; las instrucciones antiguas sin consentimiento quedan pausadas hasta nueva autorización.
- **RF-REC-01-A6:** Los periodos perdidos por indisponibilidad se saltan sin acumular cobros y se conserva el día ancla UTC.

**Archivos:** `backend/http/recurrence-routes.ts`, `backend/domain/recurrence-worker.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-COM-01 — Pago a comercio

El sistema debe permitir pagar a comercios registrados y registrar el movimiento en el ledger.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-COM-01.

- **RF-COM-01-A1:** Se valida sesión, comercio existente, importe positivo y moneda soportada.
- **RF-COM-01-A2:** El pago debita al pagador y registra su contrapartida de comercio en el ledger de forma atómica.
- **RF-COM-01-A3:** Comercios inexistentes, inactivos o accesos no autorizados se rechazan sin mover dinero.
- **RF-COM-01-A4:** El resumen de confirmación muestra comercio, importe, moneda y estado de la operación.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-SBX-01 — Operaciones de saldo

El sistema debe permitir recargas de saldo con validación de usuario, límites y registro contable.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-SBX-01.

- **RF-SBX-01-A1:** Las recargas se ejecutan solo para el usuario autenticado y dentro de límites configurados.
- **RF-SBX-01-A2:** La recarga acredita el saldo y registra el asiento de origen correspondiente.
- **RF-SBX-01-A3:** La interfaz y la API muestran importe, moneda y estado de la operación.
- **RF-SBX-01-A4:** Los reintentos no duplican la recarga y los errores no dejan saldo parcial.

**Archivos:** `backend/http/routes.ts`, `backend/domain/payments.ts`, `web/src/App.svelte`.

**Brechas:** Sin brechas estáticas registradas; requiere evidencia dinámica.

## RF-ING-01 — Recepción de ingreso externo

El sistema debe permitir registrar un ingreso externo con referencia única.

**Prioridad:** media. **Implementación:** Presente en código. **CU:** CU-ING-01.

- **RF-ING-01-A1:** El ingreso se registra con referencia externa única, importe exacto, moneda y estado verificable.
- **RF-ING-01-A2:** Una referencia externa repetida con el mismo payload devuelve la misma operación; la misma referencia con datos distintos se rechaza sin acreditar dos veces.
- **RF-ING-01-A3:** La interfaz y la API presentan el importe, la moneda, la referencia y el estado de la operación.

**Archivos:** `backend/http/money-workflow-routes.ts`, `web/src/lib/AccountTools.svelte`.

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
