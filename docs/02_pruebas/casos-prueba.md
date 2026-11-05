<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Casos de prueba canónicos

Los resultados esperados son criterios de diseño. Los resultados observados se guardan por ejecución, con revisión y huella de fuentes.

## CP-AUT-01 — Inicio de sesión válido asocia la sesión al usuario

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-AUT-01-A1.

**Precondiciones:**

- Usuario sintético registrado y activo.

**Datos:** {"usuario":"ana.sandbox","password":"[dato sintético proporcionado durante la ejecución; no registrar]"}

**Pasos:**

1. Enviar credenciales válidas al endpoint de login.
2. Consultar el recurso privado con la sesión obtenida.

**Resultado esperado:**

- La autenticación responde con sesión válida.
- El recurso privado devuelve datos de ana.sandbox y no de otro usuario.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-AUT-02 — Credenciales inválidas y acceso privado sin sesión

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-AUT-01-A2, RF-AUT-01-A3.

**Precondiciones:**

- Usuario sintético registrado.
- No existe sesión activa.

**Datos:** {"usuario":"ana.sandbox","password":"[dato sintético proporcionado durante la ejecución; no registrar]"}

**Pasos:**

1. Enviar contraseña incorrecta.
2. Intentar acceder a un recurso privado sin sesión.
3. Comparar mensajes para usuario existente e inexistente.

**Resultado esperado:**

- La respuesta es no autenticada y genérica.
- El recurso privado rechaza el acceso.
- No se puede deducir la existencia del usuario.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-AUT-03 — Registro válido con contraseña protegida

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-AUT-02-A1, RF-AUT-02-A3.

**Precondiciones:**

- Identificador sintético no registrado.

**Datos:** {"usuario":"nuevo.sandbox","password":"[dato sintético proporcionado durante la ejecución; no registrar]","confirmacion":"Sintetica-02"}

**Pasos:**

1. Registrar el usuario con confirmación coincidente.
2. Consultar el almacenamiento de credenciales.
3. Iniciar sesión con la contraseña registrada.

**Resultado esperado:**

- El registro se completa.
- La contraseña no se almacena ni se devuelve en claro.
- El login posterior funciona.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-AUT-04 — Registro rechazado por confirmación distinta o duplicado

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-AUT-02-A1, RF-AUT-02-A2, RF-AUT-01-A2.

**Precondiciones:**

- Existe un usuario sintético registrado.

**Datos:** {"usuario":"ana.sandbox","password":"[dato sintético proporcionado durante la ejecución; no registrar]","confirmacion":"Sintetica-04"}

**Pasos:**

1. Enviar registro con confirmación distinta.
2. Enviar registro con identificador ya existente.
3. Consultar la cantidad de usuarios.

**Resultado esperado:**

- Ambos registros se rechazan.
- No se crea un segundo usuario ni un registro parcial.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-AUT-04]`.

## CP-TX-01 — Pago válido debita, acredita y registra ledger

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-TX-01-A1, RF-TX-01-A2, RF-TX-01-A4, RF-TX-01-A6.

**Precondiciones:**

- Pagador y destinatario sintéticos existen.
- El pagador tiene saldo suficiente.

**Datos:** {"pagador":"ana.sandbox","destinatario":"bruno.sandbox","importe":"10.00","moneda":"USD","clave":"pago-001"}

**Pasos:**

1. Ejecutar el pago con sesión del pagador.
2. Consultar ambos saldos.
3. Consultar el ledger.

**Resultado esperado:**

- El pago se acepta.
- El pagador disminuye 10.00 y el destinatario aumenta 10.00.
- Existe un único asiento coherente.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-02 — Pago rechazado por saldo, autorización o conflicto de clave

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-01-A3, RF-TX-01-A4, RF-TX-01-A5.

**Precondiciones:**

- Pagador con saldo insuficiente y destinatario existente.
- Existe una clave idempotente usada con otro payload.

**Datos:** {"importe":"999999.00","moneda":"USD","clave":"pago-001"}

**Pasos:**

1. Intentar pagar por encima del saldo.
2. Intentar usar una cuenta ajena.
3. Reutilizar la clave con importe distinto.

**Resultado esperado:**

- Ninguna operación mueve dinero.
- El conflicto de idempotencia se informa sin datos de terceros.
- No se crea un segundo asiento.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-03 — Solicitud de pago válida queda pendiente sin mover saldo

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-TX-02-A1, RF-TX-02-A2, RF-TX-02-A5.

**Precondiciones:**

- Solicitante y destinatario sintéticos existen.

**Datos:** {"solicitante":"ana.sandbox","destinatario":"bruno.sandbox","importe":"25.50","moneda":"USD"}

**Pasos:**

1. Crear la solicitud.
2. Consultar la solicitud.
3. Consultar saldos y ledger.

**Resultado esperado:**

- La solicitud queda pendiente.
- Los saldos no cambian.
- No existe asiento financiero por la creación.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-04 — Solicitud rechazada por destinatario inexistente o duplicado idempotente

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-02-A1, RF-TX-02-A3, RF-TX-02-A4.

**Precondiciones:**

- Solicitante autenticado.

**Datos:** {"destinatario":"no.existe","importe":"10.00","clave":"solicitud-001"}

**Pasos:**

1. Crear solicitud con destinatario inexistente.
2. Repetir una solicitud válida con la misma clave y payload.

**Resultado esperado:**

- La primera operación no crea solicitud.
- La repetición devuelve la solicitud original sin duplicarla.
- No hay notificaciones parciales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-05 — Consulta de solicitud propia devuelve datos completos

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-TX-03-A1, RF-TX-03-A2.

**Precondiciones:**

- Existe una solicitud pendiente entre dos usuarios sintéticos.

**Datos:** {"solicitud":"solicitud-001","actor":"bruno.sandbox"}

**Pasos:**

1. Consultar la solicitud como destinatario.
2. Verificar los campos devueltos.

**Resultado esperado:**

- Se devuelve importe, tipo, fecha, participantes y estado.
- El actor autorizado puede consultarla.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-06 — Consulta de solicitud ajena o inexistente se rechaza

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-03-A1, RF-TX-03-A3.

**Precondiciones:**

- Existe una solicitud de ana.sandbox.
- Existe un tercero autenticado.

**Datos:** {"solicitud":"solicitud-001","actor":"carla.sandbox"}

**Pasos:**

1. Consultar como tercero.
2. Consultar un identificador inexistente.

**Resultado esperado:**

- Ambas consultas se rechazan.
- No se revela si la solicitud existe ni sus datos.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-07 — Aceptación válida ejecuta el pago una vez

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-TX-04-A1, RF-TX-04-A2, RF-TX-04-A4.

**Precondiciones:**

- Solicitud pendiente con destinatario con saldo suficiente.

**Datos:** {"solicitud":"solicitud-002","actor":"bruno.sandbox","importe":"25.50"}

**Pasos:**

1. Aceptar la solicitud.
2. Consultar saldos, estado y ledger.

**Resultado esperado:**

- El estado cambia a aceptada.
- Los saldos se mueven exactamente.
- Existe un único asiento.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-08 — Aceptación repetida no duplica el débito

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-04-A1, RF-TX-04-A3.

**Precondiciones:**

- Solicitud ya aceptada.

**Datos:** {"solicitud":"solicitud-002","actor":"bruno.sandbox"}

**Pasos:**

1. Repetir la aceptación.
2. Comparar saldos y cantidad de asientos.

**Resultado esperado:**

- La repetición devuelve conflicto o resultado idempotente.
- No hay segundo débito ni asiento nuevo.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-09 — Historial propio muestra movimientos permitidos

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-TX-09-A1, RF-TX-09-A2, RF-TX-09-A3, RF-TX-10-A1, RF-TX-10-A2.

**Precondiciones:**

- ana.sandbox tiene pagos y solicitudes propios.
- Existen movimientos de otro usuario.

**Datos:** {"actor":"ana.sandbox"}

**Pasos:**

1. Consultar el historial.
2. Verificar campos y orden.
3. Avanzar de página si existe paginación.

**Resultado esperado:**

- Solo aparecen movimientos propios.
- Cada registro muestra importe, tipo, fecha, participantes y estado.
- No hay duplicados entre páginas.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-TX-09]`.

