# Requisitos funcionales — ampliación AASP (iteración 2)

**Estado:** propuesta documental, pendiente de revisión y aprobación.  
**Relación:** [casos de uso de ampliación](./casos-uso-ampliacion.md).  
**Alcance:** los requisitos son **comportamientos esperados**, no declaraciones de conformidad de la implementación. Para los requisitos transaccionales iniciales, consulte [RF-TX-01 a RF-TX-08](./requisitos-transacciones.md).

## RF-AUT-01 — Autenticación segura
El sistema debe permitir iniciar sesión a un usuario registrado únicamente con credenciales válidas.
- Debe validar las credenciales en el servidor y asociar la sesión al usuario correcto.
- Debe impedir el acceso a recursos privados sin sesión válida y requerir nuevo acceso tras expiración.
- Las credenciales incorrectas deben producir una respuesta sin autenticación y sin revelar existencia de usuarios.

**Trazabilidad:** CU-AUT-01; CP-AUT-01 y CP-AUT-02.

## RF-AUT-02 — Registro de cuenta
El sistema debe registrar usuarios con identificadores únicos y datos obligatorios válidos.
- Debe comprobar coincidencia de contraseña y confirmación; rechazar campos inválidos.
- Debe impedir duplicados y evitar registros parciales.
- Las contraseñas deben protegerse mediante un mecanismo de almacenamiento no reversible adecuado.

**Trazabilidad:** CU-AUT-02; CP-AUT-03 y CP-AUT-04.

## RF-TX-09 — Historial personal de transacciones
El sistema debe permitir consultar los movimientos permitidos al usuario autenticado.
- Debe recuperar pagos y solicitudes propios sin incluir movimientos privados ajenos.
- Debe mostrar importe, tipo, fecha, participantes y estado.
- Cuando haya paginación, debe mantener orden estable y evitar registros duplicados.

**Trazabilidad:** CU-TX-04; CP-TX-09 y CP-TX-10.

## RF-TX-10 — Consulta de detalle y visibilidad
El sistema debe permitir consultar los detalles de transacciones existentes cuando el actor tenga permiso.
- Debe validar en servidor el nivel de visibilidad (personal, contactos o público, según el modelo).
- Debe rechazar identificadores inexistentes y accesos no autorizados.
- Las opciones de aceptación y rechazo deben estar disponibles únicamente según actor y estado, sin reemplazar la autorización de CU-TX-03.

**Trazabilidad:** CU-TX-05; CP-TX-11 y CP-TX-12.

## RF-CTA-01 — Administración de cuentas bancarias de prueba
El sistema debe permitir a cada usuario listar, asociar y deshabilitar las cuentas que le pertenecen.
- Debe validar los datos de asociación antes de persistirlos.
- Debe impedir modificaciones sobre cuentas ajenas.
- Debe minimizar la exposición de identificadores bancarios y conservar integridad al fallar una operación.
- **No se supone** conectividad bancaria, pagos reales o verificación externa de titularidad en esta iteración.

**Trazabilidad:** CU-CTA-01; CP-CTA-01 y CP-CTA-02.

## RF-CON-01 — Búsqueda y gestión de contactos
El sistema debe permitir buscar usuarios visibles y, cuando se implemente la operación, asociarlos como contactos propios.
- Debe mostrar solo información permitida por las reglas de privacidad.
- No debe crear relaciones de contactos duplicadas.
- La eliminación de una relación no debe eliminar usuarios ni transacciones históricas.
- **Pendiente de verificación funcional:** altas y bajas de contactos; no deben declararse disponibles hasta validarlas en el producto.

**Trazabilidad:** CU-CON-01; CP-CON-01 y CP-CON-02.

## RF-GAS-01 — División de gastos (funcionalidad futura)
El sistema deberá permitir repartir un gasto entre participantes y crear solicitudes de pago individuales.
- Debe validar importe positivo, participantes únicos y distribución exacta en centavos.
- Debe distribuir de forma determinista los centavos sobrantes en repartos iguales, y mostrar el resultado antes de confirmar.
- Debe crear las solicitudes pendientes como una operación coherente; los saldos no deben modificarse en la creación.
- Debe impedir duplicados al reintentar una solicitud y respetar las reglas de aceptación, rechazo y autorización existentes.
- La política sobre inclusión del organizador en el reparto deberá definirse antes de su implementación.

**Trazabilidad:** CU-GAS-01; CP-GAS-01 y CP-GAS-02. **Estado:** sin desarrollo verificado.

## RF-NOT-01 — Notificaciones de eventos
El sistema debe mostrar notificaciones relacionadas con eventos relevantes del usuario.
- Debe filtrar por destinatario en el servidor y no exponer eventos de terceros.
- Debe presentar un estado vacío cuando no existan notificaciones.
- No debe crear eventos financieros duplicados como efecto de resoluciones inválidas o repetidas.

**Trazabilidad:** CU-NOT-01; CP-NOT-01 y CP-NOT-02.

## Criterios para cerrar esta línea base

1. Revisar y aprobar las reglas de negocio con el equipo del proyecto.
2. Trazar cada requisito a su caso de uso y a los casos de prueba identificados.
3. Ejecutar los escenarios con estado inicial controlado, resultado esperado y resultado observado.
4. Mantener los defectos reservados como evidencia de mantenimiento; no confundir un requisito escrito con un resultado aprobado.

**Nota de alcance:** los requisitos no funcionales de un producto financiero en producción (protección de datos, observabilidad, antifraude, disponibilidad, cumplimiento y respuesta a incidentes) requieren una especificación independiente antes de cualquier despliegue real.
