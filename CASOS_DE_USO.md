# Especificación de casos de uso

## Alcance

Este documento describe los principales comportamientos funcionales de Cypress Real World App (RWA). La especificación se derivó de la interfaz, los controladores del backend y las pruebas automatizadas incluidas en el repositorio.

## Actores

| Actor | Descripción |
| --- | --- |
| Visitante | Persona que todavía no ha iniciado sesión. |
| Usuario autenticado | Persona registrada con una sesión activa. |
| Usuario receptor | Usuario que recibe un pago o una solicitud de pago. |
| Sistema | Aplicación web, API Express y base de datos local. |

## Resumen

| ID | Caso de uso | Actor principal |
| --- | --- | --- |
| CU-01 | Registrar una cuenta de usuario | Visitante |
| CU-02 | Iniciar sesión | Visitante |
| CU-03 | Vincular una cuenta bancaria | Usuario autenticado |
| CU-04 | Enviar un pago | Usuario autenticado |
| CU-05 | Solicitar un pago | Usuario autenticado |
| CU-06 | Resolver una solicitud de pago | Usuario receptor |
| CU-07 | Consultar y filtrar transacciones | Usuario autenticado |
| CU-08 | Interactuar con una transacción | Usuario autenticado |

## CU-01. Registrar una cuenta de usuario

| Campo | Especificación |
| --- | --- |
| Objetivo | Crear una identidad válida para acceder a la aplicación. |
| Actor principal | Visitante. |
| Precondiciones | El visitante no posee una sesión activa. El nombre de usuario no está registrado. |
| Disparador | El visitante selecciona la opción de registro. |
| Postcondición de éxito | El sistema crea el usuario y permite continuar con la configuración inicial. |
| Postcondición de fallo | No se crea ningún usuario y el formulario conserva mensajes de validación. |
| Trazabilidad | `cypress/tests/ui/auth.spec.ts` y `cypress/tests/api/api-users.spec.ts`. |

### Flujo principal

1. El visitante abre el formulario de registro.
2. El sistema solicita nombre, apellido, nombre de usuario y contraseña.
3. El visitante introduce datos válidos y confirma la contraseña.
4. El sistema valida los campos obligatorios y la coincidencia de contraseñas.
5. El sistema registra al usuario.
6. El sistema redirige al usuario al inicio de sesión o al proceso de incorporación.

### Flujos alternos

- **A1. Campos incompletos o inválidos:** el sistema identifica cada campo incorrecto y no envía el formulario.
- **A2. Las contraseñas no coinciden:** el sistema informa la inconsistencia y solicita corregirla.
- **A3. Nombre de usuario existente:** la API rechaza la creación y el sistema muestra el error.

## CU-02. Iniciar sesión

| Campo | Especificación |
| --- | --- |
| Objetivo | Autenticar al usuario y habilitar las funciones privadas. |
| Actor principal | Visitante. |
| Precondiciones | Existe un usuario registrado y activo. |
| Disparador | El visitante envía el formulario de inicio de sesión. |
| Postcondición de éxito | Se crea una sesión y se muestra la página principal. |
| Postcondición de fallo | El visitante permanece sin autenticar. |
| Trazabilidad | `cypress/tests/ui/auth.spec.ts` y `cypress/tests/api/api-users.spec.ts`. |

### Flujo principal

1. El visitante introduce un nombre de usuario y una contraseña.
2. El sistema valida que ambos campos estén completos.
3. El sistema verifica las credenciales.
4. El sistema crea la sesión.
5. El sistema redirige al usuario a la página principal.

### Flujos alternos

- **A1. Usuario inexistente:** el sistema rechaza la autenticación y muestra un mensaje de error.
- **A2. Contraseña incorrecta:** el sistema rechaza la autenticación sin revelar información sensible.
- **A3. Usuario no autenticado intenta abrir una ruta privada:** el sistema lo redirige al inicio de sesión.
- **A4. Opción “Recordarme” activada:** el sistema conserva la sesión durante el periodo configurado.

## CU-03. Vincular una cuenta bancaria