## CP-TX-10 — Historial no expone movimientos privados ajenos

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-09-A1, RF-TX-09-A3.

**Precondiciones:**

- Dos usuarios con movimientos distintos.

**Datos:** {"actor":"carla.sandbox"}

**Pasos:**

1. Consultar el historial de carla.
2. Buscar identificadores de movimientos de ana.

**Resultado esperado:**

- No aparece ningún movimiento ajeno.
- La paginación no filtra registros de otros usuarios.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-11 — Detalle autorizado muestra la transacción completa

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-TX-10-A1, RF-TX-10-A2, RF-TX-10-A3.

**Precondiciones:**

- Existe una transacción con participante autorizado.

**Datos:** {"transaccion":"tx-001","actor":"ana.sandbox"}

**Pasos:**

1. Consultar el detalle como participante.
2. Verificar acciones disponibles.

**Resultado esperado:**

- Se devuelve el detalle permitido.
- Las acciones corresponden al actor y estado.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-12 — Detalle inexistente o ajeno se rechaza

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-10-A2, RF-TX-10-A3.

**Precondiciones:**

- Existe una transacción de ana.sandbox.

**Datos:** {"transaccion":"tx-001","actor":"carla.sandbox"}

**Pasos:**

1. Consultar como tercero.
2. Consultar identificador inexistente.

**Resultado esperado:**

- Se rechaza sin revelar datos.
- No se ofrecen acciones de aceptación o rechazo.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-21 — Rechazo válido deja la solicitud rechazada sin mover dinero

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-TX-05-A1, RF-TX-05-A2.

**Precondiciones:**

- Solicitud pendiente con destinatario autenticado.

**Datos:** {"solicitud":"solicitud-003","actor":"bruno.sandbox"}

**Pasos:**

1. Rechazar la solicitud.
2. Consultar estado, saldos y ledger.

**Resultado esperado:**

- El estado es rechazada.
- No hay débito, crédito ni asiento financiero.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-22 — Rechazo repetido o por actor incorrecto no tiene efectos

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-05-A1, RF-TX-05-A3.

**Precondiciones:**

- Solicitud rechazada.
- Existe un tercero autenticado.

**Datos:** {"solicitud":"solicitud-003","actor":"carla.sandbox"}

**Pasos:**

1. Intentar rechazar como tercero.
2. Repetir el rechazo como destinatario.

**Resultado esperado:**

- El tercero recibe rechazo de autorización.
- La repetición no crea eventos ni asientos adicionales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-23 — Reintento con misma clave y payload no duplica el pago

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-TX-06-A1, RF-TX-06-A2.

**Precondiciones:**

- Pago previo ejecutado con clave conocida.

**Datos:** {"clave":"pago-001","payload":"ana->bruno 10.00 USD"}

**Pasos:**

1. Repetir exactamente la misma solicitud.
2. Comparar saldos, asientos y respuesta.

**Resultado esperado:**

- Se devuelve el resultado original.
- No hay segundo débito ni asiento.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-24 — Misma clave con payload distinto se rechaza

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-06-A3.

**Precondiciones:**

- Clave usada previamente con un pago.

**Datos:** {"clave":"pago-001","payload":"ana->bruno 99.00 USD"}

**Pasos:**

1. Reutilizar la clave con otro importe.
2. Consultar saldos y ledger.

**Resultado esperado:**

- La operación se rechaza por conflicto.
- No se ejecuta el nuevo pago ni se altera el original.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-25 — Importes y saldos se calculan en unidades menores exactas

**Nivel:** unit. **Tipo:** positive. **Criterios:** RF-TX-07-A1, RF-TX-07-A2.

**Precondiciones:**

- Dominio de dinero disponible para prueba.

**Datos:** {"importe":"10.10","moneda":"USD","unidadesMenores":1010}

**Pasos:**

1. Convertir el importe al dominio.
2. Sumar y restar repetidamente.
3. Comparar con el valor decimal esperado.

**Resultado esperado:**

- La representación es entera con dos decimales.
- No aparece error de punto flotante.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-18 — Total de participaciones debe igualar el importe exacto

**Nivel:** unit. **Tipo:** negative. **Criterios:** RF-TX-07-A3.

**Precondiciones:**

- Reparto con remanente no divisible.

**Datos:** {"total":"10.00","participantes":3}

**Pasos:**

1. Calcular participaciones.
2. Sumar los valores y comparar con 10.00.
3. Introducir un valor con más de dos decimales.

**Resultado esperado:**

- La suma es exactamente 10.00.
- Un valor con precisión inválida se rechaza.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-19 — Operación privada exige sesión y titularidad

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-TX-08-A1, RF-TX-08-A3.

**Precondiciones:**

- Dos usuarios sintéticos con recursos propios.

**Datos:** {"actor":"ana.sandbox","recurso":"propio"}

**Pasos:**

1. Acceder con sesión de ana a un recurso propio.
2. Repetir la llamada directa sin pasar por la interfaz.

**Resultado esperado:**

- El acceso propio se autoriza en servidor.
- La autorización no depende de la interfaz.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-20 — Operación ajena devuelve rechazo genérico

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-08-A1, RF-TX-08-A2, RF-TX-08-A3.

**Precondiciones:**

- Recurso perteneciente a otro usuario.

**Datos:** {"actor":"carla.sandbox","recurso":"de ana"}

**Pasos:**

1. Invocar el endpoint sin sesión.
2. Invocar con sesión de carla sobre el recurso de ana.
3. Comparar respuestas con un recurso inexistente.

