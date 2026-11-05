<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Reglas de negocio

Reglas transaccionales y de producto de ERS-001; sus IDs históricos permanecen vigentes. La matriz separa implementación y evidencia.

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

Entradas, cálculos y persistencia conservan unidades menores exactas; las tres monedas habilitadas utilizan dos decimales en este sandbox.

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

Pantallas, operaciones y comprobantes identifican fondos ficticios y nunca afirman movimiento de dinero real.

**Requisitos relacionados:** RF-SBX-01, RF-ING-01, RF-COM-01.

## RN-PROD-02 — Importe y moneda explícitos

La operación conserva importe y moneda de origen y destino, cuando corresponda, usando precisión exacta.

**Requisitos relacionados:** RF-TX-07, RF-FX-01.

## RN-PROD-03 — Cotización visible antes de confirmar

La conversión muestra importes, tasa de demostración, fuente y vencimiento antes de confirmar; no se inventan tarifas ni cotizaciones de mercado.

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

Un pago confirmado identifica pagador, destinatario, importe, moneda y estado; exige fondos sandbox suficientes. Los límites adicionales quedan sujetos a una decisión de producto.

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

## RN-PROD-13 — Pago sandbox a comercio extranjero

El usuario revisa comercio, importe, moneda y cotización aplicable; el resultado solo afecta al libro sandbox y no representa adquirencia ni liquidación real.

**Requisitos relacionados:** RF-COM-01, RF-FX-01.