| Campo | Especificación |
| --- | --- |
| Objetivo | Asociar una cuenta bancaria al perfil para habilitar las operaciones financieras simuladas. |
| Actor principal | Usuario autenticado. |
| Precondiciones | El usuario inició sesión. |
| Disparador | El usuario abre la administración de cuentas bancarias o completa la incorporación inicial. |
| Postcondición de éxito | La cuenta bancaria queda vinculada y visible en la lista del usuario. |
| Postcondición de fallo | No se almacena una cuenta con datos inválidos. |
| Trazabilidad | `cypress/tests/ui/bankaccounts.spec.ts` y `cypress/tests/api/api-bankaccounts.spec.ts`. |

### Flujo principal

1. El usuario selecciona la opción para crear una cuenta bancaria.
2. El sistema solicita nombre del banco, número de ruta y número de cuenta.
3. El usuario introduce datos válidos.
4. El sistema valida el formato de los datos.
5. El sistema guarda la cuenta y actualiza la lista.

### Flujos alternos

- **A1. Datos incompletos o formato inválido:** el sistema muestra errores y no crea la cuenta.
- **A2. Eliminación de una cuenta:** el usuario solicita eliminarla y el sistema realiza una eliminación lógica.
- **A3. Usuario sin cuentas:** el sistema muestra el estado vacío y el proceso de incorporación.

## CU-04. Enviar un pago

| Campo | Especificación |
| --- | --- |
| Objetivo | Transferir un monto simulado a otro usuario. |
| Actor principal | Usuario autenticado. |
| Actor secundario | Usuario receptor. |
| Precondiciones | El usuario inició sesión, posee una cuenta bancaria vinculada y existe un receptor seleccionable. |
| Disparador | El usuario selecciona “Nueva transacción”. |
| Postcondición de éxito | Se registra una transacción de pago y se actualizan los saldos simulados. |
| Postcondición de fallo | No se crea la transacción ni se modifican los saldos. |
| Trazabilidad | `cypress/tests/ui/new-transaction.spec.ts` y `cypress/tests/api/api-transactions.spec.ts`. |

### Flujo principal

1. El usuario inicia una nueva transacción.
2. El sistema muestra usuarios disponibles y permite buscarlos.
3. El usuario selecciona al receptor.
4. El usuario introduce el monto y una nota.
5. El usuario selecciona la modalidad de pago.
6. El sistema valida la operación y registra la transacción.
7. El sistema muestra la confirmación.
8. El sistema incorpora la transacción a los historiales correspondientes.

### Flujos alternos

- **A1. Receptor no seleccionado:** el sistema impide continuar.
- **A2. Monto o nota inválidos:** el sistema muestra los errores del formulario.
- **A3. Error de API:** el sistema informa el fallo y no registra una transacción parcial.

## CU-05. Solicitar un pago

| Campo | Especificación |
| --- | --- |
| Objetivo | Crear una solicitud de dinero dirigida a otro usuario. |
| Actor principal | Usuario autenticado. |
| Actor secundario | Usuario receptor. |
| Precondiciones | El solicitante inició sesión y el receptor existe. |
| Disparador | El usuario selecciona la modalidad de solicitud al crear una transacción. |
| Postcondición de éxito | La solicitud queda registrada con estado pendiente y el receptor recibe una notificación. |
| Postcondición de fallo | No se crea la solicitud. |
| Trazabilidad | `cypress/tests/ui/new-transaction.spec.ts`, `cypress/tests/ui/notifications.spec.ts` y `cypress/tests/api/api-transactions.spec.ts`. |

### Flujo principal

1. El usuario inicia una nueva transacción.
2. El usuario busca y selecciona al receptor.
3. El usuario introduce el monto y una nota.
4. El usuario selecciona la modalidad de solicitud.
5. El sistema registra la transacción como pendiente.
6. El sistema notifica al receptor.

### Flujos alternos

- **A1. Datos inválidos:** el sistema identifica los campos incorrectos y no crea la solicitud.
- **A2. Receptor inexistente:** la búsqueda no permite seleccionar un destinatario inválido.

## CU-06. Resolver una solicitud de pago

| Campo | Especificación |
| --- | --- |
| Objetivo | Aceptar o rechazar una solicitud de pago pendiente. |
| Actor principal | Usuario receptor. |
| Precondiciones | El usuario inició sesión y posee una solicitud pendiente dirigida a su cuenta. |
| Disparador | El usuario abre el detalle de la solicitud. |
| Postcondición de éxito | La solicitud cambia a aceptada o rechazada. Si se acepta, se aplican los efectos financieros simulados. |
| Postcondición de fallo | La solicitud conserva su estado anterior. |
| Trazabilidad | `cypress/tests/ui/transaction-view.spec.ts` y `cypress/tests/api/api-transactions.spec.ts`. |