**Resultado esperado:**

- Sin sesión se responde 401.
- Con sesión ajena se responde 403.
- No se revela la existencia del recurso.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-CTA-01 — Usuario administra sus cuentas ficticias

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-CTA-01-A1, RF-CTA-01-A2, RF-CTA-01-A3, RF-CTA-01-A4.

**Precondiciones:**

- Usuario autenticado sin cuentas asociadas.

**Datos:** {"titular":"ana.sandbox","cuenta":"ficticia-001"}

**Pasos:**

1. Listar cuentas.
2. Asociar una cuenta ficticia válida.
3. Deshabilitarla.

**Resultado esperado:**

- La cuenta aparece solo para su titular.
- Los datos se validan antes de persistir.
- La baja se refleja sin afectar a terceros.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-CTA-01]`.

## CP-CTA-02 — Cuenta ajena o datos inválidos se rechazan

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-CTA-01-A2, RF-CTA-01-A3, RF-CTA-01-A4.

**Precondiciones:**

- Existe una cuenta ficticia de ana.sandbox.

**Datos:** {"actor":"carla.sandbox","cuenta":"ficticia-001"}

**Pasos:**

1. Intentar modificar la cuenta de ana.
2. Asociar datos inválidos.
3. Revisar la presentación de la función.

**Resultado esperado:**

- La modificación ajena se rechaza.
- Los datos inválidos no dejan estado parcial.
- La UI indica que la cuenta es ficticia y sin conexión bancaria.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-CON-01 — Búsqueda de usuarios visibles con datos mínimos

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-CON-01-A1, RF-CON-01-A3, RF-CON-01-A2.

**Precondiciones:**

- Existen usuarios con distinta visibilidad.

**Datos:** {"consulta":"bru","actor":"ana.sandbox"}

**Pasos:**

1. Buscar usuarios.
2. Revisar los campos devueltos.

**Resultado esperado:**

- Solo aparecen usuarios visibles.
- No se exponen datos privados innecesarios.
- Las altas/bajas no se anuncian como disponibles si no lo están.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-CON-01]`.

## CP-CON-02 — Contacto duplicado o eliminación no borra historial

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-CON-01-A1, RF-CON-01-A2.

**Precondiciones:**

- ana.sandbox ya tiene a bruno como contacto.
- Existe una transacción histórica entre ambos.

**Datos:** {"actor":"ana.sandbox","contacto":"bruno.sandbox"}

**Pasos:**

1. Intentar agregar el mismo contacto.
2. Eliminar el contacto.
3. Consultar usuario y transacción histórica.

**Resultado esperado:**

- El duplicado no se crea.
- La eliminación no borra al usuario ni la transacción.
- No se expone información privada.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-GAS-01 — División 10 entre 3 con remanente determinista y vista previa

**Nivel:** unit. **Tipo:** positive. **Criterios:** RF-GAS-01-A1, RF-GAS-01-A2.

**Precondiciones:**

- Tres participantes únicos y orden estable.

**Datos:** {"total":"10.00","participantes":["ana","bruno","carla"]}

**Pasos:**

1. Calcular el reparto.
2. Mostrar la vista previa.
3. Sumar las participaciones.

**Resultado esperado:**

- Resultado 3.34, 3.33 y 3.33.
- La vista previa aparece antes de confirmar.
- La suma es 10.00.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-GAS-02 — División rechaza importe inválido o participantes duplicados

**Nivel:** unit. **Tipo:** negative. **Criterios:** RF-GAS-01-A1, RF-GAS-01-A2.

**Precondiciones:**

- Lista de participantes de prueba.

**Datos:** {"total":"0.00","participantes":["ana","ana"]}

**Pasos:**

1. Calcular con importe cero.
2. Calcular con participantes repetidos.
3. Calcular con tres decimales.

**Resultado esperado:**

- Los tres casos se rechazan.
- No se genera desglose ni solicitud.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-GAS-03 — Creación de solicitudes no modifica saldos

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-GAS-01-A3.

**Precondiciones:**

- Organizador con saldo y participantes válidos.

**Datos:** {"total":"10.00","participantes":["bruno","carla"]}

**Pasos:**

1. Confirmar la división.
2. Consultar solicitudes, saldos y ledger.

**Resultado esperado:**

- Se crean solicitudes pendientes individuales.
- Los saldos permanecen iguales.
- No hay asientos financieros en la creación.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-GAS-06 — Reintento de división no duplica solicitudes

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-GAS-01-A4.

**Precondiciones:**

- División ya confirmada con clave conocida.

**Datos:** {"clave":"split-001","total":"10.00"}

**Pasos:**

1. Repetir la confirmación con la misma clave y payload.
2. Contar solicitudes y asientos.

**Resultado esperado:**

- Se devuelve el resultado original.
- No se duplican solicitudes ni asientos.
- Las reglas de aceptación y rechazo siguen vigentes.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-GAS-07 — Organizador incluido no se autosolicita

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-GAS-01-A5.

**Precondiciones:**

- Organizador autenticado y participantes válidos.

**Datos:** {"organizador":"ana","incluirOrganizador":true,"total":"10.00"}

**Pasos:**

1. Configurar inclusión del organizador.
2. Confirmar la división.
3. Consultar solicitudes creadas.

**Resultado esperado:**

- El organizador participa en el reparto.
- No se crea una solicitud de ana contra ana.
- La suma sigue siendo exacta.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-NOT-01 — Bandeja propia muestra notificaciones o estado vacío

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-NOT-01-A1, RF-NOT-01-A2, RF-NOT-01-A3.

**Precondiciones:**

- Un usuario con eventos y otro sin eventos.

**Datos:** {"actor":"ana.sandbox"}

**Pasos:**

1. Consultar la bandeja con eventos.
2. Consultar la bandeja de un usuario sin eventos.

**Resultado esperado:**

