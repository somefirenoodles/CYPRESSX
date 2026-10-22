# Casos de uso — ampliación funcional de AASP (iteración 2)

**Estado:** especificaciones propuestas, pendientes de validación con interesados y pruebas de aceptación.  
**Alcance:** autenticación, consulta de transacciones, cuentas, contactos, notificaciones y división de gastos.  
**Referencia:** [casos de uso transaccionales existentes](./casos-uso-transacciones.md) (CU-TX-01, CU-TX-02 y CU-TX-03).

> **Convención:** «base heredada» indica que se identificaron flujos o pruebas en el código original, **no** que cumplan todos estos criterios. «Nueva funcionalidad» indica que su implementación está pendiente. Ningún escenario de este documento debe considerarse ejecutado o aprobado.

## CU-AUT-01 — Iniciar sesión
- **Origen:** base heredada. **Prioridad:** alta. **Requisito:** RF-AUT-01.
- **Actor principal:** visitante registrado.
- **Objetivo:** acceder de manera autenticada a los recursos de su cuenta.
- **Precondiciones:** usuario existente, habilitado y sin sesión autenticada.
- **Disparador:** selección de «Iniciar sesión».
- **Flujo principal:** (1) ingresar usuario y contraseña; (2) enviar formulario; (3) validar credenciales en el servidor; (4) crear sesión; (5) redirigir al inicio autenticado.
- **Alternativas:** A1, usuario ya autenticado: acceder sin repetir autenticación si su sesión sigue vigente.
- **Excepciones:** E1, credenciales inválidas: mostrar error genérico sin autenticar; E2, campos obligatorios vacíos: impedir envío; E3, sesión expirada: solicitar nuevo acceso.
- **Postcondición de éxito:** sesión válida asociada únicamente al usuario autenticado.
- **Postcondición de fallo:** no se inicia sesión ni se exponen recursos privados.
- **Aceptación:** no permitir la consulta de datos privados sin sesión; no revelar si existe un nombre de usuario mediante errores diferenciados.

## CU-AUT-02 — Registrar usuario
- **Origen:** base heredada. **Prioridad:** alta. **Requisito:** RF-AUT-02.
- **Actor principal:** visitante.
- **Objetivo:** crear una cuenta de AASP.
- **Precondiciones:** no tener sesión iniciada; disponer de datos de registro válidos.
- **Disparador:** selección de «Registrarse».
- **Flujo principal:** (1) completar nombre, apellido, usuario, contraseña y confirmación; (2) validar formato y concordancia; (3) comprobar disponibilidad del identificador; (4) registrar la cuenta; (5) mostrar confirmación e iniciar proceso de acceso/onboarding.
- **Alternativas:** A1, omitir la configuración de cuenta bancaria cuando el diseño de onboarding lo permita.
- **Excepciones:** E1, identificador ocupado: rechazar sin duplicar usuario; E2, contraseñas distintas o datos inválidos: mostrar validaciones; E3, error de persistencia: no crear registro parcial.
- **Postcondición de éxito:** cuenta única creada y lista para autenticación.
- **Postcondición de fallo:** no se almacena una cuenta incompleta.
- **Aceptación:** unicidad del usuario y almacenamiento no reversible de contraseñas.

## CU-TX-04 — Consultar historial de transacciones
- **Origen:** base heredada. **Prioridad:** alta. **Requisito:** RF-TX-09.
- **Actor principal:** usuario autenticado.
- **Objetivo:** revisar su historial de pagos y solicitudes.
- **Precondiciones:** sesión válida.
- **Disparador:** abrir la vista de movimientos personales.
- **Flujo principal:** (1) solicitar movimientos; (2) verificar identidad en servidor; (3) recuperar transacciones vinculadas al usuario; (4) mostrar tipo, participantes, importe, fecha y estado; (5) permitir navegación o filtrado/paginación disponible.
- **Alternativas:** A1, lista vacía: presentar estado vacío; A2, paginación: mostrar resultados sucesivos sin duplicados.
- **Excepciones:** E1, sesión vencida: bloquear acceso; E2, consulta fallida: informar error sin mostrar datos ajenos.
- **Postcondición de éxito:** lista de movimientos permitidos visible; sin cambio en los saldos.
- **Aceptación:** respetar el filtro personal y las reglas de visibilidad de transacciones (las vistas públicas o de contactos son independientes).

