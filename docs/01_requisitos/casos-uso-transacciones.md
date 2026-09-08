# Casos de uso — núcleo transaccional

## CU-TX-01. Enviar un pago

| Campo | Especificación |
| --- | --- |
| Actor principal | Usuario autenticado |
| Actor secundario | Usuario receptor |
| Precondiciones | El actor posee sesión válida y el receptor existe. |
| Disparador | El usuario inicia una nueva transacción y selecciona pago. |
| Postcondición de éxito | La transacción queda completada, los saldos se actualizan exactamente una vez y se genera la notificación correspondiente. |
| Postcondición de fallo | No se registra una transacción parcial ni se modifican saldos. |
| Requisitos | RF-TX-01, RF-TX-07, RF-TX-08 |

### Flujo principal

1. El actor inicia una nueva transacción.
2. El sistema permite seleccionar un receptor válido.
3. El actor indica monto y descripción.
4. El actor selecciona la modalidad de pago.
5. El sistema valida la solicitud.
6. El sistema registra la transacción.
7. El sistema debita al pagador y acredita al receptor.
8. El sistema marca la transacción como completada.
9. El sistema genera la notificación de pago.
10. El sistema confirma el resultado.

### Excepciones

- E1. Receptor inexistente: no se crea la transacción.
- E2. Monto inválido: no se crea la transacción.
- E3. Error durante persistencia: no deben quedar efectos financieros parciales.

## CU-TX-02. Solicitar un pago

| Campo | Especificación |
| --- | --- |
| Actor principal | Usuario autenticado |
| Actor secundario | Usuario receptor |
| Precondiciones | El actor posee sesión válida y el receptor existe. |
| Disparador | El usuario inicia una nueva transacción y selecciona solicitud. |
| Postcondición de éxito | La solicitud queda pendiente y el receptor es notificado. Los saldos no cambian. |
| Postcondición de fallo | No se crea una solicitud parcial. |
| Requisitos | RF-TX-02, RF-TX-03, RF-TX-07 |

### Flujo principal

1. El solicitante inicia una nueva transacción.
2. El sistema permite seleccionar un receptor válido.
3. El solicitante indica monto y descripción.
4. El solicitante selecciona la modalidad de solicitud.
5. El sistema valida los datos.
6. El sistema registra la transacción como solicitud pendiente.
7. El sistema genera la notificación de solicitud.
8. El sistema confirma el registro.

### Regla crítica

La creación de la solicitud no modifica el saldo del solicitante ni del receptor.

## CU-TX-03. Resolver una solicitud de pago

| Campo | Especificación |
| --- | --- |
| Actor principal | Usuario receptor de la solicitud |
| Precondiciones | Existe una solicitud pendiente dirigida al actor y el actor posee sesión válida. |
| Disparador | El actor abre una solicitud pendiente y selecciona aceptar o rechazar. |
| Postcondición de aceptación | Se aplican los efectos financieros exactamente una vez y la solicitud alcanza estado final. |
| Postcondición de rechazo | La solicitud alcanza estado final sin modificar saldos. |
| Requisitos | RF-TX-04, RF-TX-05, RF-TX-06, RF-TX-08 |

### Flujo principal A — aceptar

1. El receptor abre una solicitud pendiente.
2. El sistema verifica que el actor puede resolverla.
3. El actor selecciona aceptar.
4. El sistema verifica que la solicitud continúa pendiente.
5. El sistema debita al receptor.
6. El sistema acredita al solicitante.
7. El sistema cambia la solicitud a estado final de aceptación/completado.
8. El sistema genera la notificación correspondiente.
9. El sistema confirma el resultado.

### Flujo alterno B — rechazar

1. El receptor abre una solicitud pendiente.
2. El sistema verifica que el actor puede resolverla.
3. El actor selecciona rechazar.
4. El sistema verifica que la solicitud continúa pendiente.
5. El sistema cambia la solicitud a estado final de rechazo.
6. El sistema confirma el resultado.

No se ejecutan débitos ni créditos en este flujo.

### Excepciones

- E1. Solicitud ya resuelta: se rechaza la operación sin modificar saldos ni generar efectos duplicados.
- E2. Actor no autorizado: se rechaza la operación.
- E3. Error durante la operación: no deben persistir efectos parciales.

## Trazabilidad inicial

| Caso de uso | Implementación principal | Pruebas heredadas relacionadas |
| --- | --- | --- |
| CU-TX-01 | `backend/database.ts` → `createTransaction` | `cypress/tests/ui/new-transaction.spec.ts`, `cypress/tests/api/api-transactions.spec.ts` |
| CU-TX-02 | `backend/database.ts` → `createTransaction` | `cypress/tests/ui/new-transaction.spec.ts`, `cypress/tests/api/api-transactions.spec.ts`, `cypress/tests/ui/notifications.spec.ts` |
| CU-TX-03 | `backend/database.ts` → `updateTransactionById` | `cypress/tests/ui/transaction-view.spec.ts`, `cypress/tests/api/api-transactions.spec.ts` |