- Solo aparecen eventos de ana.
- El usuario sin eventos ve un estado vacío explícito.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-NOT-01]`.

## CP-NOT-02 — Resolución repetida no duplica notificaciones ni asientos

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-NOT-01-A1, RF-NOT-01-A3.

**Precondiciones:**

- Solicitud ya resuelta.

**Datos:** {"solicitud":"solicitud-004","actor":"bruno.sandbox"}

**Pasos:**

1. Repetir la resolución.
2. Consultar notificaciones y ledger del destinatario.

**Resultado esperado:**

- No se crea una segunda notificación.
- No se crea un segundo asiento.
- No se exponen eventos de terceros.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-FX-01 — Cotización válida se aplica exactamente al pago

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-FX-01-A1, RF-FX-01-A2, RF-FX-01-A4.

**Precondiciones:**

- Usuario con saldo y par de monedas soportado.

**Datos:** {"origen":"USD","destino":"COP","importe":"10.00"}

**Pasos:**

1. Solicitar cotización.
2. Pagar aplicando la cotización.
3. Comparar importe debitado con la cotización.

**Resultado esperado:**

- La cotización incluye tasa, fecha y vigencia.
- El débito coincide exactamente con lo cotizado.
- La UI indica que es demostrativa.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-FX-02 — Cotización vencida o par inválido no mueve dinero

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-FX-01-A2, RF-FX-01-A3, RF-FX-01-A4.

**Precondiciones:**

- Cotización emitida fuera de vigencia.

**Datos:** {"par":"USD/XXX","cotizacionVencida":true}

**Pasos:**

1. Solicitar un par inválido.
2. Pagar con una cotización vencida.
3. Consultar saldos.

**Resultado esperado:**

- Ambas operaciones se rechazan.
- Ningún saldo cambia.
- No se afirma integración real de mercado.

**Automatización:** vitest: `web/src/lib/money-scenarios.integration.test.ts` — `[CP-FX-02]`.

## CP-REC-01 — Recurrencia semanal se crea con próxima fecha UTC

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-REC-01-A1, RF-REC-01-A5.

**Precondiciones:**

- Usuario autenticado y destinatario existente.

**Datos:** {"periodicidad":"weekly","importe":"5.00","moneda":"USD","ancla":"2026-11-04T00:00:00Z"}

**Pasos:**

1. Crear la recurrencia.
2. Consultar la próxima ejecución.

**Resultado esperado:**

- Se persiste weekly.
- La próxima fecha respeta el ancla UTC.
- No se ejecuta un pago inmediato fuera de calendario.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-REC-02 — Patch de recurrencia ajena o ejecución concurrente no duplica pagos

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-REC-01-A2, RF-REC-01-A4.

**Precondiciones:**

- Recurrencia de ana.sandbox vencida.

**Datos:** {"actor":"carla.sandbox","recurrencia":"rec-001"}

**Pasos:**

1. Intentar pausar la recurrencia ajena.
2. Forzar dos ejecuciones concurrentes de la misma ocurrencia.

**Resultado esperado:**

- El patch ajeno se rechaza.
- Solo se crea un pago y un asiento por ocurrencia.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-REC-03 — Saldo insuficiente aplica tres reintentos visibles antes de avanzar

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-REC-01-A3, RF-REC-01-A6.

**Precondiciones:**

- Recurrencia vencida con saldo insuficiente.

**Datos:** {"recurrencia":"rec-002","saldo":"0.00","reintentos":[1,24,72]}

**Pasos:**

1. Ejecutar el worker.
2. Consultar estado y reintentos programados.
3. Agotar los tres reintentos.

**Resultado esperado:**

- La recurrencia se marca failed.
- Los reintentos son visibles a 1h, 24h y 72h.
- Tras el tercero avanza sin reintentos adicionales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-COM-01 — Pago a comercio válido debita y acredita

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-COM-01-A1, RF-COM-01-A2.

**Precondiciones:**

- Comercio activo y pagador con saldo.

**Datos:** {"comercio":"cafe.sandbox","importe":"7.50","moneda":"USD"}

**Pasos:**

1. Ejecutar el pago a comercio.
2. Consultar saldos y ledger.

**Resultado esperado:**

- El pagador disminuye 7.50.
- El comercio aumenta 7.50.
- Existe un asiento coherente.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-COM-02 — Comercio inexistente o inactivo no recibe dinero

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-COM-01-A1, RF-COM-01-A3, RF-COM-01-A4.

**Precondiciones:**

- Existe un comercio inactivo.

**Datos:** {"comercio":"inactivo.sandbox","importe":"7.50"}

**Pasos:**

1. Pagar a comercio inactivo.
2. Pagar a comercio inexistente.
3. Revisar la presentación.

**Resultado esperado:**

- Ambos pagos se rechazan sin mover dinero.
- No se crea asiento.
- La UI indica comercio simulado.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-SBX-01 — Recarga de sandbox acredita saldo y asiento de origen simulado

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-SBX-01-A1, RF-SBX-01-A2.

**Precondiciones:**

- Usuario autenticado dentro del límite.

**Datos:** {"actor":"ana.sandbox","importe":"50.00","moneda":"USD"}

**Pasos:**

1. Solicitar recarga.
2. Consultar saldo y ledger.

**Resultado esperado:**

- El saldo aumenta 50.00.
- Se registra un asiento con origen sandbox.
- La operación se identifica como simulada.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-SBX-02 — Recarga fuera de límite o reintentada no duplica saldo

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-SBX-01-A3, RF-SBX-01-A4.

**Precondiciones:**

- Usuario con recarga previa y clave conocida.

**Datos:** {"importe":"999999.00","clave":"topup-001"}

**Pasos:**

1. Solicitar recarga fuera de límite.
2. Repetir la recarga válida con la misma clave.
3. Consultar saldo.

**Resultado esperado:**

- La recarga fuera de límite se rechaza.
- La repetición no duplica el crédito.
- La UI no simula dinero real.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-ING-01 — Ingreso externo simulado con referencia única

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-ING-01-A1, RF-ING-01-A3, RF-ING-01-A2.

**Precondiciones:**

- Cuenta destino autorizada.

**Datos:** {"referencia":"EXT-001","importe":"100.00","moneda":"USD"}

**Pasos:**

1. Registrar el ingreso.
2. Consultar saldo, asiento y presentación.

**Resultado esperado:**

- El saldo aumenta exactamente 100.00.
- El asiento conserva la referencia única.
- La operación se muestra como simulada.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-ING-01]`.

## CP-ING-02 — Referencia externa duplicada en conflicto no acredita dos veces

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-ING-01-A1, RF-ING-01-A2.

**Precondiciones:**

- Referencia EXT-001 ya aplicada.

**Datos:** {"referencia":"EXT-001","importe":"150.00"}

**Pasos:**

1. Repetir con el mismo payload.
2. Repetir con importe distinto.
3. Consultar saldo y asientos.

**Resultado esperado:**

- La repetición idéntica devuelve el resultado original.
- El conflicto se rechaza.
- Solo existe un crédito y un asiento.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-13 — Validar importes límite y formato monetario

**Nivel:** unit. **Tipo:** mixed. **Criterios:** RF-TX-07-A1, RF-TX-07-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** 0; -1; 0.01; 1.001; notación exponencial; máximo de 12 dígitos enteros.

**Pasos:**

1. Introducir cada importe en el dominio y API.
2. Comparar aceptación con el contrato de dos decimales.

**Resultado esperado:**

- Solo importes positivos de formato y rango admitidos son aceptados; se conserva el valor exacto.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-14 — Persistir y recuperar importes exactos

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-TX-07-A1, RF-TX-07-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Importes sintéticos de borde y representativos en USD, COP y CRC.

**Pasos:**

1. Registrar un pago válido y consultar su detalle y saldos.
2. Intentar persistir un importe no admitido.

