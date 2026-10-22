# Escenarios de prueba — ampliación de AASP

**Estado general: NO EJECUTADO.** Este documento constituye un diseño de pruebas, no evidencia de aprobación ni de fallo.  
**Alcance:** [casos de uso de ampliación](../01_requisitos/casos-uso-ampliacion.md) y [requisitos ampliados](../01_requisitos/requisitos-ampliacion.md).  
**Herramientas recomendadas:** Cypress E2E/API; Vitest para lógica de negocio; ESLint y `yarn types` para controles estáticos.

## Matriz de escenarios propuestos

| Caso de prueba | CU / RF | Tipo | Datos y pasos esenciales | Resultado esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| CP-AUT-01 | CU-AUT-01 / RF-AUT-01 | Positivo | Usuario de prueba vigente; iniciar sesión con credenciales válidas | Sesión iniciada, usuario correcto y acceso permitido | No ejecutado |
| CP-AUT-02 | CU-AUT-01 / RF-AUT-01 | Negativo | Contraseña errónea; intentar entrar a una ruta privada | Error genérico, sin sesión ni datos privados | No ejecutado |
| CP-AUT-03 | CU-AUT-02 / RF-AUT-02 | Positivo | Registrar identificador libre con datos válidos | Usuario único persistido y habilitado para acceso | No ejecutado |
| CP-AUT-04 | CU-AUT-02 / RF-AUT-02 | Negativo | Repetir nombre de usuario o confirmar contraseña distinta | Registro rechazado; no hay cuentas parciales o duplicadas | No ejecutado |
| CP-TX-09 | CU-TX-04 / RF-TX-09 | Positivo | Usuario con varios movimientos personales; consultar y paginar | Datos propios, importes y estados correctos, sin duplicados | No ejecutado |
| CP-TX-10 | CU-TX-04 / RF-TX-09 | Negativo | Consultar historial sin sesión o intentar acceder a datos privados de otro usuario | Acceso denegado; no hay filtración de transacciones | No ejecutado |
| CP-TX-11 | CU-TX-05 / RF-TX-10 | Positivo | Abrir detalle de transacción visible al actor | Se muestran participantes, importe, descripción y estado | No ejecutado |
| CP-TX-12 | CU-TX-05 / RF-TX-10 | Negativo | Solicitar detalle privado ajeno o identificador inexistente | Respuesta de denegación o no encontrado, sin datos privados | No ejecutado |
| CP-CTA-01 | CU-CTA-01 / RF-CTA-01 | Positivo | Asociar cuenta de prueba válida y luego deshabilitarla | Asociada al titular; deshabilitación reflejada sin afectar otras cuentas | No ejecutado |
| CP-CTA-02 | CU-CTA-01 / RF-CTA-01 | Negativo | Número de cuenta inválido o intentar alterar cuenta ajena | Validación o denegación; no hay modificación ilegítima | No ejecutado |
| CP-CON-01 | CU-CON-01 / RF-CON-01 | Positivo | Buscar usuario existente y añadirlo a contactos | Resultado permitido; relación propia creada una sola vez | No ejecutado; alta por verificar |
| CP-CON-02 | CU-CON-01 / RF-CON-01 | Negativo | Agregar contacto duplicado, inexistente o de otro usuario | No duplicados, filtración ni asociación ajena | No ejecutado; alta por verificar |
| CP-GAS-01 | CU-GAS-01 / RF-GAS-01 | Positivo | Dividir 10.00 entre 3 participantes según política definida | Participaciones de 3.34, 3.33 y 3.33; suma 10.00; solicitudes pendientes; sin movimientos de saldo | No ejecutado; nueva funcionalidad |
| CP-GAS-02 | CU-GAS-01 / RF-GAS-01 | Negativo | Duplicar participante, introducir importe inválido o reintentar tras error | Rechazo o reintento seguro; sin solicitudes parciales ni duplicadas | No ejecutado; nueva funcionalidad |
| CP-NOT-01 | CU-NOT-01 / RF-NOT-01 | Positivo | Generar solicitud y abrir bandeja del destinatario | Aparece una notificación correspondiente; sin duplicados | No ejecutado |
| CP-NOT-02 | CU-NOT-01 / RF-NOT-01 | Negativo | Abrir notificación ajena o reintentar resolución inválida | No se muestra evento ajeno ni se genera notificación financiera duplicada | No ejecutado |

**Nota:** CP-GAS-01 usa tres participantes como receptores de las solicitudes; la inclusión del organizador requiere una decisión de producto. Los valores en centavos son un criterio de diseño, no comportamiento observado.

## Defectos reservados vinculados

| Defecto | Riesgo cubierto | Pruebas relacionadas |
| --- | --- | --- |
| DF-001 | Rechazar una solicitud altera saldos | Casos de la línea base CU-TX-03; ampliar regresión |
| DF-002 | Resolución repetida causa débitos/créditos o eventos duplicados | CU-TX-03, CP-NOT-02 |
| DF-003 | Pérdida de precisión monetaria | RF-TX-07, CP-GAS-01 (futura) |
| DF-004 | Autorización insuficiente | CP-TX-10, CP-TX-12, CP-CTA-02 |

Fuente: [registro de defectos reservados](../03_mantenimiento/defectos-reservados.md). No se declara ninguno reproducido mediante estas especificaciones.

## Evidencia mínima por ejecución

Por cada prueba registrar: identificador, requisito/CU, commit y entorno, datos iniciales, actor, pasos, resultado esperado, resultado observado, estado (**Aprobado**, **Fallido**, **Bloqueado** o **No ejecutado**), evidencia y defecto asociado si procede. Una prueba negativa se marca **Aprobada** cuando el sistema rechaza correctamente una operación inválida.

## Archivos heredados para reutilizar, previa revisión

- `cypress/tests/ui/auth.spec.ts`: inicio de sesión y registro.
- `cypress/tests/ui/transaction-feeds.spec.ts`: feeds e historial.
- `cypress/tests/ui/transaction-view.spec.ts`: detalle.
- `cypress/tests/ui/bankaccounts.spec.ts`: cuentas de prueba.
- `cypress/tests/ui/new-transaction.spec.ts`: búsqueda de usuarios en transacciones.
- `cypress/tests/ui/notifications.spec.ts`: notificaciones.

No se han añadido ni ejecutado pruebas automatizadas con este cambio documental. Los comportamientos no implementados deben registrarse como **Bloqueados** al planificar su ejecución, no como fallos confirmados.