### Flujo principal: aceptar

1. El usuario abre una solicitud pendiente.
2. El sistema muestra su emisor, monto, nota y estado.
3. El usuario selecciona aceptar.
4. El sistema actualiza la solicitud.
5. El sistema muestra el estado completado y oculta las acciones de resolución.

### Flujos alternos

- **A1. Rechazar solicitud:** en el paso 3, el usuario selecciona rechazar y el sistema registra el estado correspondiente.
- **A2. Solicitud ya resuelta:** el sistema muestra el estado final sin botones para aceptar o rechazar.
- **A3. Fallo de actualización:** el sistema conserva el estado pendiente y comunica el error.

## CU-07. Consultar y filtrar transacciones

| Campo | Especificación |
| --- | --- |
| Objetivo | Examinar movimientos públicos, personales y de contactos. |
| Actor principal | Usuario autenticado. |
| Precondiciones | El usuario inició sesión. |
| Disparador | El usuario abre uno de los historiales de transacciones. |
| Postcondición de éxito | El sistema muestra únicamente los movimientos que satisfacen la vista y los filtros seleccionados. |
| Trazabilidad | `cypress/tests/ui/transaction-feeds.spec.ts` y `cypress/tests/api/api-transactions.spec.ts`. |

### Flujo principal

1. El usuario abre el historial público, personal o de contactos.
2. El sistema recupera la primera página de resultados.
3. El usuario establece un intervalo de fechas o montos.
4. El sistema consulta los datos con los criterios seleccionados.
5. El sistema actualiza la lista.
6. El usuario solicita más resultados y el sistema pagina la consulta.

### Flujos alternos

- **A1. Ningún movimiento coincide:** el sistema muestra un estado vacío.
- **A2. Intervalo inválido:** el sistema no aplica el filtro y solicita su corrección.
- **A3. Vista personal:** el sistema limita los resultados a transacciones del usuario.
- **A4. Vista de contactos:** el sistema limita los resultados a transacciones de sus contactos.

## CU-08. Interactuar con una transacción

| Campo | Especificación |
| --- | --- |
| Objetivo | Expresar una reacción o publicar un comentario sobre una transacción. |
| Actor principal | Usuario autenticado. |
| Actores secundarios | Participantes de la transacción. |
| Precondiciones | El usuario inició sesión y la transacción existe. |
| Disparador | El usuario abre el detalle de una transacción. |
| Postcondición de éxito | Se registra el “Me gusta” o comentario y se generan las notificaciones correspondientes. |
| Postcondición de fallo | La interacción no se registra. |
| Trazabilidad | `cypress/tests/ui/transaction-view.spec.ts`, `cypress/tests/ui/notifications.spec.ts`, `cypress/tests/api/api-likes.spec.ts` y `cypress/tests/api/api-comments.spec.ts`. |

### Flujo principal: comentar

1. El usuario abre el detalle de una transacción.
2. El sistema muestra sus datos, reacciones y comentarios.
3. El usuario introduce un comentario válido.
4. El sistema registra y muestra el comentario.
5. El sistema genera notificaciones para los participantes aplicables.

### Flujos alternos

- **A1. Marcar “Me gusta”:** el usuario selecciona la reacción y el sistema la registra.
- **A2. Comentario vacío o inválido:** el sistema no lo publica.
- **A3. El actor participa en la transacción:** el sistema evita notificaciones redundantes para la misma acción cuando corresponde.

## Reglas funcionales transversales

1. Las rutas privadas requieren una sesión autenticada.
2. Los formularios deben impedir el envío de datos obligatorios incompletos o inválidos.
3. Cada transacción distingue entre pago y solicitud.
4. Una solicitud pendiente solo puede resolverse una vez.
5. Las operaciones que afectan a otros usuarios deben generar las notificaciones definidas por la aplicación.
6. Los historiales deben respetar el alcance público, personal o de contactos.
7. El restablecimiento de la base de datos de prueba debe producir resultados repetibles.