**Resultado esperado:**

- Entrada, persistencia, débito, crédito y presentación coinciden; entradas inválidas no producen efectos.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-TX-15 — Resolver repetida y concurrentemente una solicitud

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-TX-04-A3, RF-TX-05-A3, RF-TX-06-A2, RF-TX-06-A4.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Solicitudes pendientes independientes para aceptación, rechazo y concurrencia.

**Pasos:**

1. Resolver cada solicitud y repetir las acciones.
2. Enviar dos aceptaciones concurrentes; consultar saldos, ledger y notificaciones.

**Resultado esperado:**

- Como máximo un pago; el estado final no se revierte y las notificaciones no se duplican.

**Automatización:** vitest: `web/src/lib/money-scenarios.integration.test.ts` — `[CP-TX-15]`.

## CP-TX-16 — Autorizar lectura y resolución según actor

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-TX-08-A1, RF-TX-08-A2, RF-TX-08-A3, RF-TX-10-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Solicitante, pagador y tercero sintéticos.

**Pasos:**

1. Consultar y resolver la misma operación con cada actor.
2. Repetir sin sesión.

**Resultado esperado:**

- Solo participantes leen y solo pagador resuelve; demás accesos no exponen datos.

**Automatización:** vitest: `web/src/lib/security.integration.test.ts` — `[CP-TX-16]`.

## CP-TX-17 — Rollback Oracle entre escrituras relacionadas

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-01-A2, RF-TX-02-A4, RF-TX-04-A2, RF-LED-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Transacción Oracle aislada e inyección de error tras débito antes de contrapartida.

**Pasos:**

1. Guardar saldos y conteos iniciales.
2. Provocar un fallo entre escrituras y consultar tras rollback.

**Resultado esperado:**

- No persisten débitos, asientos, operaciones, claves ni notificaciones parciales.

**Automatización:** vitest: `web/src/lib/flows.integration.test.ts` — `[CP-TX-17]`.

## CP-GAS-04 — Crear división válida de USD 30 entre dos participantes

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-GAS-01-A1, RF-GAS-01-A3, RF-GAS-01-A2, RF-GAS-01-A4, RF-GAS-01-A5.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Total 30.00, dos participantes válidos distintos del organizador.

**Pasos:**

1. Revisar reparto y confirmar.
2. Consultar división, dos solicitudes pendientes y saldos.

**Resultado esperado:**

- Dos solicitudes de 15.00, suma 30.00; saldos sin cambio.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-GAS-04]`.

## CP-GAS-05 — Rechazar división con participante duplicado

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-GAS-01-A1, RF-GAS-01-A3.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Total 30.00 y mismo participante dos veces.

**Pasos:**

1. Enviar la división duplicada.
2. Consultar conteos antes y después.

**Resultado esperado:**

- Se rechaza sin división ni solicitudes parciales.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-GAS-05]`.

## CP-RNF-01 — Evaluar Adecuación funcional y rechazar evidencia inválida

**Nivel:** inspection. **Tipo:** mixed. **Criterios:** RNF-FUN-01-A1, RNF-FUN-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto matriz-funcional-v1; muestra mínima 1; artefactos sintéticos sin secretos.

**Pasos:**

1. Calcular sobre todos los AC funcionales: requiere pruebas ejecutadas y ausencia de brechas funcionales; omitidas cuentan pendientes.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral >= 100 %.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-02 — Evaluar Eficiencia de desempeño y rechazar evidencia inválida

**Nivel:** inspection. **Tipo:** mixed. **Criterios:** RNF-PER-01-A1, RNF-PER-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto oracle-local-20-concurrentes-v1; muestra mínima 100; artefactos sintéticos sin secretos.

**Pasos:**

1. Medir al menos 100 consultas con 20 clientes concurrentes tras calentamiento, Oracle local y dataset de 1000 operaciones; informar hardware y distribución.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral <= 500 ms.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-03 — Evaluar Compatibilidad y rechazar evidencia inválida

**Nivel:** inspection. **Tipo:** mixed. **Criterios:** RNF-COM-01-A1, RNF-COM-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto edge-chrome-escritorio-v1; muestra mínima 2; artefactos sintéticos sin secretos.

**Pasos:**

1. Ejecutar los mismos recorridos en Edge/Windows y Chrome/Linux; adjuntar resultados por navegador. Una sola plataforma no representa ambas.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral >= 100 %.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-04 — Evaluar Capacidad de interacción y rechazar evidencia inválida

**Nivel:** user. **Tipo:** mixed. **Criterios:** RNF-INT-01-A1, RNF-INT-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto teclado-escritorio-usuarios-v1; muestra mínima 10; artefactos sintéticos sin secretos.

**Pasos:**

1. Usuarios finales completan pago, solicitud y división con teclado; registrar intentos, aciertos y barreras sin datos personales.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral >= 90 %.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-05 — Evaluar Fiabilidad y rechazar evidencia inválida

**Nivel:** inspection. **Tipo:** mixed. **Criterios:** RNF-REL-01-A1, RNF-REL-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto oracle-fallos-concurrencia-v1; muestra mínima 10; artefactos sintéticos sin secretos.

**Pasos:**

1. Ejecutar fallos entre escrituras y solicitudes concurrentes en Oracle real, comparando saldos, ledger, notificaciones y claves antes/después.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral >= 100 %.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-06 — Evaluar Seguridad y rechazar evidencia inválida

**Nivel:** inspection. **Tipo:** mixed. **Criterios:** RNF-SEC-01-A1, RNF-SEC-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto api-tres-actores-v1; muestra mínima 12; artefactos sintéticos sin secretos.

**Pasos:**

1. Probar visitante, propietario y tercero sobre lectura/mutación de pagos, solicitudes, bancos y notificaciones; contar incidentes reproducibles.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral == 0 incidentes.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-07 — Evaluar Mantenibilidad y rechazar evidencia inválida

**Nivel:** inspection. **Tipo:** mixed. **Criterios:** RNF-MAN-01-A1, RNF-MAN-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto catalogo-ci-v1; muestra mínima 1; artefactos sintéticos sin secretos.

**Pasos:**

1. Ejecutar validación de IDs/referencias/criterios/CP, detección de archivos ausentes y comparación exacta de vistas generadas en toda PR.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral == 100 %.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-08 — Evaluar Flexibilidad y rechazar evidencia inválida

**Nivel:** inspection. **Tipo:** mixed. **Criterios:** RNF-FLE-01-A1, RNF-FLE-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto windows-linux-contenedor-v1; muestra mínima 2; artefactos sintéticos sin secretos.

**Pasos:**

1. Preparar instalación desde lockfile y migraciones en Windows nativo y contenedor Linux; comprobar arranque, salud Oracle y build.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral >= 100 %.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-09 — Evaluar Seguridad operacional y rechazar evidencia inválida

