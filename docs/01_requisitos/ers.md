<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# ERS de Superpay — ERS-001

**Línea base:** 2026-11-04; vigente. La especificación está consolidada; su vigencia no certifica aceptación ni pruebas.

Definir la línea base verificable de requisitos funcionales, casos de uso y casos de prueba de Superpay, separando el comportamiento esperado del estado real de implementación y conservando la trazabilidad con el legado.

## Alcance

- Registro e inicio de sesión local con sesión asociada al usuario.
- Pago entre usuarios, solicitudes de pago, aceptación, rechazo, consulta e historial.
- Dinero exacto en unidades menores con dos decimales para USD, COP y CRC.
- División de gastos, recurrencias, notificaciones, cotización FX y pagos a comercios registrados.
- Operaciones de saldo: recargas y recepción de ingresos externos.
- Persistencia Oracle, transacciones y libro mayor (ledger) del camino activo backend/http.
- Patrones de idempotencia, reintento y gestión de clientes tomados de documentación pública, sin integración real.
- Evaluación dinámica de RNF con SQuaRE como guía, métricas locales y evidencia separada de automatización, agentes y usuarios finales.

## Fuera de alcance

- Reversos, contracargos y recuperación de fondos fuera de los RF existentes; quedan como decisión pendiente.
- Reversos, contracargos y recuperación de fondos fuera de los RF existentes; quedan como decisión pendiente.
- Cypress Cloud, Percy, proveedores externos de autenticación y dependencias obligatorias no locales.
- Aplicaciones React/Electron y rutas legacy como parte del runtime activo.
- Aprobación formal, conformidad o resultados de pruebas no ejecutadas.
- Certificación ISO y afirmaciones de cumplimiento financiero.

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

## Decisiones de producto

### D-01 — Idempotencia de operaciones financieras

Toda operación que crea o modifica dinero acepta una clave idempotente persistida. La misma clave con el mismo payload devuelve el resultado original sin duplicar efectos; la misma clave con payload distinto se rechaza sin efectos.

**Razón:** Evita dobles débitos y dobles solicitudes ante reintentos de red o del usuario, y hace explícito el conflicto de reutilización de clave.

**Fuentes:** S-STRIPE-IDEMPOTENCY, S-STRIPE-RETRIES.

### D-02 — Política de reintentos de recurrencias

Una recurrencia con saldo insuficiente se marca failed y se reintenta como máximo tres veces, con esperas visibles de 1 hora, 24 horas y 72 horas; después avanza al siguiente periodo sin reintentos adicionales. Estos intervalos son una política local reversible, no una recomendación normativa de Stripe. Los errores técnicos conservan rollback y se reintentan con backoff acotado sin adelantar la ocurrencia.

**Razón:** Equilibra recuperación de fallos transitorios con límites observables y evita reintentos indefinidos o silenciosos.

**Fuentes:** S-STRIPE-RETRIES.

### D-03 — Reparto exacto de centavos

En repartos iguales, el remanente se distribuye de forma determinista: 10 entre 3 produce 3.34, 3.33 y 3.33, asignando primero los centavos sobrantes según el orden estable de participantes. La suma de participaciones siempre iguala el total.

**Razón:** El dinero se representa en unidades menores; ninguna suma puede perder ni inventar centavos.

**Fuentes:** Decisión local del proyecto.

### D-04 — Organizador en la división de gastos

La inclusión del organizador es configurable. Puede incluirse a sí mismo sin crear una solicitud de pago contra su propia cuenta.

**Razón:** El organizador puede o no participar del gasto; autosolicitarse produciría un movimiento sin sentido contable.

**Fuentes:** Decisión local del proyecto.

### D-05 — Calendario y recurrencias en UTC

Las fechas de recurrencia se anclan en UTC y los periodos semanales, mensuales y trimestrales se calculan desde esa ancla; la presentación puede localizarse sin alterar el cálculo. Los periodos perdidos por indisponibilidad se saltan, sin cobros acumulados.

**Razón:** Un ancla única evita duplicados o saltos por zonas horarias y cambios de horario.

**Fuentes:** Decisión local del proyecto.

### D-06 — Privacidad personal por defecto

Historial, detalle y notificaciones se filtran en servidor por destinatario o participante. La visibilidad de contactos es la mínima necesaria y nunca expone movimientos privados ajenos.

**Razón:** La autorización no puede depender de que la interfaz oculte datos.

**Fuentes:** Decisión local del proyecto.

### D-07 — Reversos y recuperación fuera de los RF existentes

