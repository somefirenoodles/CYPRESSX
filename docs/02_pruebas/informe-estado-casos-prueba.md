# Informe de estado de casos de prueba

**ID del informe:** INF-CP-01  
**Fecha:** 2026-10-29  
**Proyecto:** Superpay  
**Entorno previsto:** aplicación web local, API y Oracle local.  
**Estado de ejecución:** los cuatro casos están diseñados, pero no ejecutados. “Exitoso” y “fallido” identifican el resultado que cada escenario busca comprobar; no son resultados observados.

Este informe contiene **dos casos de prueba por cada uno de dos casos de uso distintos**: uno con flujo válido y otro que espera un rechazo controlado. No se ejecutaron pruebas ni se modificó la base de datos.

## CU-GAS-01 — Dividir gastos compartidos

Caso de uso documentado en [casos-uso-ampliacion.md](../01_requisitos/casos-uso-ampliacion.md). La implementación activa permite crear divisiones y solicitudes individuales; la política de reparto y otras condiciones de aceptación siguen pendientes de validación.

### CP-GAS-04 — Crear división válida (resultado esperado: exitoso)

| Campo | Detalle |
|---|---|
| **Tipo** | Positivo |
| **Datos** | Usuario organizador autenticado; dos participantes distintos y existentes; total USD 30.00; identificadores de participantes obtenidos de la base local. |
| **Precondiciones** | API y Oracle disponibles; esquema preparado; organizador y participantes registrados; la regla de reparto aprobada para la demostración. |
| **Pasos** | 1. Abrir «Dividir gasto».<br>2. Ingresar título y total de USD 30.00.<br>3. Seleccionar a dos participantes válidos.<br>4. Confirmar la división.<br>5. Revisar las solicitudes de pago creadas para cada participante. |
| **Resultado esperado** | División persistida; se crean exactamente dos solicitudes pendientes, una por participante; el total de sus importes suma USD 30.00; no se debitan saldos al crear la división. |
| **Resultado obtenido** | No ejecutado. |
| **Estado** | No ejecutado. |
| **Evidencia** | Pendiente de ejecución; registrar respuesta de la aplicación y comprobación de persistencia Oracle. |

### CP-GAS-05 — Rechazar división con participante duplicado (resultado esperado: fallido)

| Campo | Detalle |
|---|---|
| **Tipo** | Negativo |
| **Datos** | Usuario organizador autenticado; un participante existente enviado dos veces; total USD 30.00. |
| **Precondiciones** | API y Oracle disponibles; esquema preparado; organizador y participante registrados. |
| **Pasos** | 1. Abrir «Dividir gasto».<br>2. Ingresar título, total USD 30.00 y dos entradas con el mismo ID de participante.<br>3. Intentar confirmar.<br>4. Consultar solicitudes y división persistida. |
| **Resultado esperado** | El sistema rechaza la entrada duplicada y no crea división ni solicitudes parciales. |
| **Resultado obtenido** | No ejecutado. |
| **Estado** | No ejecutado. |
| **Evidencia** | Pendiente. Si el sistema acepta el duplicado o deja datos parciales, registrar el comportamiento como fallo observado y asociar un defecto. |

## CU-TX-04 — Consultar historial de transacciones

Caso de uso documentado en [casos-uso-ampliacion.md](../01_requisitos/casos-uso-ampliacion.md). El dashboard activo consulta y muestra operaciones vinculadas al usuario autenticado.

### CP-TX-09 — Consultar historial propio (resultado esperado: exitoso)

| Campo | Detalle |
|---|---|
| **Tipo** | Positivo |
| **Datos** | Usuario de prueba `ana.prueba` con al menos una operación previa asociada a su cuenta. |
| **Precondiciones** | API y Oracle disponibles; esquema preparado; usuario registrado y con sesión válida; operación previa disponible. |
| **Pasos** | 1. Iniciar sesión como Ana.<br>2. Abrir el inicio/historial.<br>3. Revisar las operaciones y comparar importe, contraparte y estado con la operación persistida. |
| **Resultado esperado** | Se muestran las operaciones en las que Ana participa, con datos y estados consistentes con Oracle; la consulta no altera saldos. |
| **Resultado obtenido** | No ejecutado. |
| **Estado** | No ejecutado. |
| **Evidencia** | Pendiente de ejecución; conservar captura sin información sensible y resultado de consulta preparado. |

### CP-TX-10 — Bloquear historial sin sesión (resultado esperado: fallido)

| Campo | Detalle |
|---|---|
| **Tipo** | Negativo |
| **Datos** | Navegador sin cookie/sesión autenticada; endpoint de dashboard/historial. |
| **Precondiciones** | API disponible; cerrar sesión y confirmar que el navegador no conserva una sesión válida. |
| **Pasos** | 1. Cerrar sesión.<br>2. Solicitar directamente la ruta privada de historial/dashboard.<br>3. Inspeccionar respuesta y contenido visible. |
| **Resultado esperado** | El acceso se deniega o redirige al inicio de sesión; no se devuelven operaciones ni saldos privados. |
| **Resultado obtenido** | No ejecutado. |
| **Estado** | No ejecutado. |
| **Evidencia** | Pendiente. Si se devuelven datos privados, registrar el fallo observado y asociar un defecto de autorización. |

## Resumen

| Caso de uso | Caso positivo | Caso negativo | Estado actual |
|---|---|---|---|
| CU-GAS-01 — Dividir gastos compartidos | CP-GAS-04: resultado esperado exitoso | CP-GAS-05: resultado esperado fallido/rechazado | Ambos no ejecutados |
| CU-TX-04 — Consultar historial | CP-TX-09: resultado esperado exitoso | CP-TX-10: resultado esperado fallido/denegado | Ambos no ejecutados |

Los términos “exitoso” y “fallido” describen el resultado esperado del flujo válido o inválido. Para informar un **resultado real** hace falta ejecutar cada caso y sustituir “No ejecutado” por el estado observado, adjuntando evidencia. Un caso negativo queda aprobado si el sistema rechaza correctamente la acción inválida.