**Nivel:** inspection. **Tipo:** mixed. **Criterios:** RNF-SAF-01-A1, RNF-SAF-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto advertencias-sandbox-v1; muestra mínima 7; artefactos sintéticos sin secretos.

**Pasos:**

1. Revisar acceso, resumen, P2P, FX, división, comercio y recepción; verificar avisos visibles y respuestas API con evidencia de UI y revisión de agente identificada.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral == 100 %.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-10 — Evaluar Calidad en uso: logro de tareas y rechazar evidencia inválida

**Nivel:** user. **Tipo:** mixed. **Criterios:** RNF-USO-01-A1, RNF-USO-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto usuarios-primer-uso-v1; muestra mínima 10; artefactos sintéticos sin secretos.

**Pasos:**

1. Al menos 10 usuarios finales de prueba realizan pago, solicitud y división con datos ficticios; informar tareas, aciertos y tiempo, sin usar agentes como participantes.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral >= 90 %.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-RNF-11 — Evaluar Calidad en uso: valoración del usuario y rechazar evidencia inválida

**Nivel:** user. **Tipo:** mixed. **Criterios:** RNF-SAT-01-A1, RNF-SAT-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle preparado cuando corresponda.

**Datos:** Contexto usuarios-primer-uso-v1; muestra mínima 10; artefactos sintéticos sin secretos.

**Pasos:**

1. Recoger una respuesta de 1 a 5 por participante tras las mismas tareas; conservar comentarios anónimos y tamaño de muestra. Métrica local, no escala normativa ISO.
2. Registrar la medición, evaluar el umbral y repetir con una huella/contexto incorrectos para comprobar rechazo.

**Resultado esperado:**

- El resultado distingue aprobado, fallido, pendiente, insuficiente y obsoleto; umbral >= 4 puntos/5.
- La revisión de agente no se contabiliza como evaluación de usuarios finales.

**Automatización:** Diseñado; automatización pendiente o evaluación humana.

## CP-IDEM-01 — conserva la intención al cambiar el orden de claves

**Nivel:** unit. **Tipo:** positive. **Criterios:** RF-TX-06-A2.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Repetir la misma clave con el mismo payload devuelve el resultado original sin nuevo asiento en el ledger.

**Automatización:** vitest: `web/src/lib/idempotency.test.ts` — `[CP-IDEM-01]`.

## CP-IDEM-02 — distingue importes, destinatarios, monedas y orden de participantes

**Nivel:** unit. **Tipo:** mixed. **Criterios:** RF-TX-06-A3.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Repetir la misma clave con payload distinto se rechaza sin ejecutar la nueva operación.

**Automatización:** vitest: `web/src/lib/idempotency.test.ts` — `[CP-IDEM-02]`.

## CP-IDEM-03 — rechaza claves inválidas y payloads no serializables

**Nivel:** unit. **Tipo:** negative. **Criterios:** RF-TX-06-A1.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Las operaciones financieras aceptan una clave idempotente persistida y la asocian a su efecto.

**Automatización:** vitest: `web/src/lib/idempotency.test.ts` — `[CP-IDEM-03]`.

## CP-LED-01 — exige doble partida balanceada por moneda

**Nivel:** unit. **Tipo:** mixed. **Criterios:** RF-LED-01-A1.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Cada asiento contiene al menos dos partidas no nulas y su suma es cero por moneda; FX utiliza contrapartidas explícitas por divisa.

**Automatización:** vitest: `web/src/lib/ledger.test.ts` — `[CP-LED-01]`.

## CP-LED-02 — identifica contrapartidas y conserva el hash al reordenar partidas

**Nivel:** unit. **Tipo:** mixed. **Criterios:** RF-LED-01-A3.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Repetir una operación con las mismas partidas devuelve el mismo asiento sin nuevos efectos; partidas distintas para la misma operación producen conflicto.

**Automatización:** vitest: `web/src/lib/ledger.test.ts` — `[CP-LED-02]`.

## CP-LED-03 — mantiene FX balanceado con cuentas puente separadas por moneda

**Nivel:** unit. **Tipo:** positive. **Criterios:** RF-LED-01-A1.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Cada asiento contiene al menos dos partidas no nulas y su suma es cero por moneda; FX utiliza contrapartidas explícitas por divisa.

**Automatización:** vitest: `web/src/lib/ledger.test.ts` — `[CP-LED-03]`.

## CP-SQL-01 — separa SQL y triggers sin romper literales ni comentarios

**Nivel:** unit. **Tipo:** mixed. **Criterios:** RF-LED-01-A2.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Oracle impide modificar o eliminar asientos contabilizados y añadirles partidas; un fallo revierte asiento, proyección y efectos locales.

**Automatización:** vitest: `web/src/lib/ledger.test.ts` — `[CP-SQL-01]`.

## CP-CAL-01 — conserva el día ancla UTC al pasar por febrero y un año bisiesto

**Nivel:** unit. **Tipo:** positive. **Criterios:** RF-REC-01-A1.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- La recurrencia se crea con periodicidad weekly, monthly o quarterly y próxima fecha anclada en UTC.

**Automatización:** vitest: `web/src/lib/recurrence-policy.test.ts` — `[CP-CAL-01]`.

## CP-CAL-02 — limita los reintentos y conserva la identidad de la ocurrencia

**Nivel:** unit. **Tipo:** mixed. **Criterios:** RF-REC-01-A3.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- El worker de 30 segundos procesa vencimientos; con saldo insuficiente marca failed y aplica como máximo tres reintentos visibles a 1, 24 y 72 horas antes de avanzar.

**Automatización:** vitest: `web/src/lib/recurrence-policy.test.ts` — `[CP-CAL-02]`.

## CP-CAL-03 — salta ciclos perdidos sin acumular cobros

**Nivel:** unit. **Tipo:** positive. **Criterios:** RF-REC-01-A6.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Los periodos perdidos por indisponibilidad se saltan sin acumular cobros y se conserva el día ancla UTC.

**Automatización:** vitest: `web/src/lib/recurrence-policy.test.ts` — `[CP-CAL-03]`.

## CP-SPLIT-01 — reparte residuos sin perder centavos y conserva orden

**Nivel:** unit. **Tipo:** positive. **Criterios:** RF-GAS-01-A1, RF-GAS-01-A2, RF-TX-07-A3.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Se validan importe positivo, participantes únicos y distribución exacta en centavos.
- El reparto igual distribuye el remanente de forma determinista y muestra el desglose antes de confirmar.
- La suma de participaciones y movimientos iguala exactamente el total declarado.

**Automatización:** vitest: `web/src/lib/splits.test.ts` — `[CP-SPLIT-01]`.

## CP-SPLIT-02 — incluye al organizador con cuota propia

**Nivel:** unit. **Tipo:** positive. **Criterios:** RF-GAS-01-A5.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- La inclusión del organizador es configurable y puede participar sin autogenerar una solicitud contra sí mismo.