No se agregan requisitos de reverso, contracargo ni recuperación en esta línea base. Cualquier necesidad futura requiere requisito, criterio reproducible y regresión propios.

**Razón:** Evita ampliar alcance funcional sin análisis de dominio ni trazabilidad; la referencia pública de reembolsos se conserva solo como patrón conceptual.

**Fuentes:** S-STRIPE-REFUNDS.

### D-08 — Patrones para servicios financieros

Se adoptan patrones de idempotencia, reintento y gestión de clientes para operaciones financieras con dependencias externas desacopladas.

**Razón:** El objetivo del producto es una aplicación web operable y reproducible, con reglas de pago verificables y una arquitectura local mantenible.

**Fuentes:** S-STRIPE-IDEMPOTENCY, S-STRIPE-RETRIES, S-STRIPE-PORTAL, S-ISO-78176, S-ISO-78177, S-ISO-83467.

### D-09 — Dinero exacto en unidades menores

Los importes se persisten como enteros en unidades menores con dos decimales para USD, COP y CRC. La interfaz no convierte a Number para cálculos financieros ni descarta la clave de reintento.

**Razón:** Los tipos binarios de punto flotante introducen errores de redondeo incompatibles con saldos y ledger.

**Fuentes:** Decisión local del proyecto.

### D-10 — Ledger interno autoritativo

El ledger de doble entrada es la fuente de verdad. Los asientos se contabilizan atómicamente, cuadran por moneda y son inmutables; los saldos son proyecciones reconstruibles. La transacción Oracle se limita al comando confirmado y sus efectos locales, sin abarcar interacción del usuario ni llamadas externas.

**Razón:** Decisión del usuario. La doble entrada define la contabilidad; la atomicidad garantiza la integridad de su escritura.

**Fuentes:** S-STRIPE-LEDGER.

### D-11 — Concurrencia y futura extracción del ledger

La deduplicación reserva cada intención por usuario, acción y clave; no se bloquea al usuario completo. La contabilización bloquea solo cuentas afectadas en orden estable. Una futura extracción a microservicio conservará el contrato lógico y requerirá outbox/inbox y recuperación de mensajes; no se introduce infraestructura adicional en esta etapa.

**Razón:** Reducir contención innecesaria sin eliminar controles contra sobregiro y sin desplegar un servicio antes de medir la necesidad.

**Fuentes:** S-STRIPE-LEDGER.

## Fuentes