## CU-TX-05 — Consultar detalle de transacción
- **Origen:** base heredada. **Prioridad:** alta. **Requisito:** RF-TX-10.
- **Actor principal:** usuario autenticado con permiso de visualización.
- **Objetivo:** inspeccionar una transacción seleccionada.
- **Precondiciones:** transacción existente y sesión válida.
- **Disparador:** seleccionar un movimiento desde una lista o abrir su URL.
- **Flujo principal:** (1) solicitar transacción por identificador; (2) validar visibilidad de acuerdo con participantes y nivel de privacidad; (3) recuperar sus datos; (4) mostrar emisor, receptor, importe, descripción y estado; (5) ofrecer acciones solo si el actor está autorizado.
- **Alternativas:** A1, solicitud pendiente dirigida al actor: habilitar aceptar/rechazar, cuya lógica corresponde a CU-TX-03.
- **Excepciones:** E1, identificador inexistente: no encontrado; E2, sin permiso: acceso denegado; E3, sesión inválida: requerir inicio de sesión.
- **Postcondición de éxito:** detalle visible sin alterar el registro.
- **Aceptación:** el servidor aplica visibilidad; no basta con ocultar acciones en la interfaz.

## CU-CTA-01 — Gestionar cuentas bancarias
- **Origen:** base heredada; el flujo documentado se limita a listar, asociar y deshabilitar cuentas de prueba. **Prioridad:** media. **Requisito:** RF-CTA-01.
- **Actor principal:** usuario autenticado.
- **Objetivo:** mantener sus cuentas asociadas para operaciones del sistema.
- **Precondiciones:** sesión válida; datos de cuenta disponibles para asociación.
- **Disparador:** abrir el apartado de cuentas bancarias.
- **Flujo principal:** (1) consultar cuentas vinculadas; (2) elegir agregar; (3) introducir nombre del banco, número de ruta y número de cuenta; (4) validar formato; (5) registrar la asociación con el titular; (6) confirmar y actualizar listado.
- **Alternativas:** A1, seleccionar eliminar/deshabilitar: confirmar y marcar cuenta como inactiva sin afectar otras cuentas.
- **Excepciones:** E1, campos inválidos: impedir asociación; E2, cuenta no perteneciente al actor: impedir modificación; E3, operación fallida: conservar estado anterior.
- **Postcondición de éxito:** asociación creada o deshabilitada solo para el titular.
- **Aceptación:** proteger y no revelar íntegramente identificadores bancarios en respuestas o registros; este CU **no** presupone conexión real con bancos.

## CU-CON-01 — Buscar y administrar contactos
- **Origen:** búsqueda de usuarios y listado de actividad de contactos identificados en base heredada; **alta/baja explícita de contactos, por validar o implementar**. **Prioridad:** media. **Requisito:** RF-CON-01.
- **Actor principal:** usuario autenticado.
- **Objetivo:** localizar usuarios y mantener destinatarios frecuentes.
- **Precondiciones:** sesión válida.
- **Disparador:** abrir la búsqueda/lista de contactos.
- **Flujo principal propuesto:** (1) introducir criterio; (2) obtener usuarios permitidos por la política de visibilidad; (3) seleccionar uno; (4) agregarlo a contactos si la operación está disponible; (5) mostrar lista actualizada.
- **Alternativas:** A1, contacto ya agregado: no duplicar; A2, retirar contacto: confirmar y quitar asociación sin borrar al otro usuario ni sus transacciones.
- **Excepciones:** E1, usuario inexistente: mostrar lista vacía; E2, intentar modificar contactos ajenos: denegar; E3, error de persistencia: conservar lista previa.
- **Postcondición de éxito:** lista personal actualizada; no se modifican saldos.
- **Aceptación:** búsqueda sin exposición de datos privados y asociaciones sin duplicados. **Se debe comprobar la existencia real de altas/bajas antes de marcarlas como implementadas.**