**Automatización:** vitest: `web/src/lib/splits.test.ts` — `[CP-SPLIT-02]`.

## CP-SPLIT-03 — valida cuotas personalizadas, duplicados y cuotas de cero

**Nivel:** unit. **Tipo:** mixed. **Criterios:** RF-GAS-01-A1.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Se validan importe positivo, participantes únicos y distribución exacta en centavos.

**Automatización:** vitest: `web/src/lib/splits.test.ts` — `[CP-SPLIT-03]`.

## CP-IDEM-04 — deduplica una intención y permite intenciones concurrentes distintas

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-TX-01-A3, RF-TX-06-A1, RF-TX-06-A2, RF-TX-06-A3, RF-LED-01-A4.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- La clave idempotente se persiste; repetir la misma clave con el mismo payload no duplica el pago y con payload distinto se rechaza.
- Las operaciones financieras aceptan una clave idempotente persistida y la asocian a su efecto.
- Repetir la misma clave con el mismo payload devuelve el resultado original sin nuevo asiento en el ledger.
- Repetir la misma clave con payload distinto se rechaza sin ejecutar la nueva operación.
- El saldo disponible se autoriza desde las partidas contabilizadas; la proyección se reconcilia, no hay sobregiro concurrente y las intenciones distintas no utilizan un bloqueo global por usuario.

**Automatización:** vitest: `web/src/lib/flows.integration.test.ts` — `[CP-IDEM-04]`.

## CP-LED-04 — impide mutar o ampliar asientos contabilizados y verifica replay

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-LED-01-A2, RF-LED-01-A3.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Oracle impide modificar o eliminar asientos contabilizados y añadirles partidas; un fallo revierte asiento, proyección y efectos locales.
- Repetir una operación con las mismas partidas devuelve el mismo asiento sin nuevos efectos; partidas distintas para la misma operación producen conflicto.

**Automatización:** vitest: `web/src/lib/flows.integration.test.ts` — `[CP-LED-04]`.

## CP-LED-05 — autoriza con el ledger y evita sobregiro concurrente

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-LED-01-A4.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- El saldo disponible se autoriza desde las partidas contabilizadas; la proyección se reconcilia, no hay sobregiro concurrente y las intenciones distintas no utilizan un bloqueo global por usuario.

**Automatización:** vitest: `web/src/lib/flows.integration.test.ts` — `[CP-LED-05]`.

## CP-REC-04 — limita reintentos, exige consentimiento y mantiene cancelación terminal

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-REC-01-A2, RF-REC-01-A3, RF-REC-01-A5.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- El propietario puede pausar, reanudar, cambiar el importe y cancelar definitivamente; otro usuario no puede hacerlo. Una recurrencia cancelada no se reactiva.
- El worker de 30 segundos procesa vencimientos; con saldo insuficiente marca failed y aplica como máximo tres reintentos visibles a 1, 24 y 72 horas antes de avanzar.
- Crear o cambiar el importe exige consentimiento explícito; las instrucciones antiguas sin consentimiento quedan pausadas hasta nueva autorización.

**Automatización:** vitest: `web/src/lib/customer-flows.integration.test.ts` — `[CP-REC-04]`.

## CP-WEB-01 — logs in and shows sandbox state without contacting a bank

**Nivel:** e2e. **Tipo:** positive. **Criterios:** RF-AUT-01-A1, RF-SBX-01-A3.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Las credenciales se validan en el servidor y la sesión queda asociada al usuario correcto.
- La interfaz y la API identifican la operación como simulada y no inducen a error sobre dinero real.

**Automatización:** cypress: `cypress/e2e/payments.cy.ts` — `[CP-WEB-01]`.

## CP-WEB-02 — requests a sandbox quote before posting an international P2P payment

**Nivel:** e2e. **Tipo:** positive. **Criterios:** RF-FX-01-A1, RF-FX-01-A4.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- La cotización indica importes, par de monedas, tasa, fecha y vigencia.
- La función se presenta como simulada y no afirma integración real de mercado.

**Automatización:** cypress: `cypress/e2e/payments.cy.ts` — `[CP-WEB-02]`.

## CP-WEB-03 — previsualiza la división y reintenta con la misma idempotencyKey

**Nivel:** e2e. **Tipo:** mixed. **Criterios:** RF-GAS-01-A2, RF-GAS-01-A4.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- El reparto igual distribuye el remanente de forma determinista y muestra el desglose antes de confirmar.
- El reintento no duplica solicitudes y se respetan las reglas de aceptación, rechazo y autorización.

**Automatización:** cypress: `cypress/e2e/flows.cy.ts` — `[CP-WEB-03]`.

## CP-WEB-04 — filtra, pagina y abre el detalle de una transacción

**Nivel:** e2e. **Tipo:** positive. **Criterios:** RF-TX-09-A2, RF-TX-09-A3.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- Se muestra importe, tipo, fecha, participantes y estado.
- Cuando hay paginación, el orden es estable y no se repiten registros.

**Automatización:** cypress: `cypress/e2e/flows.cy.ts` — `[CP-WEB-04]`.

## CP-WEB-05 — muestra el error de alta de banco y la bandeja de notificaciones vacía

**Nivel:** e2e. **Tipo:** mixed. **Criterios:** RF-CTA-01-A4, RF-NOT-01-A2.

**Precondiciones:**

- Fixtures sintéticos y entorno aislado; Oracle preparado para integración.

**Datos:** Los datos y los límites se fijan en la suite enlazada; no se utilizan cuentas ni fondos reales.

**Pasos:**

1. Ejecutar la suite enlazada mediante el comando de su nivel.
2. Contrastar los resultados observados y el artefacto de ejecución con los criterios relacionados.

**Resultado esperado:**

- La funcionalidad se presenta como ficticia y no supone conectividad, pagos reales ni verificación externa.
- Se presenta un estado vacío cuando no existen notificaciones.

**Automatización:** cypress: `cypress/e2e/flows.cy.ts` — `[CP-WEB-05]`.

## CP-MON-01 — Contrato completo de dinero exacto y límites de entrada

**Nivel:** unit. **Tipo:** mixed. **Criterios:** RF-TX-07-A1, RF-TX-07-A2.

**Precondiciones:**

- Ejecutar las fixtures monetarias sin conexión externa.

**Datos:** 0.01, 2500.00, 999999999999.99 y entradas inválidas; USD/COP/CRC.

**Pasos:**

1. Ejecutar la suite de dinero exacto.

**Resultado esperado:**

- Se conservan los centavos, se validan límites y las entradas inválidas se rechazan.

**Automatización:** vitest: `web/src/lib/money.test.ts` — `fixed-precision sandbox money`.

## CP-LED-06 — Conservar movimientos y proyecciones del esquema anterior

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-LED-01-A1, RF-LED-01-A2, RF-LED-01-A4.