- S-STRIPE-IDEMPOTENCY: [Stripe API — Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- S-STRIPE-RETRIES: [Stripe Billing — Smart retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries)
- S-STRIPE-REFUNDS: [Stripe — Refunds](https://docs.stripe.com/refunds)
- S-STRIPE-PORTAL: [Stripe — Customer management](https://docs.stripe.com/customer-management)
- S-ISO-78176: [ISO 78176 — Financial services (referencia de dominio)](https://www.iso.org/standard/78176.html)
- S-ISO-78177: [ISO 78177 — Financial services (referencia de dominio)](https://www.iso.org/standard/78177.html)
- S-ISO-83467: [ISO 83467 — Financial services (referencia de dominio)](https://www.iso.org/standard/83467.html)
- S-STRIPE-LEDGER: [Stripe: Ledger, tracking and validating money movement](https://stripe.com/blog/ledger-stripe-system-for-tracking-and-validating-money-movement)

## Reglas de negocio

## RN-TX-01 — Separación entre pago y solicitud

Un pago confirmado aplica efectos financieros. Crear una solicitud no mueve saldo; solo la aceptación autorizada puede generar el pago.

**Requisitos relacionados:** RF-TX-01, RF-TX-02, RF-TX-04.

## RN-TX-02 — El rechazo no mueve dinero

Rechazar una solicitud pendiente cambia su estado sin débito, crédito ni partida contable.

**Requisitos relacionados:** RF-TX-05.

## RN-TX-03 — Resolución única

Una solicitud solo pasa de pendiente a un estado final una vez; cualquier repetición no produce efectos financieros adicionales.

**Requisitos relacionados:** RF-TX-04, RF-TX-05, RF-TX-06.

## RN-TX-04 — Correspondencia de actores

requester_id identifica al solicitante y payer_id al pagador autorizado para aceptar o rechazar. Al aceptar, el pagador paga al solicitante. senderId/receiverId son nombres del modelo histórico.

**Requisitos relacionados:** RF-TX-03, RF-TX-04, RF-TX-08.

## RN-TX-05 — Atomicidad lógica

El comando confirmado persiste operación, asiento, proyección y notificación local de forma atómica; un fallo no deja efectos financieros parciales.

**Requisitos relacionados:** RF-LED-01, RF-NOT-01.

## RN-TX-06 — Precisión monetaria

Entradas, cálculos y persistencia conservan unidades menores exactas; las tres monedas habilitadas utilizan dos decimales.

**Requisitos relacionados:** RF-TX-07.

## RN-TX-07 — Autorización en servidor

El servidor comprueba identidad y permisos en cada acceso; ocultar controles en la interfaz no concede ni sustituye permisos.

**Requisitos relacionados:** RF-TX-08.

## RN-TX-08 — Notificaciones sin duplicación

Una resolución válida genera el evento correspondiente; reintentos inválidos o resoluciones repetidas no duplican notificaciones.

**Requisitos relacionados:** RF-NOT-01, RF-TX-06.

## RN-TX-09 — Evidencia reproducible

Toda conclusión de prueba identifica revisión, huella de fuentes, entorno, datos sintéticos, actor, pasos, resultado esperado y observado; no se registran secretos.

**Requisitos relacionados:** RNF-MAN-01, RNF-REL-01.

## RN-PROD-01 — Entorno financiero explícito

Pantallas, comprobantes y notificaciones muestran contraparte, importe, moneda y estado mediante descripciones claras.

**Requisitos relacionados:** RF-SBX-01, RF-ING-01, RF-COM-01.

## RN-PROD-02 — Importe y moneda explícitos

La operación conserva importe y moneda de origen y destino, cuando corresponda, usando precisión exacta.

**Requisitos relacionados:** RF-TX-07, RF-FX-01.

## RN-PROD-03 — Cotización visible antes de confirmar

La conversión muestra importes, monedas, tasa aplicada y vencimiento antes de confirmar.

**Requisitos relacionados:** RF-FX-01.

## RN-PROD-04 — Confirmación del usuario

La salida requiere revisión y confirmación; cancelar antes de confirmar no crea un movimiento ni cambia saldos.

**Requisitos relacionados:** RF-TX-01, RF-COM-01.

## RN-PROD-05 — Consistencia de cada operación

La operación y sus efectos locales se contabilizan o revierten íntegramente; no hay débitos sin contrapartida.

**Requisitos relacionados:** RF-LED-01.

## RN-PROD-06 — Idempotencia

Repetir la misma intención con idénticos parámetros devuelve su resultado sin duplicar efectos; otros parámetros con la misma clave producen conflicto.

**Requisitos relacionados:** RF-TX-06, RF-LED-01.

## RN-PROD-07 — Pago entre personas

Un pago confirmado identifica pagador, destinatario, importe, moneda y estado; los límites adicionales quedan sujetos a una decisión de producto.

**Requisitos relacionados:** RF-TX-01.

## RN-PROD-08 — Solicitudes de pago

Crear una solicitud no mueve saldo. Solo el pagador puede aceptar o rechazar mientras esté pendiente; la resolución financiera es única.

**Requisitos relacionados:** RF-TX-02, RF-TX-04, RF-TX-05, RF-TX-06.

## RN-PROD-09 — División de gastos

La suma de cuotas coincide con el total; el residuo se asigna a primeros participantes, se revisa antes de confirmar y el organizador puede incluirse sin autosolicitud.

**Requisitos relacionados:** RF-GAS-01.

## RN-PROD-10 — Pagos recurrentes

La instrucción requiere consentimiento, calendario UTC anclado y estado consultable; cada ocurrencia tiene identidad propia. Aplica los tres reintentos locales acotados y cancelar impide futuros cobros.

**Requisitos relacionados:** RF-REC-01.

## RN-PROD-11 — Autorización y privacidad

Cada usuario accede solo a datos propios o expresamente compartidos como participante; las cuentas y notificaciones ajenas permanecen privadas.

**Requisitos relacionados:** RF-TX-08, RF-TX-09, RF-TX-10, RF-NOT-01, RF-CTA-01.

## RN-PROD-12 — Historial auditable

Los movimientos financieros se reconstruyen con identificador, actor, fecha, importe, estado y contrapartidas inmutables. La retención de datos personales requiere una política separada.

**Requisitos relacionados:** RF-LED-01, RF-TX-09, RF-TX-10.

## RN-PROD-13 — Pago a comercio extranjero

El usuario revisa comercio, importe, moneda y cotización aplicable antes de confirmar el pago.

**Requisitos relacionados:** RF-COM-01, RF-FX-01.