## CU-GAS-01 — Dividir gastos compartidos
- **Origen:** nueva funcionalidad propuesta, **sin implementación ni pruebas verificadas**. **Prioridad:** media. **Requisito:** RF-GAS-01.
- **Actor principal:** usuario autenticado (organizador).
- **Actores secundarios:** participantes seleccionados.
- **Objetivo:** repartir un importe entre varios participantes y generar solicitudes individuales.
- **Precondiciones:** organizador autenticado; participantes válidos; importe positivo.
- **Disparador:** seleccionar «Dividir gasto».
- **Flujo principal propuesto:** (1) indicar importe, descripción y participantes; (2) seleccionar reparto equitativo o asignaciones personalizadas; (3) validar que la suma de participaciones coincide exactamente con el total en unidades monetarias mínimas; (4) confirmar; (5) crear solicitudes individuales pendientes; (6) notificar a cada participante.
- **Alternativas:** A1, reparto equitativo con centavos residuales: distribuirlos de forma determinista y visible antes de confirmar; A2, reparto personalizado: exigir suma exacta.
- **Excepciones:** E1, participante duplicado o no válido: rechazar; E2, suma distinta del total: impedir confirmación; E3, fallo al guardar: no dejar solicitudes parciales ni duplicar solicitudes al reintentar.
- **Postcondición de éxito:** grupo de solicitudes pendiente con total conciliado; los saldos no cambian hasta cada aceptación.
- **Aceptación:** trazabilidad entre gasto y solicitudes, idempotencia y respeto a las reglas RN-TX-01 a RN-TX-08. **Política de deuda del organizador y reparto entre participantes pendiente de decisión de producto.**

## CU-NOT-01 — Consultar notificaciones
- **Origen:** base heredada. **Prioridad:** media. **Requisito:** RF-NOT-01.
- **Actor principal:** usuario autenticado.
- **Objetivo:** conocer eventos relacionados con sus pagos y solicitudes.
- **Precondiciones:** sesión válida.
- **Disparador:** abrir la bandeja de notificaciones.
- **Flujo principal:** (1) solicitar notificaciones del usuario; (2) filtrar por destinatario en servidor; (3) mostrar evento, emisor y referencia al movimiento; (4) permitir consultar el detalle permitido.
- **Alternativas:** A1, bandeja vacía: informar que no hay notificaciones; A2, descartar o marcar notificación como leída si la opción está disponible.
- **Excepciones:** E1, sesión inválida: denegar; E2, intento de consultar una notificación ajena: denegar.
- **Postcondición de éxito:** notificaciones propias visibles; no se alteran movimientos financieros.
- **Aceptación:** un evento financiero no debe notificar duplicadamente por reintentos inválidos (RN-TX-08).

## Trazabilidad preliminar a código y pruebas heredadas

| Caso de uso | Evidencia del repositorio | Estado de cobertura |
| --- | --- | --- |
| CU-AUT-01 / CU-AUT-02 | `cypress/tests/ui/auth.spec.ts` | Pruebas heredadas relacionadas; falta contrastar criterios nuevos |
| CU-TX-04 | `cypress/tests/ui/transaction-feeds.spec.ts` | Pruebas heredadas de feeds y paginación |
| CU-TX-05 | `cypress/tests/ui/transaction-view.spec.ts` | Pruebas heredadas del detalle |
| CU-CTA-01 | `cypress/tests/ui/bankaccounts.spec.ts` | Pruebas heredadas de alta, validación y baja lógica |
| CU-CON-01 | `cypress/tests/ui/new-transaction.spec.ts`, `cypress/tests/ui/transaction-feeds.spec.ts` | Búsqueda/feed presentes; alta/baja específica sin verificar |
| CU-GAS-01 | Ninguna identificada | Desarrollo y pruebas pendientes |
| CU-NOT-01 | `cypress/tests/ui/notifications.spec.ts` | Pruebas heredadas de notificaciones |

Consulte [requisitos de ampliación](./requisitos-ampliacion.md) y [escenarios de prueba propuestos](../02_pruebas/escenarios-ampliacion.md).

**Nota:** este cambio amplía documentación. No modifica la implementación, no corrige los defectos reservados y no certifica pruebas.