**Precondiciones:**

- Oracle desechable con fixture anterior preparada antes de aplicar las migraciones 002 a 006.

**Datos:** Cuenta sintética con USD 123.45, operación completada y dos partidas opuestas del esquema 001.

**Pasos:**

1. Preparar el esquema 001 y la fixture sintética con el comando protegido.
2. Aplicar las migraciones restantes y consultar asiento, partidas y proyección.

**Resultado esperado:**

- El asiento importado está contabilizado, conserva dos partidas que suman cero y la proyección sigue siendo USD 123.45.

**Automatización:** vitest: `web/src/lib/flows.integration.test.ts` — `[CP-LED-06]`.

## CP-SEC-01 — Cabeceras defensivas y rechazo de acceso sin sesión

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-AUT-01-A2.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle desechable preparado.

**Datos:** Petición sin cookie de sesión y petición autenticada de control.

**Pasos:**

1. Solicitar un recurso de la API y revisar las cabeceras defensivas.
2. Intentar acceder a un recurso privado sin sesión.

**Resultado esperado:**

- Las respuestas incluyen las cabeceras defensivas configuradas.
- El acceso sin sesión se rechaza sin devolver datos privados.

**Automatización:** vitest: `web/src/lib/security.integration.test.ts` — `[CP-SEC-01]`.

## CP-SEC-02 — Cookie de sesión HttpOnly y SameSite Lax con hash almacenado

**Nivel:** integration. **Tipo:** positive. **Criterios:** RF-AUT-01-A1.

**Precondiciones:**

- Usuario sintético registrado y activo.
- Entorno sandbox aislado y datos sintéticos; Oracle desechable preparado.

**Datos:** Credenciales sintéticas válidas proporcionadas durante la ejecución; no registrar.

**Pasos:**

1. Iniciar sesión y revisar la cookie de sesión emitida.
2. Contrastar el identificador de sesión con el valor almacenado en el servidor.

**Resultado esperado:**

- La cookie es HttpOnly y SameSite=Lax.
- El servidor almacena un hash de la sesión y no el identificador en claro.

**Automatización:** vitest: `web/src/lib/security.integration.test.ts` — `[CP-SEC-02]`.

## CP-SEC-03 — Revocación de sesión y errores de login genéricos

**Nivel:** integration. **Tipo:** mixed. **Criterios:** RF-AUT-01-A1, RF-AUT-01-A2, RF-AUT-01-A3.

**Precondiciones:**

- Usuario sintético registrado y activo.
- Entorno sandbox aislado y datos sintéticos; Oracle desechable preparado.

**Datos:** Credenciales válidas e inválidas de usuarios existentes e inexistentes; cookies revocadas o vencidas.

**Pasos:**

1. Iniciar sesión, cerrar sesión y reutilizar la cookie anterior.
2. Probar una cookie inválida y una sesión vencida.
3. Comparar los mensajes de login fallido para usuario existente e inexistente.

**Resultado esperado:**

- La sesión revocada, inválida o vencida se rechaza sin acceder a datos privados.
- Los errores de login son genéricos y no revelan si el usuario existe.

**Automatización:** vitest: `web/src/lib/security.integration.test.ts` — `[CP-SEC-03]`.

## CP-SEC-04 — Payloads de inyección en login, identificador y cursor

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-AUT-01-A3, RF-TX-10-A2.

**Precondiciones:**

- Usuario sintético registrado.
- Entorno sandbox aislado y datos sintéticos; Oracle desechable preparado.

**Datos:** Cadenas sintéticas con comillas, operadores y comentarios SQL en login, identificador y cursor.

**Pasos:**

1. Enviar los payloads al login, a un identificador y a un cursor de paginación.
2. Comparar las respuestas con las de una petición de control.

**Resultado esperado:**

- No se omite la autenticación ni se amplía el acceso a datos ajenos.
- Las entradas se rechazan o neutralizan sin ejecutar la inyección.
- Las respuestas no incluyen errores SQL ni trazas internas.

**Automatización:** vitest: `web/src/lib/security.integration.test.ts` — `[CP-SEC-04]`.

## CP-SEC-05 — Límites de registro y campos de autoría ignorados en pago

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-AUT-02-A1, RF-AUT-02-A2, RF-TX-01-A4.

**Precondiciones:**

- Pagador y destinatario sintéticos con saldo suficiente.
- Entorno sandbox aislado y datos sintéticos; Oracle desechable preparado.

**Datos:** Contraseña de más de 72 bytes y campos de registro sobrantes; pago con userId y ownerId ajenos.

**Pasos:**

1. Registrar con contraseña fuera de límite y con campos no admitidos.
2. Enviar un pago incluyendo identificadores de autoría distintos al de la sesión.
3. Consultar usuarios, operaciones y saldos.

**Resultado esperado:**

- El registro inválido se rechaza sin crear un usuario parcial.
- El pago usa el actor de la sesión e ignora userId y ownerId enviados.
- No se mueve dinero de terceros ni se crea una operación no autorizada.

**Automatización:** vitest: `web/src/lib/security.integration.test.ts` — `[CP-SEC-05]`.

## CP-SEC-06 — Importes inválidos, clave idempotente corta y autosolicitud sin efectos

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-TX-01-A1, RF-TX-07-A1.

**Precondiciones:**

- Usuario sintético con saldo y otro usuario destinatario.
- Entorno sandbox aislado y datos sintéticos; Oracle desechable preparado.

**Datos:** Importes negativos, cero y con más decimales de los admitidos; clave idempotente demasiado corta; autosolicitud.

**Pasos:**

1. Guardar saldos y conteos iniciales.
2. Enviar los importes inválidos, la clave corta y la autosolicitud.
3. Consultar saldos, operaciones y solicitudes después de los intentos.

**Resultado esperado:**

- Todos los intentos se rechazan con validación.
- No se crean operaciones ni solicitudes y los saldos no cambian.

**Automatización:** vitest: `web/src/lib/security.integration.test.ts` — `[CP-SEC-06]`.

## CP-SEC-07 — JSON malformado o sobredimensionado rechazado sin detalles internos

**Nivel:** integration. **Tipo:** negative. **Criterios:** RF-AUT-02-A1.

**Precondiciones:**

- Entorno sandbox aislado y datos sintéticos; Oracle desechable preparado.

**Datos:** Cuerpo JSON truncado y cuerpo sintético que excede el límite de tamaño.

**Pasos:**

1. Enviar un registro con JSON malformado.
2. Enviar un registro con un cuerpo sobredimensionado.
3. Revisar el estado y el contenido de ambas respuestas.

**Resultado esperado:**

- El JSON malformado responde 400 y el sobredimensionado responde 413.
- Las respuestas son genéricas y no incluyen trazas, sentencias SQL ni rutas internas.

**Automatización:** vitest: `web/src/lib/security.integration.test.ts` — `[CP-SEC-07]`.
